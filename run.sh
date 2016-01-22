set -eu

export WORKING_DIR='/tmp/snow'
mkdir -p $WORKING_DIR/scrape || true
mkdir -p $WORKING_DIR/events || true
mkdir -p $WORKING_DIR/plows || true

pushd "$(dirname $0)" > /dev/null

# scrape
# node index.js

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
git push origin master

# push to AWS
source $(dirname $0)/.aws_credentials
for f in $(dirname $0)/data/plows/*.geojson; do
    aws s3 cp $f s3://sbma44-dc/plows/$(basename $f)
done

# zipfile
zip all.zip $(dirname $0)/data/plows/*.geojson
aws s3 cp all.zip s3://sbma44-dc/plows/all.zip
rm all.zip

# build janky index
INDEX="<!doctype html><html><head></head><body><p><iframe width=\"420\" height=\"315\" src=\"https://www.youtube.com/embed/9yaJGFdhNkU\" frameborder=\"0\" allowfullscreen></iframe></p><p><em>last updated at $(date)</em></p><ul><li><strong><a href=\"https://s3.amazonaws.com/sbma44-dc/plows/all.zip\">all.zip</a></strong></li>"
for line in $(aws s3 ls s3://sbma44-dc/plows/ | awk '{print $4}' | grep geojson); do
    INDEX="$INDEX <li><a href=\"https://s3.amazonaws.com/sbma44-dc/plows/$line\">$line</li>"
done
INDEX="$INDEX </ul></body></html>"
echo $INDEX > index.html
aws s3 cp index.html s3://sbma44-dc/plows/index.html
rm index.html

popd > /dev/null