var ndir = require('../');

ndir.walk('./', function onDir(dirpath, files) {
  console.log(' * %s', dirpath);
  for (var i = 0, l = files.length; i < l; i++) {
    var info = files[i];
    if (info[1].isFile()) {
      console.log('   * %s', info[0]);
    }
  }
}, function end() {
  console.log('walk end.');
}, function error(err, errPath) {
  console.error('%s error: %s', errPath, err);
});