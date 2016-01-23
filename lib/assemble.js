var fs = require('fs');
var path = require('path');
var logger = require('fastlog')('dc-snow');
var queue = require('queue-async');

var WORKING_DIR = path.normalize(process.env.WORKING_DIR || process.argv[2] || '/mnt/persist/snow/');

module.exports = assemble;

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

                if (fs.existsSync(path.normalize(WORKING_DIR + '/events/' + plowName + '-events.json'))) {
                    JSON.parse(fs.readFileSync(path.normalize(WORKING_DIR + '/events/' + plowName + '-events.json'))).forEach(function(dataItem) {
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
                fs.writeFileSync(path.normalize(WORKING_DIR + '/events/' + plowName + '-events.json'), JSON.stringify(outData, null, 2));
            });

            fs.unlinkSync(path.normalize(WORKING_DIR + '/scrape/' + f));
        });

        callback();
    });
}