var fs = require('fs');
var path = require('path');

var html = fs.readFileSync(path.normalize(__dirname + '/../data/html/header.html'));
html +=  "<p><em>last updated at " + (new Date()).toString() + "</em></p><ul><li><strong><a href=\"https://s3.amazonaws.com/sbma44-dc/plows/all.zip\">all.zip</a></strong></li>";

files = fs.readFileSync(path.normalize(process.argv[3])).toString().split('\n');
files.forEach(function(f) {
    if (f.trim().length > 0)
        html += '<li><a href="' + process.argv[2] + f + '">' + f + '</a></li>';
});

html += fs.readFileSync(path.normalize(__dirname + '/../data/html/footer.html'));

console.log(html);