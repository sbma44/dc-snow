set -eu

source $(dirname $0)/.credentials

pushd "$(dirname $0)" > /dev/null

# snapped hour traces
node bin/hourTraces.js 24
for i in $(seq 1 8); do
    FILENAME="snapped-ago-$i.geojson"
    node_modules/mapbox-upload/bin/upload.js sbma44.dcsnow-$(basename $FILENAME .geojson) $FILENAME
    rm $FILENAME
done
node_modules/geojson-merge/geojson-merge snapped-ago-*.geojson > remainder.geojson
node_modules/mapbox-upload/bin/upload.js sbma44.dcsnow-9-2 remainder.geojson || true
rm remainder.geojson

for i in $(seq 1 8); do
    FILENAME="raw-ago-$i.geojson"
    node_modules/mapbox-upload/bin/upload.js sbma44.dcsnow-$(basename $FILENAME .geojson) $FILENAME
    rm $FILENAME
done
node_modules/geojson-merge/geojson-merge raw-ago-*.geojson > raw-remainder.geojson
node_modules/mapbox-upload/bin/upload.js sbma44.dcsnow-raw-remainder raw-remainder.geojson || true

rm -f *.geojson
