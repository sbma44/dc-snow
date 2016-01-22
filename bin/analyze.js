var fs = require('fs');
var util = require('util');
var path = require('path');
var linedist = require('turf-line-distance');
var slice = require('../lib/sliceTrace');

function stats(offset, span) {
    var sum = plow = salt = 0;
    var end = (+(new Date()) - (offset * 3600 * 1000));
    var start = new Date((+end) - (span * 3600 * 1000));
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
    console.log('=== all data ===');
    display(stats(0, 1000 * 365 * 24));

    console.log();
    console.log('=== last 24 hrs ===')
    display(stats(0, 24));

    console.log();
    console.log('=== last 12 hrs ===')
    display(stats(0, 12));

    console.log();
    console.log('=== last 6 hrs ===')
    display(stats(0, 6));

    console.log();
    console.log('=== last 3 hrs ===')
    display(stats(0, 3));
}