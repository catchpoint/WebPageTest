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

var logger = require('logger');
var process_utils = require('process_utils');

/**
 * Desktop Chrome browser.
 *
 * @param {webdriver.promise.Application} app the Application for scheduling.
 * @param {Object.<string>} args browser options with string values:
 *    chromedriver
 *    chrome= Chrome binary
 *    ...
 * @constructor
 */
function BrowserLocalChrome(app, args) {
  'use strict';
  logger.info('BrowserLocalChrome(%s, %s)', args.chromedriver, args.chrome);
  this.app_ = app;
  this.chromedriver_ = args.chromedriver;
  this.chrome_ = args.chrome;
  this.serverPort_ = 4444;
  this.serverUrl_ = undefined;
  this.devToolsPort_ = 1234;
  this.devToolsUrl_ = undefined;
  this.childProcess_ = undefined;
  this.childProcessName_ = undefined;
}
/** Public class. */
exports.BrowserLocalChrome = BrowserLocalChrome;

/**
 * Start Chrome as a direct chromedriver, which supports sandboxed scripts.
 *
 * @param {Object} browserCaps capabilities to be passed to Builder.build():
 *    #param {string} browserName must be 'chrome'.
 */
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
    throw new Error('BrowserLocalChrome called with unexpected browser ' +
        browserCaps.browserName);
  }
  // TODO set serverUrl after startChildProcess_ succeeds
  this.serverUrl_ = 'http://localhost:' + this.serverPort_;
  this.startChildProcess_(serverCommand, serverArgs, 'WD server');
};

/**
 * Start the standard non-webdriver Chrome, which can't run scripts.
 */
BrowserLocalChrome.prototype.startBrowser = function() {
  'use strict';
  // TODO(klm): clean profile, see how ChromeDriver does it.
  this.startChildProcess_(this.chrome_ || 'chrome', [
      '-remote-debugging-port=' + this.devToolsPort_,
      '--enable-benchmarking'  // Suppress randomized field trials.
    ], 'Chrome');
};

/**
 * @param {string} command process name.
 * @param {Array} args process args.
 * @param {string} name description for debugging.
 * @private
 */
BrowserLocalChrome.prototype.startChildProcess_ = function(
    command, args, name) {
  'use strict';
  // We expect startWdServer or startBrowser, but not both!
  if (this.childProcess_) {
    throw new Error('Internal error: WD server already running');
  }
  process_utils.scheduleSpawn(this.app_, command, args).then(
      function(proc) {
    this.childProcessName_ = name;
    this.childProcess_ = proc;
    proc.on('exit', function(code, signal) {
      logger.info('WD EXIT code %s signal %s', code, signal);
      this.childProcess_ = undefined;
      this.serverUrl_ = undefined;
      this.devToolsUrl_ = undefined;
    }.bind(this));
    proc.stdout.on('data', function(data) {
      logger.info('WD STDOUT: %s', data);
    });
    // WD STDERR only gets log level warn because it outputs a lot of harmless
    // information over STDERR
    proc.stderr.on('data', function(data) {
      logger.warn('WD STDERR: %s', data);
    });
    this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
  }.bind(this));
};

/** Kill. */
BrowserLocalChrome.prototype.kill = function() {
  'use strict';
  if (this.childProcess_) {
    process_utils.signalKill(this.childProcess_, this.childProcessName_);
  } else {
    logger.debug('%s process already unset', this.childProcessName_);
  }
  this.childProcess_ = undefined;
  this.serverUrl_ = undefined;
  this.devToolsUrl_ = undefined;
};

/** @return {boolean} */
BrowserLocalChrome.prototype.isRunning = function() {
  'use strict';
  return undefined !== this.childProcess_;
};

/** @return {string} WebDriver Server URL. */
BrowserLocalChrome.prototype.getServerUrl = function() {
  'use strict';
  return this.serverUrl_;
};

/** @return {string} DevTools URL. */
BrowserLocalChrome.prototype.getDevToolsUrl = function() {
  'use strict';
  return this.devToolsUrl_;
};

/** @return {Object} capabilities. */
BrowserLocalChrome.prototype.scheduleGetCapabilities = function() {
  'use strict';
  return this.app_.schedule('get capabilities', function() {
    return {
        webdriver: (!!this.chromedriver_),
        'wkrdp.Page.captureScreenshot': true,  // TODO(klm): check before-26.
        'wkrdp.Network.clearBrowserCache': true,
        'wkrdp.Network.clearBrowserCookies': true
      };
  }.bind(this));
};
