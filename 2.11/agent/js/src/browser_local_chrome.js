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
var system_commands = require('system_commands');


function BrowserLocalChrome(app, chromedriver, chrome) {
  'use strict';
  logger.info('BrowserLocalChrome(%s, %s)', chromedriver, chrome);
  this.app_ = app;
  this.chromedriver_ = chromedriver;
  this.chrome_ = chrome;
  this.serverPort_ = 4444;
  this.serverUrl_ = undefined;
  this.devToolsPort_ = 1234;
  this.devToolsUrl_ = undefined;
  this.childProcess_ = undefined;
  this.childProcessName_ = undefined;
}
exports.BrowserLocalChrome = BrowserLocalChrome;

BrowserLocalChrome.prototype.startWdServer = function(browserCaps) {
  'use strict';
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
    throw new Error('BrowserLocalChrome called with unexpected browser '
        + browserCaps.browserName);
  }
  this.startChildProcess_(serverCommand, serverArgs, 'WD server');
  this.serverUrl_ = 'http://localhost:' + this.serverPort_;
};

BrowserLocalChrome.prototype.startBrowser = function() {
  'use strict';
  // TODO(klm): clean profile, see how ChromeDriver does it.
  this.startChildProcess_(
      this.chrome_ || 'chrome',
      [
          '-remote-debugging-port=' + this.devToolsPort_,
          '--enable-benchmarking'  // Suppress randomized field trials.
      ],
      'Chrome');
};

BrowserLocalChrome.prototype.startChildProcess_ = function(
    command, args, name) {
  'use strict';
  if (this.childProcess_) {
    throw new Error('Internal error: WD server already running');
  }
  logger.info('Starting %s: %s %j', name, command, args);
  this.childProcessName_ = name;
  this.childProcess_ = child_process.spawn(command, args);
  this.childProcess_.on('exit', function(code, signal) {
    logger.info('WD EXIT code %s signal %s', code, signal);
    this.childProcess_ = undefined;
    this.serverUrl_ = undefined;
    this.devToolsUrl_ = undefined;
  }.bind(this));
  this.childProcess_.stdout.on('data', function(data) {
    logger.info('WD STDOUT: %s', data);
  });
  // WD STDERR only gets log level warn because it outputs a lot of harmless
  // information over STDERR
  this.childProcess_.stderr.on('warn', function(data) {
    logger.error('WD STDERR: %s', data);
  });
  this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
};

BrowserLocalChrome.prototype.kill = function() {
  'use strict';
  if (this.childProcess_) {
    logger.debug('Killing %s', this.childProcessName_);
    var killSignal;
    try {
      killSignal = system_commands.get('kill signal');
    } catch (e) {
      killSignal = undefined;
    }
    try {
      this.childProcess_.kill(killSignal);
    } catch (killException) {
      logger.error('%s kill failed: %s', this.childProcessName_, killException);
    }
  } else {
    logger.debug('%s process already unset', this.childProcessName_);
  }
  this.childProcess_ = undefined;
  this.serverUrl_ = undefined;
  this.devToolsUrl_ = undefined;
};

BrowserLocalChrome.prototype.isRunning = function() {
  'use strict';
  return undefined !== this.childProcess_;
};

BrowserLocalChrome.prototype.getServerUrl = function() {
  'use strict';
  return this.serverUrl_;
};

BrowserLocalChrome.prototype.getDevToolsUrl = function() {
  'use strict';
  return this.devToolsUrl_;
};

BrowserLocalChrome.prototype.scheduleGetCapabilities = function() {
  'use strict';
  return this.app_.schedule('get capabilities', function() {
    return {
        'wkrdp.Page.captureScreenshot': true,  // TODO(klm): check before-26.
        'wkrdp.Network.clearBrowserCache': true,
        'wkrdp.Network.clearBrowserCookies': true
    };
  }.bind(this));
};

exports.setSystemCommands = function() {
  'use strict';
  system_commands.set('kill signal', 'SIGHUP', 'unix');
};
