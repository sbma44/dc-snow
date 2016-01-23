set -eu

source $(dirname $0)/.credentials

export TZ='America/New_York'
export WORKING_DIR='/tmp/snow'
mkdir -p $WORKING_DIR/scrape || true
mkdir -p $WORKING_DIR/events || true
mkdir -p $WORKING_DIR/plows || true

pushd "$(dirname $0)" > /dev/null

# copy events
aws s3 ls s3://sbma44-dc/events/ | awk '{print $4}' | parallel -j4 "aws s3 cp s3://sbma44-dc/events/{} $WORKING_DIR/events/{}"

# scrape
node index.js

# convert to geojson
node lib/geojson.js

cp $WORKING_DIR/plows/*.geojson ./data/plows

# remove empty files
ls -lh $(dirname $0)/data/plows/ | grep '   0B ' | awk '{print $9}' | parallel -j 4 "rm $(dirname $0)/data/plows/{}"

# push to github
for f in $(dirname $0)/data/plows/*.geojson; do
    git add "$f"
done
git commit -m "updated as of $(date)" || true
git push https://${GITHUB_TOKEN}:@github.com/sbma44/dc-snow.git master

# push to AWS
for f in $(dirname $0)/data/plows/*.geojson; do
    aws s3 cp $f s3://sbma44-dc/plows/$(basename $f)
done

# zipfile
zip all.zip $(dirname $0)/data/plows/*.geojson
aws s3 cp all.zip s3://sbma44-dc/plows/all.zip
rm all.zip

# stats
node bin/analyze.js csv > stats.csv
aws s3 cp stats.csv s3://sbma44-dc/plows/stats.csv
rm stats.csv

# build janky index
aws s3 ls s3://sbma44-dc/plows/ | awk '{print $4}' | grep geojson > files.txt
node bin/html.js "https://s3.amazonaws.com/sbma44-dc/plows/" "$(pwd)/files.txt" > index.html
aws s3 cp index.html s3://sbma44-dc/plows/index.html
rm index.html
rm files.txt

# copy events
for f in $WORKING_DIR/events/*.json; do
    aws s3 cp $f s3://sbma44-dc/events/$(basename $f)
done

popd > /dev/null
