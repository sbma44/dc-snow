var path = require('path');
var fs = require('fs');
var md5 = require('md5');
var queue = require('queue-async');
var merge = require('geojson-merge');
var MapboxClient = require('mapbox');

if (!process.env.MapboxAccessToken)
    throw new Error('MapboxAccessToken environment variable not set');

var mapbox = new MapboxClient(process.env.MAPBOX_ACCESS_TOKEN);

function normalize(feat) {
    var feature = JSON.parse(JSON.stringify(feat));
    if ((!feature.properties.coordTimes) && (!feature.properties.times))
        throw new Error('Expected properties.coordTimes or properties.times');
    if ((feature.properties.times) && (!feature.properties.coordTimes)) {
        feature.properties.coordTimes = [];
        feature.properties.times.forEach(function(t) {
            feature.properties.coordTimes.push(new Date(t).toISOString())
        });
        delete feature.properties.times;
    }
    return feature;
}

module.exports = function(feature, callback) {
    feature = normalize(feature);

    var h = md5(JSON.stringify(feature));

    var filepath = path.normalize(__dirname + '/../data/matched/' + h + '.geojson');
    if (fs.existsSync(filepath)) {
        return fs.readFile(filepath, function(err, result) {
            callback(err, JSON.parse(result.toString()));
        });
    }
    else {
        var q = queue(1);
        var offset = 0;
        var results = [];
        while(offset < feature.geometry.coordinates.length) {
            var f = JSON.parse(JSON.stringify(feature));
            f.geometry.coordinates = feature.geometry.coordinates.slice(offset, offset + 100);
            f.properties.coordTimes = feature.properties.coordTimes.slice(offset, offset + 100);
            if (f.geometry.coordinates.length > 1) {
                q.defer(function(cb) {
                    mapbox.matching(f, { profile: 'mapbox.driving', geometry: 'geojson' }, function(err, result) {
                        // log failures, but don't let them spoil things
                        if (err) {
                            console.error('@@@', err);
                            cb();
                        }
                        else {
                            cb(null, result);
                        }
                    });
                });
            }
            offset += 100;
        }
        q.awaitAll(function(err, results) {
            if (err) return callback(err);

            var output = merge(results.filter(function(x) { return x !== null; }));

            fs.writeFile(filepath, JSON.stringify(output, null, 2), function(err) {
                callback(err, output);
            });
        });
    }
}