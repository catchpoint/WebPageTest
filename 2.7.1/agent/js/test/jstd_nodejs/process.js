var events = require('events');
var util = require('util');

function Process_() {
  'use strict';
  this.platform = 'browser';
  this.env = {};
}
util.inherits(Process_, events.EventEmitter);

Process_.prototype.cwd = function() {
  'use strict';
  return '/fake/cwd';
};

// Predefined global in Node.js
var process = new Process_();
