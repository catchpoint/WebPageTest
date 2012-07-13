/*jslint nomen:false */

var events = require('events');
var http = require('http');
var url = require('url');
var util = require('util');
var WebSocket = require('ws');


function processResponse(response, callback) {
  'use strict';
  var responseBody = '';
  response.setEncoding('utf8');
  response.on('data', function (chunk) {
    responseBody += chunk;
  });
  response.on('end', function () {
    console.log('Got response: ' + responseBody);
    if (callback) {
      callback(responseBody);
    }
  });
  response.on('error', function() {
    throw new Error('Bad HTTP response: ' + JSON.stringify(response));
  });
}


function DevTools(devToolsUrl) {
  'use strict';
  this.devToolsUrl_ = devToolsUrl;
  this.debuggerUrl_ = undefined;
  this.ws_ = undefined;
  this.commandId_ = 0;
  this.commandCallbacks_ = {};
}
util.inherits(DevTools, events.EventEmitter);
exports.DevTools = DevTools;

DevTools.prototype.connect = function() {
  'use strict';
  var self = this;  // For closure
  http.get(url.parse(self.devToolsUrl_), function(response) {
    processResponse(response, function(responseBody) {
      var devToolsJson = JSON.parse(responseBody);
      try {
        self.debuggerUrl_ = devToolsJson[0].webSocketDebuggerUrl;
      } catch (e) {
        throw new Error('DevTools response at ' + self.devToolsUrl_ +
            ' does not contain webSocketDebuggerUrl: ' +
            JSON.stringify(devToolsJson));
      }
      self.connectDebugger_();
    });
  });
};

DevTools.prototype.connectDebugger_ = function() {
  'use strict';
  var self = this;  // For closure
  // TODO(klm): do we actually need origin?
  var ws = new WebSocket(this.debuggerUrl_, {'origin': 'WebPageTest'});

  ws.on('error', function(e) {
    throw e;
  });

  ws.on('open', function() {
    // console.log('WebSocket connected: %s', JSON.stringify(ws));
    self.ws_ = ws;
    self.emit('connect');
  });

  ws.on('message', function(data, flags) {
    // flags.binary will be set if a binary data is received
    // flags.masked will be set if the data was masked
    // console.log('message: %s binary=%s', data, flags.binary);
    if (!flags.binary) {
      var messageJson = JSON.parse(data);
      if ('result' in messageJson && 'id' in messageJson) {
        var commandCallback = self.commandCallbacks_[messageJson.id];
        if (commandCallback) {
          delete self.commandCallbacks_[messageJson.id];
          commandCallback(messageJson.result);
        }
        self.emit('result', messageJson.id, messageJson.result);
      } else {
        self.emit('message', messageJson);
      }
    } else {
      throw new Error('Unexpected binary WebSocket message');
    }
  });
};

DevTools.prototype.command = function(command, callback) {
  'use strict';
  this.commandId_ += 1;
  command.id = this.commandId_;
  if (callback) {
    this.commandCallbacks_[command.id] = callback;
  }
  this.ws_.send(JSON.stringify(command));
  return command.id;
};
