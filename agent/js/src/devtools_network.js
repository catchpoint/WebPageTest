var devtools = require('devtools');
var events = require('events');
var util = require('util');

var METHOD_PREFIX_ = 'Network.';

/**
 * Network tracking DevTools API.
 *
 * @param devTools An instance of devtools.DevTools.
 */
function Network(devTools) {
  'use strict';
  var self = this;
  this.devTools_ = devTools;

  devTools.on('message', this.notification_);
}
util.inherits(Network, events.EventEmitter);
exports.Network = Network;

Network.prototype.disable = function(callback) {
  'use strict';
  return this.devTools_.command({
    method: 'Network.disable'
  }, callback);
};

Network.prototype.enable = function(callback) {
  'use strict';
  return this.devTools_.command({
    method: 'Network.enable'
  }, callback);
};

Network.prototype.notification_ = function(message) {
  'use strict';
  if (message.method.slice(0, METHOD_PREFIX_.length) === METHOD_PREFIX_) {
    var id = message.params.requestId;
    this.emit('network_message', id, message);
    //console.log('%s, id: %s', message.method, id);
  } else {
    //console.log('%s', message.method);
  }
};

function main() {
  'use strict';
  var dt = new devtools.DevTools('http://localhost:1234/json');
  var net = new Network(dt);

  dt.on('connect', function() {
    net.enable();
  });

  dt.connect();
}

if (require.main === module) {
  console.log('main for network');
  main();
}
