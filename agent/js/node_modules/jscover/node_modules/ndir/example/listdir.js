/**
 * Module dependencies.
 */

var ndir = require('../');
var path = require('path');

var root = process.argv[2] || '.';
var parentDir = null;
var dirLevels = {};
ndir.walk(root, function onDir(dirpath, files) {
  var level = dirLevels[dirpath] || 0;
  var padding = '';
  if (level === 0) {
    console.log('├─┬ %s', dirpath);
  } else {
    padding = new Array(level).join('  ');
    if (files.length > 0) {
      console.log('│ %s└─┬ %s', padding, dirpath);
    } else {
      console.log('│ %s├── %s', padding, dirpath);
    }
  }
  
  level++;
  for (var i = 0, l = files.length, last = l - 1; i < l; i++) {
    var info = files[i];
    var p = info[0];
    var stats = info[1];
    if (stats.isDirectory()) {
      dirLevels[p] = level + 1;
    } else {
      if (i === last) {
        console.log('│ %s└── %s', new Array(level).join('  '), p);
      } else {
        console.log('│ %s├── %s', new Array(level).join('  '), p);
      }
    }
    
  }
}, function end() {
  console.log('walk end.');
}, function onError(err, errPath) {
  console.error('%s error %s', errPath, err);
});
