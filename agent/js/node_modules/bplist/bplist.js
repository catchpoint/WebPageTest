var bplistParser  = require('bplist-parser');
var bplistCreator = require('node-bplist-creator');

// Expose bplist parser
exports.maxObjectSize = bplistParser.maxObjectSize;
exports.parseFile     = bplistParser.parseFile;

var parseBuf = function(buf, callback) {
  try {
   var result = bplistParser.parseBuffer(buf);
   return callback(null, result);
  }
  catch (err) {
    return callback(err, null);
  }
}


exports.parseBuffer = parseBuf;


// Expose bplist creator
exports.create = bplistCreator;
