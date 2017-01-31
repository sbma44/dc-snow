DC Snowplow Scraper
===================

Collects snowplow locations & assembles them into GeoJSON.

This project was written up in a bunch of places, but [DCist](http://dcist.com/2016/01/post_67.php) is the one I remember best since I used to write for them. Also [tweets](https://twitter.com/tjl/status/691091965241335808)!

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
