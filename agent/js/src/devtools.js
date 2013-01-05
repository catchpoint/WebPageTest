/******************************************************************************
Copyright (c) 2012, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of Google, Inc. nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/
/*jslint nomen:false */

var events = require('events');
var http = require('http');
var url = require('url');
var logger = require('logger');
exports.WebSocket = require('ws');  // Allow to stub out in tests.

exports.PREFIX_NETWORK = 'Network.';
exports.PREFIX_PAGE = 'Page.';
exports.PREFIX_TIMELINE = 'Timeline.';


function processResponse(response, callback) {
  'use strict';
  var responseBody = '';
  response.setEncoding('utf8');
  response.on('data', function(chunk) {
    responseBody += chunk;
  });
  response.on('end', function() {
    logger.extra('Got response: ' + responseBody);
    if (callback) {
      callback(responseBody);
    }
  });
  response.on('error', function() {
    throw new Error('Bad HTTP response: ' + JSON.stringify(response));
  });
}
exports.ProcessResponse = processResponse;

function DevTools(devToolsUrl) {
  'use strict';
  this.devToolsUrl_ = devToolsUrl;
  this.debuggerUrl_ = undefined;
  this.ws_ = undefined;
  this.commandId_ = 0;
  this.commandCallbacks_ = {};
  this.messageCallback_ = function() {};
}
exports.DevTools = DevTools;

DevTools.prototype.onMessage = function(callback) {
  'use strict';
  this.messageCallback_ = callback;
};

  DevTools.prototype.connect = function(callback, errback) {
  'use strict';
  http.get(url.parse(this.devToolsUrl_), function(response) {
    exports.ProcessResponse(response, function(responseBody) {
      var devToolsJson = JSON.parse(responseBody);
      try {
        this.debuggerUrl_ = devToolsJson[0].webSocketDebuggerUrl;
      } catch (e) {
        throw new Error('DevTools response at ' + this.devToolsUrl_ +
            ' does not contain webSocketDebuggerUrl: ' + responseBody);
      }
      this.connectDebugger_(callback, errback);
    }.bind(this));
  }.bind(this));
};

DevTools.prototype.connectDebugger_ = function(callback, errback) {
  'use strict';
  // TODO(klm): do we actually need origin?
  var ws = new exports.WebSocket(this.debuggerUrl_, {'origin': 'WebPageTest'});

  ws.on('error', function(e) {
    errback(e);
  });

  ws.on('open', function() {
    logger.extra('WebSocket connected: ' + JSON.stringify(ws));
    this.ws_ = ws;
    callback(this);
  }.bind(this));

  ws.on('message', function(data, flags) {
    // flags.binary will be set if a binary data is received
    // flags.masked will be set if the data was masked
    var callbackErrback;
    if (!flags.binary) {
      var message = JSON.parse(data);
      if (message.result && message.id) {
        callbackErrback = this.commandCallbacks_[message.id];
        if (callbackErrback) {
          delete this.commandCallbacks_[message.id];
          if (callbackErrback.callback) {
            callbackErrback.callback(message.result);
          }
        }
      } else if (message.error && message.id) {
        callbackErrback = this.commandCallbacks_[message.id];
        if (callbackErrback) {
          delete this.commandCallbacks_[message.id];
          if (callbackErrback.errback) {
            callbackErrback.errback(message.result);
          }
        }
      } else {
        this.messageCallback_(message);
      }
    } else {
      throw new Error('Unexpected binary WebSocket message');
    }
  }.bind(this));
};

DevTools.prototype.command = function(command, callback, errback) {
  'use strict';
  this.commandId_ += 1;
  command.id = this.commandId_;
  if (callback || errback) {
    this.commandCallbacks_[command.id] = {
        callback: callback,
        errback: errback
    };
  }
  this.ws_.send(JSON.stringify(command));
  return command.id;
};

DevTools.prototype.networkCommand = function(method, callback, errback) {
  'use strict';
  this.command({method: exports.PREFIX_NETWORK + method}, callback, errback);
};

DevTools.prototype.pageCommand = function(method, callback, errback) {
  'use strict';
  this.command({method: exports.PREFIX_PAGE + method}, callback, errback);
};

DevTools.prototype.timelineCommand = function(method, callback, errback) {
  'use strict';
  this.command({method: exports.PREFIX_TIMELINE + method}, callback, errback);
};

exports.isNetworkMessage = function(message) {
  'use strict';
  return (message.method &&
      message.method.slice(0, exports.PREFIX_NETWORK.length) ===
          exports.PREFIX_NETWORK);
};

exports.isPageMessage = function(message) {
  'use strict';
  return (message.method &&
      message.method.slice(0, exports.PREFIX_PAGE.length) ===
          exports.PREFIX_PAGE);
};

exports.isTimelineMessage = function(message) {
  'use strict';
  return (message.method &&
      message.method.slice(0, exports.PREFIX_TIMELINE.length) ===
          exports.PREFIX_TIMELINE);
};
