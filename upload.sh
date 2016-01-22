set -ex

pushd "$(dirname $0)"
for f in $(dirname $0)/data/plows/*.geojson; do
    git add "$f"
done
git commit -m "updated as of $(date)"
git push origin master
popd