DC Snowplow Scraper
===================

Collects snowplow locations & assembles them into GeoJSON.

Setup
=====
```
npm install
export WORKING_DIR='/tmp/snow'
mkdir -p $WORKING_DIR/scrape
```

set AWS & Github credentials in `.credentials`

Use
===
```
while [ 1 ]; do
  ./run.sh
  sleep 300
done
```
