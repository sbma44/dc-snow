var fs = require('fs');
var distance = require('turf-distance');
var path = require('path');
var logger = require('fastlog')('dc-snow');
var point = require('turf-point');
var distance = require('turf-distance');

var WORKING_DIR = path.normalize(process.env.WORKING_DIR || process.argv[2] || '/mnt/persist/snow/');

module.exports = geojson;

function geojson(callback) {
    function emptyFeature(name, contractor) {
        return {
                    type: 'Feature',
                    properties: {
                        name: name,
                        contractor: contractor,
                        times: [],
                        saltSegments: [],
                        plowSegments: []
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                };
    }

    fs.readdirSync(path.normalize(WORKING_DIR + '/events/')).forEach(function(f, f_i) {
        if (! /-events\.json/.test(f))
            return;

        fs.readFile(path.normalize(WORKING_DIR + '/events/' + f), function(err, data) {
            if (err) throw err;
            var events = JSON.parse(data);
            var obj = {
                type: 'FeatureCollection',
                features: [
                    emptyFeature(events[0].name, events[0].contractor)
                ]
            };
            var lastPlow = lastSalt = [];
            var featureOffset = 0;
            events.forEach(function(e, i) {
                if ((i > 0) && (distance(point([parseFloat(e.lon), parseFloat(e.lat)]), point(obj.features[0].geometry.coordinates[obj.features[0].geometry.coordinates.length - 1]), 'kilometers') > 0.5)) {
                    if (lastPlow.length > 0) {
                        lastPlow.push(i - featureOffset);
                        obj.features[0].properties.plowSegments.push(lastPlow);
                        lastPlow = [];
                    }
                    if (lastSalt.length > 0) {
                        lastSalt.push(i - featureOffset);
                        obj.features[0].properties.saltSegments.push(lastSalt);
                        lastSalt = [];
                    }
                    obj.features.unshift(emptyFeature(e.name, e.contractor));
                    featureOffset = i;
                }

                obj.features[0].geometry.coordinates.push([parseFloat(e.lon), parseFloat(e.lat)]);
                obj.features[0].properties.times.push((new Date(e.time)).toISOString());
                if (e.plow) {
                    if (lastPlow.length === 0)
                        lastPlow = [i - featureOffset];
                }
                else {
                    if (lastPlow.length === 1) {
                        lastPlow.push(i - featureOffset);
                        obj.features[0].properties.plowSegments.push(lastPlow);
                        lastPlow = [];
                    }
                }
                if (e.salt) {
                    if (lastSalt.length === 0)
                        lastSalt = [i - featureOffset];
                }
                else {
                    if (lastSalt.length === 1) {
                        lastSalt.push(i - featureOffset);
                        obj.features[0].properties.saltSegments.push(lastSalt);
                        lastSalt = [];
                    }
                }
            });

            // ensure at least 2 points per linestring
            obj.features = obj.features.filter(function(feat) {
                return feat.geometry.coordinates.length > 1;
            });

            if (obj.features.length > 0) {
                logger.debug('- writing GeoJSON from %s', f);
                fs.writeFileSync(path.normalize(WORKING_DIR + '/plows/' + obj.features[0].properties.name + '.geojson'), JSON.stringify(obj, null, 2));
            }
        });
    });

    callback();
}

if (require.main === module) {
    geojson(function() { logger.debug('done creating GeoJSON'); });
}