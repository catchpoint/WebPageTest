var fs = require('fs');
var vm = require('vm');
var loadVendor = function(js) {
    vm.runInThisContext(fs.readFileSync(__dirname+'/../vendor/'+js), js);
}.bind(this);

loadVendor('jszip/jszip.js');
loadVendor('jszip/jszip-deflate.js');
loadVendor('jszip/jszip-inflate.js');
loadVendor('jszip/jszip-load.js');

module.exports = function(data, options) { return new JSZip(data, options) };
