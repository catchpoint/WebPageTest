var ndir = require('../');

var walker = ndir.walk('./');
walker.on('dir', function(dirpath, files) {
  console.log(' * %s', dirpath);
  for (var i = 0, l = files.length; i < l; i++) {
    var info = files[i];
    if (info[1].isFile()) {
      console.log('   * %s', info[0]);
    }
  }
});
walker.on('error', function(err, errPath) {
  console.error('%s error: %s', errPath, err);
});
walker.on('end', function() {
  console.log('walk end.');
});