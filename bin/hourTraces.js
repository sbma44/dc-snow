var fs = require('fs');
var path = require('path');
var queue = require('queue-async');
var merge = require('geojson-merge');
var slice = require('../lib/sliceTrace');
var match = require('../lib/match');

function calculate(hourOffset, callback) {
    var q = queue(4);
    var now = +(new Date());
    var start, end;
    if (hourOffset === 0) {
        start = new Date(now - (now % 3600000));
        end = new Date(now);
    }
    else {
        end = new Date(now - ((now % 3600000) + (hourOffset * 3600000)));
        start = new Date(+end - 3600000);
    }
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
        if (merged.features.length > 0) {
            fs.writeFileSync(start.toISOString().split(':')[0] + 'Z.geojson', JSON.stringify(merged));
            fs.writeFileSync('raw-ago-' + hourOffset + '.geojson', JSON.stringify(merged));
        }

        var snapped = merge(results);
        if (snapped.features.length > 0) {
            fs.writeFileSync('snapped-' + start.toISOString().split(':')[0] + 'Z.geojson', JSON.stringify(snapped));
            fs.writeFileSync('snapped-ago-' + hourOffset + '.geojson', JSON.stringify(snapped));
        }

        callback();
    });
}

if (require.main === module) {
    calculate(parseInt(process.argv[2]), function() {});
}
