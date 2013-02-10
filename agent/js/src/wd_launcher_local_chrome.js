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
/*jslint nomen:false*/

var child_process = require('child_process');
var logger = require('logger');
var system_commands = require('system_commands');


function WdLauncherLocalChrome(chromedriver, chrome) {
  'use strict';
  logger.info('WdLauncherLocalChrome(%s, %s)', chromedriver, chrome);
  this.chromedriver_ = chromedriver;
  this.chrome_ = chrome;
  this.serverPort_ = 4444;
  this.serverUrl_ = undefined;
  this.devToolsPort_ = 1234;
  this.devToolsUrl_ = undefined;
  this.serverProcess_ = undefined;
}
exports.WdLauncherLocalChrome = WdLauncherLocalChrome;

WdLauncherLocalChrome.prototype.start = function(browserCaps) {
  'use strict';
  if (this.serverProcess_) {
    throw new Error('Internal error: prior WD server running unexpectedly');
  }
  var serverCommand, serverArgs;
  if ('chrome' === browserCaps.browserName) {
    if (!this.chromedriver_) {
      throw new Error('Must set chromedriver before starting it');
    }
    // Run chromedriver directly.
    serverCommand = this.chromedriver_;
    serverArgs = ['-port=' + this.serverPort_];
    browserCaps['chrome.switches'] = [
      '-remote-debugging-port=' + this.devToolsPort_,
      '--enable-benchmarking'  // Suppress randomized field trials.
    ];
    if (this.chrome_) {
      browserCaps['chrome.binary'] = this.chrome_;
    }
  } else {
    throw new Error('WdLauncherLocalChrome called with unexpected browser '
        + browserCaps.browserName);
  }
  logger.info('Starting WD server: %s %j', serverCommand, serverArgs);
  var serverProcess = child_process.spawn(serverCommand, serverArgs);
  serverProcess.on('exit', function(code, signal) {
    logger.info('WD EXIT code %s signal %s', code, signal);
    this.serverProcess_ = undefined;
    this.serverUrl_ = undefined;
    this.devToolsUrl_ = undefined;
  }.bind(this));
  serverProcess.stdout.on('data', function(data) {
    logger.info('WD STDOUT: %s', data);
  });
  // WD STDERR only gets log level warn because it outputs a lot of harmless
  // information over STDERR
  serverProcess.stderr.on('warn', function(data) {
    logger.error('WD STDERR: %s', data);
  });
  this.serverProcess_ = serverProcess;
  this.serverUrl_ = 'http://localhost:' + this.serverPort_;
  this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
  logger.info('WebDriver URL: %s, DevTools URL: %s',
      this.serverUrl_, this.devToolsUrl_);
};

WdLauncherLocalChrome.prototype.kill = function() {
  'use strict';
  if (this.serverProcess_) {
    logger.debug('Killing the WD server');
    var killSignal;
    try {
      killSignal = system_commands.get('kill signal');
    } catch (e) {
      killSignal = undefined;
    }
    try {
      this.serverProcess_.kill(killSignal);
    } catch (killException) {
      logger.error('WebDriver server kill failed: %s', killException);
    }
    this.serverUrl_ = undefined;
    this.devToolsUrl_ = undefined;
    this.serverProcess_ = undefined;
  } else {
    logger.warn('WD server process is already unset');
  }
};

WdLauncherLocalChrome.prototype.isRunning = function() {
  'use strict';
  return undefined !== this.serverProcess_;
};

WdLauncherLocalChrome.prototype.getServerUrl = function() {
  'use strict';
  return this.serverUrl_;
};

WdLauncherLocalChrome.prototype.getDevToolsUrl = function() {
  'use strict';
  return this.devToolsUrl_;
};

exports.setSystemCommands = function() {
  'use strict';
  system_commands.set('kill signal', 'SIGHUP', 'unix');
};
