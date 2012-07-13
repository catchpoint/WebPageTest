var events = require('events');
var util = require('util');

var module_ = {};

module_.fakeResponseData = [];
module_.requests = [];

module_.request = function(options, response_cb) {
  'use strict';
  return new module_.Request(options, response_cb);
};

module_.get = function(options, response_cb) {
  'use strict';
  var request = module_.request(options, response_cb);
  request.end('', undefined);
};

module_.Request = function(options, response_cb) {
  'use strict';
  module_.requests.push(this);
  this.options = options;
  this.encoding = undefined;
  this.data = '';
  this.response = new module_.Response();
  response_cb(this.response);
};

util.inherits(module_.Request, events.EventEmitter);

module_.Request.prototype.end = function(body, encoding) {
  'use strict';
  this.encoding = encoding;
  this.data = body;
  var responseBody = module_.fakeResponseData.shift();
  var reqLogStr = '';
  if (this.options.method) {
    reqLogStr += this.options.method;
  }
  if (reqLogStr) {
    reqLogStr += ' ';
  }
  if (this.options.href) {
    reqLogStr += this.options.href;
  } else {
    reqLogStr += '...' + this.options.path;
  }
  if (body) {
    console.log('HTTP %s:\n%s\n===RESPONSE:\n%s\n',
        reqLogStr, body, responseBody);
  } else {
    console.log('HTTP %s, RESPONSE:\n%s\n',
        reqLogStr, responseBody);
  }
  this.response.emit('data', responseBody);
  this.response.emit('end');
};

module_.Response = function() {
  'use strict';
  this.encoding = undefined;
};

util.inherits(module_.Response, events.EventEmitter);

module_.Response.prototype.setEncoding = function(encoding) {
  'use strict';
  this.encoding = encoding;
};

registerFakeNodeModule('http', module_);
