var fs = require('fs');
var util = require('util');
var path = require('path');
var linedist = require('turf-line-distance');
var slice = require('../lib/sliceTrace');

function stats(start, end) {
    var sum = plow = salt = 0;
    fs.readdirSync(path.normalize(__dirname + '/../data/plows/')).forEach(function(f) {
        var fc = JSON.parse(fs.readFileSync(path.normalize(__dirname + '/../data/plows/' + f)));
        fc.features.forEach(function(feat) {
            sum += linedist(slice.byTime(feat, start, end), 'miles');
            salt += linedist(slice.byTime(slice.byType(feat, false, true), start, end), 'miles');
            plow += linedist(slice.byTime(slice.byType(feat, true, false), start, end), 'miles');
        });
    });
    return {
        total: sum,
        plow: plow,
        salt: salt
    };
}

function display(result) {
    console.log(util.format('%d miles total', result.total.toFixed(2)));
    console.log(util.format('%d miles plowed', result.plow.toFixed(2)));
    console.log(util.format('%d miles salted', result.salt.toFixed(2)));
}

if (require.main === module) {
    if (process.argv[2] === 'csv') {
        var scrapeStart = new Date('Fri Jan 22 2016 00:00:00 GMT-0500 (EST)');
        var i = 0;
        var data = [['hours ago', 'plow', 'salt', 'other/unknown']];

        var now = +new Date();

        // record fractional current hour
        var hourStart = now - (now % (24 * 3600 * 1000));
        var s = stats(new Date(hourStart), new Date(now));
        data.push([(new Date(now).getHours()), s.plow, s.salt, s.total - (s.plow + s.salt)]);

        while(new Date(hourStart) > scrapeStart) {
            var s = stats(new Date(hourStart - (3600 * 1000)), new Date(hourStart));
            data.push([(new Date(hourStart - (1800 * 1000)).getHours()), s.plow, s.salt, s.total - (s.plow + s.salt)]);
            hourStart = hourStart - (3600 * 1000);
        }
        data.forEach(function(line) {
            console.log(line.join(','));
        })
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