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

var child_process = require('child_process');
var logger = require('logger');


function BrowserIos(app, iosWebkitDebugProxy, deviceSerial) {
  'use strict';
  logger.info('BrowserIos(%s)', deviceSerial);
  this.app_ = app;
  this.deviceSerial_ = deviceSerial;
  this.iosWebkitDebugProxy_ = iosWebkitDebugProxy;
  this.devToolsPort_ = 9222;
  this.devToolsUrl_ = undefined;
  this.childProcess_ = undefined;
}
exports.BrowserIos = BrowserIos;

BrowserIos.prototype.startWdServer = function(/*browserCaps, isFirstRun*/) {
  'use strict';
  throw new Error('HA! HA! HA!');
};

BrowserIos.prototype.startBrowser = function() {
  'use strict';
  if (this.iosWebkitDebugProxy_) {
    if (this.childProcess_) {
      throw new Error('Internal error: proxy already running');
    }
    logger.info('Starting proxy');
    this.childProcess_ = child_process.spawn(this.iosWebkitDebugProxy_,
        ['-c', this.deviceSerial_ + ':' + this.devToolsPort_]);
    this.childProcess_.on('exit', function(code, signal) {
      logger.info('Proxy EXIT code %s signal %s', code, signal);
      this.childProcess_ = undefined;
      this.devToolsUrl_ = undefined;
    }.bind(this));
    this.childProcess_.stdout.on('data', function(data) {
      logger.info('Proxy STDOUT: %s', data);
    });
    this.childProcess_.stderr.on('warn', function(data) {
      logger.error('Proxy STDERR: %s', data);
    });
  }
  this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
};

BrowserIos.prototype.kill = function() {
  'use strict';
  if (this.childProcess_) {
    logger.debug('Killing the proxy');
    try {
      this.childProcess_.kill();
    } catch (killException) {
      logger.error('Proxy kill failed: %s', killException);
    }
  } else {
    logger.debug('Proxy process already unset');
  }
  this.childProcess_ = undefined;
  this.devToolsUrl_ = undefined;
};

BrowserIos.prototype.isRunning = function() {
  'use strict';
  return undefined !== this.childProcess_;
};

BrowserIos.prototype.getServerUrl = function() {
  'use strict';
  return undefined;
};

BrowserIos.prototype.getDevToolsUrl = function() {
  'use strict';
  return this.devToolsUrl_;
};

BrowserIos.prototype.getDevToolsCapabilities = function() {
  'use strict';
  return {
      'Page.captureScreenshot': false
  };
};
