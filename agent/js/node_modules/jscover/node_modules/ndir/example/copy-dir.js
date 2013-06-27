/**
 * Module dependencies.
 */

var fs = require('fs');
var path = require('path');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var rl = require("readline").createInterface(process.stdin, process.stdout);
var ndir = require('../');


if (process.argv.length < 4) {
  console.log('Usage: node copy-dir.js <fromdir> <todir>');
  process.exit(1);
}

function CopyDir(fromdir, todir) {
  this.tasks = [];
  this.walkEnd = false;
  this.copyfileCount = 0;
};
util.inherits(CopyDir, EventEmitter);

CopyDir.prototype.start = function() {
  var self = this;
  self.emit('start');
  var walker = ndir.walk(fromdir);
  walker.on('dir', function(dirpath, files) {
    var doNext = self.tasks.length === 0;
    self.tasks.push([dirpath, true]);
    for (var i = 0, l = files.length; i < l; i++) {
      var info = files[i];
      self.tasks.push([info[0], info[1].isDirectory()]);
    }
    if (doNext) {
      process.nextTick(function() {
        self.next();
      });
    }
  });
  walker.on('end', function() {
    self.walkEnd = true;
  });
};

CopyDir.prototype.next = function() {
  var task = this.tasks.shift();
  if (!task) {
    if (this.walkEnd) {
      this.emit('end');
    }
    return;
  }
  var self = this;
  var f = task[0];
  var t = f.replace(fromdir, '');
  if (t[0] === '/') {
    t = t.substring(1);
  }
  t = path.join(todir, t);
  var isdir = task[1];
  if (isdir) {
    ndir.mkdir(t, function(err) {
      self.next();
    });
    return;
  }
  self.copyfile(f, t, function() {
    self.next();
  });
};


CopyDir.prototype._copyfile = function _copyfile(fromfile, tofile, callback) {
  var self = this;
  self.emit('startCopyfile', fromfile, tofile);
  ndir.copyfile(fromfile, tofile, function(err) {
    self.emit('endCopyfile', err, fromfile, tofile);
    if (!err) {
      self.copyfileCount++;
    }
    callback(err);
  });
}

CopyDir.prototype.copyfile = function copyfile(fromfile, tofile, callback) {
  var needCopy = true;
  var self = this;
  path.exists(tofile, function(exists) {
    if (exists) {
      self.emit('fileExists', tofile, function(confirm) {
        if (confirm) {
          return self._copyfile(fromfile, tofile, callback);
        }
        callback();
      })
      return;
    }
    self._copyfile(fromfile, tofile, callback);
  });
};

var fromdir = path.resolve(process.argv[2]);
var todir = path.resolve(process.argv[3]);

var copyworker = new CopyDir(fromdir, todir);
copyworker.on('start', function() {
  console.log('Start copy %s to %s', fromdir, todir);
});
copyworker.on('fileExists', function(tofile, confirmCallback) {
  rl.question('File "' + tofile + '" exists, overwrite? > ', function (answer) {
    confirmCallback(answer === 'yes' || answer === 'y');
  });
});
copyworker.on('startCopyfile', function(fromfile, tofile) {
  util.print(util.format('Copying "%s" to "%s" ... ', fromfile, tofile));
});
copyworker.on('endCopyfile', function(err, fromfile, tofile) {
  util.print((err ? 'Error!!!' : 'done.') + '\n');
});

function exit() {
  console.log('\nTotal copy %d files.', copyworker.copyfileCount);
  process.exit(0);
};
copyworker.on('end', exit);
rl.on('close', exit);

copyworker.start();
