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

/**
 * WebKit Remote Debugger Protocol connection to a WebKit based browser.
 *
 * @param {string} devToolsUrl WKRDP endpoint.
 * @constructor
 */
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

/**
 * Establishes connection to the WKRDP endpoint, first tab.
 *
 * @param {Function} [callback] invoked on success.
 * @param {Function} [errback] invoked on failure with an Error object.
 */
DevTools.prototype.connect = function(callback, errback) {
  'use strict';
  var retries = 0;  // ios_webkit_debug_proxy sometimes returns an empty array.
  var listTabs = function() {
    var request = http.get(url.parse(this.devToolsUrl_), function(response) {
      exports.ProcessResponse(response, function(responseBody) {
        var devToolsJson = JSON.parse(responseBody);
        if (devToolsJson.length === 0 && retries < 10) {
          retries += 1;
          logger.debug('Retrying DevTools tab list, attempt %d', retries + 1);
          global.setTimeout(listTabs, 1000);
          return;
        }
        this.debuggerUrl_ = devToolsJson[0].webSocketDebuggerUrl;
        if (!this.debuggerUrl_) {
          throw new Error('DevTools response at ' + this.devToolsUrl_ +
              ' does not contain webSocketDebuggerUrl: ' + responseBody);
        }
        this.connectDebugger_(callback, errback);
      }.bind(this));
    }.bind(this));
    request.on('error', function(e) {
      errback(e);
    });
  }.bind(this);
  listTabs();
};

DevTools.prototype.connectDebugger_ = function(callback, errback) {
  'use strict';
  // TODO(klm): do we actually need origin?
  var ws = new exports.WebSocket(this.debuggerUrl_, {'origin': 'WebPageTest'});

  ws.on('error', function(e) {
    if (errback) {
      errback(e);
    } else {
      logger.error('Ignoring unhaldled WKRDP connection failure: %s', e);
    }
  });

  ws.on('open', function() {
    logger.extra('WebSocket connected: ' + JSON.stringify(ws));
    this.ws_ = ws;
    if (callback) {
      callback();
    }
  }.bind(this));

  ws.on('message', this.onMessage_.bind(this));
};

DevTools.prototype.onMessage_ = function(data, flags) {
  'use strict';
  // flags.binary will be set if a binary data is received
  // flags.masked will be set if the data was masked
  var callbackErrback;
  if (!flags.binary) {
    var message;
    try {
      message = JSON.parse(data);
    } catch(e) {
      logger.error('JSON parse error on DevTools data: %s', data);
      return;
    }
    if (message.id) {
      logger.debug('Command response id: %s', message.id);
      callbackErrback = this.commandCallbacks_[message.id];
      if (callbackErrback) {
        delete this.commandCallbacks_[message.id];
        if (message.error) {
          if (callbackErrback.errback) {
            callbackErrback.errback(new Error(message.error.message));
          } else {
            logger.error('Ingoring unhandled WKRDP error for command %s: %s',
                callbackErrback.method, message.error.message);
          }
        } else if (callbackErrback.callback) {
          callbackErrback.callback(message.result);
        }
      } else {
        logger.error('WKRDP response for command that we did not send: %s',
            data);
      }
    } else {
      this.messageCallback_(message);
    }
  } else {
    logger.error('Unexpected binary WebSocket message');
  }
};

  /**
 * Sends WKRDP command and registers response handing callback/errback.
 *
 * @param {Object} command the WKRDP command object to send, except id field.
 * @param {Function} [callback] invoked on success.
 * @param {Function} [errback] invoked on failure with an Error object.
 * @returns {string} Generated command id (from an incrementing counter).
 */
DevTools.prototype.command = function(command, callback, errback) {
  'use strict';
  this.commandId_ += 1;
  command.id = this.commandId_;
  if (callback || errback) {
    this.commandCallbacks_[command.id] = {
        method: command.method,
        callback: callback,
        errback: errback
    };
  }
  logger.debug('Send command: %j', command);
  this.ws_.send(JSON.stringify(command));
  return command.id;
};
