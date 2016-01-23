var fs = require('fs');
var util = require('util');
var path = require('path');
var linedist = require('turf-line-distance');
var slice = require('../lib/sliceTrace');

function stats(start, end) {
    var sum = plow = salt = numPlows = 0;
    fs.readdirSync(path.normalize(__dirname + '/../data/plows/')).forEach(function(f) {
        var fc = JSON.parse(fs.readFileSync(path.normalize(__dirname + '/../data/plows/' + f)));
        fc.features.forEach(function(feat) {
            sum += linedist(slice.byTime(feat, start, end), 'miles');
            salt += linedist(slice.byTime(slice.byType(feat, false, true), start, end), 'miles');
            plow += linedist(slice.byTime(slice.byType(feat, true, false), start, end), 'miles');
        });

        var plowActive = fc.features.some(function(feat) {
            return feat.properties.times.some(function(t) { var d = new Date(t); return ((d >= start) && (d < end)); });
        });
        if (plowActive)
            numPlows += 1;
    });
    return {
        total: sum,
        plow: plow,
        salt: salt,
        numPlows: numPlows
    };
}

function display(result) {
    console.log(util.format('%d miles total', result.total.toFixed(2)));
    console.log(util.format('%d miles plowed', result.plow.toFixed(2)));
    console.log(util.format('%d miles salted', result.salt.toFixed(2)));
}

function formatDate(d) {
    var x = '';
    switch (d.getDay()) {
        case 0:
            x += 'Sun';
            break;
        case 1:
            x += 'Mon';
            break
        case 2:
            x += 'Tue';
            break;
        case 3:
            x += 'Wed';
            break;
        case 4:
            x += 'Thu';
            break;
        case 5:
            x += 'Fri';
            break;
        case 6:
            x += 'Sat';
            break;
    }
    x += ' ' + ((d.getHours() % 12) === 0 ? '12' : (d.getHours() % 12).toString());
    x += (d.getHours() >= 12) ? 'p' : 'a';
    return x;
}

if (require.main === module) {
    if (process.argv[2] === 'csv') {
        var scrapeStart = new Date('Fri Jan 22 2016 00:00:00 GMT-0500 (EST)');
        var i = 0;
        var data = [['hours ago', 'plow', 'salt', 'other/unknown']];
        var plowData = [['hours ago', 'numPlows']];
        var now = +new Date();

        // record fractional current hour
        var hourStart = now - (now % (3600 * 1000));
        var s = stats(new Date(hourStart), new Date(now));
        data.push([formatDate(new Date(now)), s.plow, s.salt, s.total - (s.plow + s.salt)]);
        plowData.push([formatDate(new Date(now)), s.numPlows])

        while(new Date(hourStart) > scrapeStart) {
            var end = new Date(hourStart);
            var start = new Date(+end - (3600 * 1000));
            var btwn = new Date(((+end) + (+start)) / 2);
            var s = stats(start, end);
            data.push([formatDate(btwn), s.plow, s.salt, s.total - (s.plow + s.salt)]);
            plowData.push([formatDate(btwn), s.numPlows]);

            hourStart = hourStart - (3600 * 1000);
        }

        fs.writeFileSync('stats.csv', data.map(function(x) { return x.join(','); }).join('\n'));
        fs.writeFileSync('plowStats.csv', plowData.map(function(x) { return x.join(','); }).join('\n'));
    }
    else {
        var end = new Date();

        console.log('=== all data ===');
        display(stats(new Date('1/1/1970'), end));

        [24, 12, 6, 3].forEach(function(h) {
            console.log();
            console.log('=== last ' + h + ' hrs ===')
            display(stats(new Date((+end) - (h * 3600 * 1000)), end));
        });
    }
}