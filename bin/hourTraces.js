var fs = require('fs');
var path = require('path');
var queue = require('queue-async');
var merge = require('geojson-merge');
var slice = require('../lib/sliceTrace');
var match = require('../lib/match');

function calculate(hourOffset, callback) {
    var q = queue(4);
    var now = new Date();
    var end = new Date((+now) - ((+now) % 3600000));
    var start = new Date((+end) - (hourOffset * 3600 * 1000));
    var toMerge = toMergeSnapped = [];
    fs.readdirSync(path.normalize(__dirname + '/../data/plows/')).forEach(function(f) {
        var fc = JSON.parse(fs.readFileSync(path.normalize(__dirname + '/../data/plows/' + f)));
        fc.features.forEach(function(feat) {
            var result = slice.byTime(feat, start, end);
            if (result.geometry.coordinates.length > 1) {
                toMerge.push(result);
                q.defer(match, result);
            }
        });
    });

    q.awaitAll(function(err, results) {
        console.log('- writing results for ' + start.toISOString().split(':')[0] + 'Z');
        var merged = merge(toMerge);
        if (merged.features.length > 0)
            fs.writeFileSync(start.toISOString().split(':')[0] + 'Z.geojson', JSON.stringify(merged));

        var snapped = merge(results);
        if (snapped.features.length > 0) {
            fs.writeFileSync('snapped-' + start.toISOString().split(':')[0] + 'Z.geojson', JSON.stringify(snapped));
            fs.writeFileSync('snapped-ago-' + hourOffset + '.geojson', JSON.stringify(snapped));
        }

        callback();
    });
}

if (require.main === module) {
    var q = queue(1);
    for(var h=0; h<12; h++) {
        q.defer(calculate, h);
    }
    q.awaitAll(function(err, results) {
        console.log('Done.');
    });
}