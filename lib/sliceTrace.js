module.exports = {
    byTime: byTime,
    byType: byType
};

function byTime(feature, start, end) {
    var newFeature = JSON.parse(JSON.stringify(feature));
    delete newFeature.properties.saltSegments;
    delete newFeature.properties.plowSegments;
    newFeature.properties.times = [];
    newFeature.geometry.coordinates = [];
    feature.properties.times.forEach(function(t, i) {
        var d = new Date(t);
        if ((d >= start) && (d < end)) {
            newFeature.properties.times.push(t);
            newFeature.geometry.coordinates.push(feature.geometry.coordinates[i]);
        }
    });
    return newFeature;
}

function byType(feature, plow, salt) {
    var times = {};

    if (plow) {
        feature.properties.plowSegments.forEach(function(segment) {
            feature.properties.times.slice(segment[0], segment[1]).forEach(function(t, i) {
                times[t] = feature.geometry.coordinates[i];
            });
        });
    }

    if (salt) {
        feature.properties.saltSegments.forEach(function(segment) {
            feature.properties.times.slice(segment[0], segment[1]).forEach(function(t, i) {
                times[t] = feature.geometry.coordinates[i];
            });
        });
    }

    var newFeature = JSON.parse(JSON.stringify(feature));
    delete newFeature.properties.saltSegments;
    delete newFeature.properties.plowSegments;
    newFeature.properties.times = [];
    newFeature.geometry.coordinates = [];

    Object.keys(times).forEach(function(t) {
        newFeature.properties.times.push(t);
        newFeature.geometry.coordinates.push(times[t]);
    });

    return newFeature;
}