var util = require('util');
var fs = require('fs');
var path = require('path');
var cover = require('tile-cover');
var queue = require('queue-async');
var tracker = require('./lib/dc/avlTrackernew');
var assemble = require('./lib/assemble');
var geojson = require('./lib/geojson');
var logger = require('fastlog')('dc-snow');
var point = require('turf-point');
var distance = require('turf-distance');
var dc = JSON.parse(fs.readFileSync('data/dc.geojson'));


var limits = { min_zoom: 14, max_zoom: 14 };
var tiles = cover.geojson(dc.features[0].geometry, limits);

var WORKING_DIR = path.normalize(process.env.WORKING_DIR || process.argv[2] || '/mnt/persist/snow/');

function snowURL(date, ne, sw) {
    return 'http://snowmap.dc.gov/getData.aspx?starttime=' + date + '&endtime=' + date + '&ne_lat=' + ne[1] + '&ne_lng=' + ne[0] + '&sw_lat=' + sw[1] + '&sw_lng=' + sw[0];
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
        logger.debug('Done scraping.')
    });
}

if (require.main === module) {
    scrape();
}