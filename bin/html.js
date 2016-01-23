var fs = require('fs');
var path = require('path');

var html = fs.readFileSync(path.normalize(__dirname + '/../data/html/header.html')).toString().replace('{{DATE}}',(new Date()).toString());

files = fs.readFileSync(path.normalize(process.argv[3])).toString().split('\n');
files.forEach(function(f) {
    if (f.trim().length > 0)
        html += '<li><a href="' + process.argv[2] + f + '">' + f + '</a></li>';
});

html += fs.readFileSync(path.normalize(__dirname + '/../data/html/footer.html'));

console.log(html);
