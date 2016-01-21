var fs = require('fs');
var cover = require('tile-cover');
var queue = require('queue-async');
var tracker = require('./lib/dc/avlTrackernew');
var dc = JSON.parse(fs.readFileSync('data/dc.json'));

var limits = { min_zoom: 14, max_zoom: 14 };
var tiles = cover.geojson(dc.features[0].geometry, limits);

function snowURL(date, ne, sw) {
    return 'http://snowmap.dc.gov/getData.aspx?starttime=' + date + '&endtime=' + date + '&ne_lat=' + ne[1] + '&ne_lng=' + ne[0] + '&sw_lat=' + sw[1] + '&sw_lng=' + sw[0];
}

function walk() {
    var q = queue(1);

    var run = +new Date();

    tiles.features.forEach(function(tile, i) {
        q.defer(function(cb) {
            var t = {
                ne: tile.geometry.coordinates[0][2],
                sw: tile.geometry.coordinates[0][0]
            };
            tracker(snowURL('1/20/2016', t.ne, t.sw), function(err, markers) {
                fs.writeFile('/mnt/persist/snow/' + run + '-' + i + '.json', JSON.stringify(markers, null, 2), cb);
            });
        });
        q.defer(function(cb) {
            setTimeout(cb, 1000);
        });
    });

    q.awaitAll(function() {
        setTimeout(walk, 60000);
    });
}

if (require.main === module) {
    walk();
}