var util = require('util');
var fs = require('fs');
var path = require('path');
var cover = require('tile-cover');
var queue = require('queue-async');
var tracker = require('./lib/dc/avlTrackernew');
var logger = require('fastlog')('dc-snow');
var point = require('turf-point');
var distance = require('turf-distance');
var dc = JSON.parse(fs.readFileSync('data/dc.json'));

var limits = { min_zoom: 14, max_zoom: 14 };
var tiles = cover.geojson(dc.features[0].geometry, limits);

var WORKING_DIR = path.normalize(process.env.WORKING_DIR || process.argv[2] || '/mnt/persist/snow/');

function snowURL(date, ne, sw) {
    return 'http://snowmap.dc.gov/getData.aspx?starttime=' + date + '&endtime=' + date + '&ne_lat=' + ne[1] + '&ne_lng=' + ne[0] + '&sw_lat=' + sw[1] + '&sw_lng=' + sw[0];
}

function assemble(run, callback) {
    logger.debug('assembling scrape results from run %d', run);

    var q = queue();
    fs.readdirSync(path.normalize(WORKING_DIR + '/scrape/')).forEach(function(f) {
        if (parseInt(f.split('-')[0]) === run) {
            q.defer(function(cb) {
                fs.readFile(path.normalize(WORKING_DIR + '/scrape/' + f), function(err, data) {
                    cb(err, [f, JSON.parse(data)]);
                });
            });
        }
    });

    q.awaitAll(function(err, results) {
        if (err) throw err;

        results.forEach(function(result) {
            var f = result[0];
            var events = result[1];
            var plowData = {};
            events.forEach(function(e) {
                if (!plowData[e.name])
                    plowData[e.name] = [e];
                else
                    plowData[e.name].push(e);
            });

            // incorporate data into existing records, plow-by-plow
            Object.keys(plowData).forEach(function(plowName) {
                var data = {};

                if (fs.existsSync(path.normalize(WORKING_DIR + '/' + plowName + '-events.json'))) {
                    JSON.parse(fs.readFileSync(path.normalize(WORKING_DIR + '/' + plowName + '-events.json'))).forEach(function(dataItem) {
                        data[+new Date(dataItem.time)] = dataItem;
                    });
                }

                plowData[plowName].forEach(function(dataItem) {
                    data[+new Date(dataItem.time)] = dataItem;
                });

                var dateKeys = Object.keys(data);
                dateKeys.sort();
                var outData = [];
                dateKeys.forEach(function(dateKey) {
                    outData.push(data[dateKey]);
                });
                fs.writeFileSync(path.normalize(WORKING_DIR + '/' + plowName + '-events.json'), JSON.stringify(outData, null, 2));
            });

            fs.unlinkSync(path.normalize(WORKING_DIR + '/scrape/' + f));
        });

        callback();
    });
}

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

    fs.readdirSync(path.normalize(WORKING_DIR)).forEach(function(f, f_i) {
        if (! /-events\.json/.test(f))
            return;

        fs.readFile(path.normalize(WORKING_DIR + '/' + f), function(err, data) {
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

            logger.debug('- writing GeoJSON from %s', f);
            fs.writeFileSync(path.normalize(WORKING_DIR + '/' + obj.features[0].properties.name + '.geojson'), JSON.stringify(obj, null, 2));
        });
    });

    callback();
}

function scrape() {
    var q = queue(1);

    var run = +new Date();

    tiles.features.forEach(function(tile, i) {
        q.defer(function(cb) {
            var t = {
                ne: tile.geometry.coordinates[0][2],
                sw: tile.geometry.coordinates[0][0]
            };

            var d = new Date();
            var surl = snowURL(util.format('%d/%d/%d', d.getMonth()+1, d.getDate(), d.getFullYear()), t.ne, t.sw);
            tracker(surl, function(err, markers) {
                logger.debug('scraped %s, retrieved %d items', surl, markers.length);
                fs.writeFile(WORKING_DIR + '/scrape/' + run + '-' + i + '.json', JSON.stringify(markers, null, 2), cb);
            });
        });

        q.defer(function(cb) {
            setTimeout(cb, 1000);
        });
    });

    q.defer(assemble, run);

    q.defer(geojson);

    q.awaitAll(function(err, results) {
        if (err) throw err;
        logger.debug('waiting 180s...');
        setTimeout(scrape, 180000);
    });
}

if (require.main === module) {
    scrape();
}