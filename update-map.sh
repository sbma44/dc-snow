set -eu

source $(dirname $0)/.credentials

CPUNUM="$(node -e 'console.log(require("os").cpus().length - 1);')"

pushd "$(dirname $0)" > /dev/null

# snapped hour traces
HOURS_AGO="$(node -e "console.log(Math.round((new Date() - (new Date('Sat Jan 23 2016 23:55:00 GMT-0500 (EST)'))) / 3600000));")"
echo "processing $HOURS_AGO hours..."
parallel -j $CPUNUM "node bin/hourTraces.js {}" ::: $(seq 0 $HOURS_AGO)

for i in $(seq 1 8); do
    FILENAME="snapped-ago-$i.geojson"
    echo "=== uploading $FILENAME"
    node_modules/mapbox-upload/bin/upload.js sbma44.dcsnow-$(basename $FILENAME .geojson) $FILENAME || true
    rm $FILENAME
done
node_modules/geojson-merge/geojson-merge snapped-ago-*.geojson > remainder.geojson
node_modules/mapbox-upload/bin/upload.js sbma44.dcsnow-9-2 remainder.geojson || true
rm remainder.geojson

for i in $(seq 1 8); do
    FILENAME="raw-ago-$i.geojson"
    echo "=== uploading $FILENAME"
    node_modules/mapbox-upload/bin/upload.js sbma44.dcsnow-$(basename $FILENAME .geojson) $FILENAME || true
    rm $FILENAME
done
node_modules/geojson-merge/geojson-merge raw-ago-*.geojson > raw-remainder.geojson
node_modules/mapbox-upload/bin/upload.js sbma44.dcsnow-raw-remainder raw-remainder.geojson || true

rm -f *.geojson

echo "run complete at $(date)"
