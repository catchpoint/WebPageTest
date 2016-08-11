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
var browser_base = require('browser_base');
var util = require('util');
var webdriver = require('selenium-webdriver');

var CHROME_FLAGS = [
    '--disable-fre', '--enable-benchmarking', '--metrics-recording-only'
  ];


/**
 * Desktop Chrome browser.
 *
 * @param {webdriver.promise.ControlFlow} app the ControlFlow for scheduling.
 * @param {Object.<string>} args browser options with string values:
 *    chromedriver
 *    chrome= Chrome binary
 *    ...
 * @constructor
 */
function BrowserLocalChrome(app, args) {
  'use strict';
  var flags = args.flags || {};
  browser_base.BrowserBase.call(this, app);
  logger.info('BrowserLocalChrome(%s, %s)', flags.chromedriver, flags.chrome);
  this.chromedriver_ = flags.chromedriver;  // Requires chromedriver 2.x.
  this.chrome_ = flags.chrome;
  this.serverPort_ = 4444;  // Chromedriver listen port.
  this.serverUrl_ = undefined;  // WebDriver server URL for WebDriver tests.
  this.devToolsPort_ = 1234;  // If running without chromedriver.
  this.devToolsUrl_ = undefined;    // If running without chromedriver.
  this.chromeFlags_ = CHROME_FLAGS;
  this.task_ = args.task;
  this.supportsTracing = true;
}
util.inherits(BrowserLocalChrome, browser_base.BrowserBase);
/** @constructor */
exports.BrowserLocalChrome = BrowserLocalChrome;

/**
 * Starts chromedriver, 2.x required.
 *
 * @param {Object} browserCaps capabilities to be passed to Builder.build():
 *    #param {string} browserName must be 'chrome'.
 */
BrowserLocalChrome.prototype.startWdServer = function(browserCaps) {
  'use strict';
  var requestedBrowserName = browserCaps[webdriver.Capability.BROWSER_NAME];
  if (webdriver.Browser.CHROME !== requestedBrowserName) {
    throw new Error('BrowserLocalChrome called with unexpected browser ' +
        requestedBrowserName);
  }
  if (!this.chromedriver_) {
    throw new Error('Must set chromedriver before starting it');
  }

  var serverCommand = this.chromedriver_;
  var serverArgs = ['--port=' + this.serverPort_];
  if (logger.isLogging('extra')) {
    serverArgs.push('--verbose');
  }
  browserCaps.chromeOptions = {args: CHROME_FLAGS.slice()};
  if (this.chrome_) {
    browserCaps.chromeOptions.binary = this.chrome_;
  }
  this.startChildProcess(serverCommand, serverArgs, 'WD server');
  // Make sure we set serverUrl_ only after the child process start success.
  this.app_.schedule('Set WD server URL', function() {
    this.serverUrl_ = 'http://localhost:' + this.serverPort_;
  }.bind(this));
};

// Infrequent device cleanup/health
BrowserLocalChrome.prototype.deviceCleanup = function() {
}

/**
 * Starts the standard non-webdriver Chrome, which can't run scripts.
 */
BrowserLocalChrome.prototype.startBrowser = function() {
  'use strict';
  // TODO(klm): clean profile, see how ChromeDriver does it.
  var flags = CHROME_FLAGS;
  flags.push('-remote-debugging-port=' + this.devToolsPort_);
  if (this.task_.ignoreSSL) {
    flags.push('--ignore-certificate-errors');
  }
  this.startChildProcess(this.chrome_ || 'chrome', flags, 'Chrome');
  // Make sure we set devToolsUrl_ only after the child process start success.
  this.app_.schedule('Set DevTools URL', function() {
    this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
  }.bind(this));
};

/**
 * Callback when the child chromedriver process exits.
 * @override
 */
BrowserLocalChrome.prototype.onChildProcessExit = function() {
  'use strict';
  this.serverUrl_ = undefined;
  this.devToolsUrl_ = undefined;
};

/** Kill. */
BrowserLocalChrome.prototype.kill = function() {
  'use strict';
  this.killChildProcessIfNeeded();
  this.devToolsUrl_ = undefined;
  this.serverUrl_ = undefined;
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
        webdriver: !!this.chromedriver_,
        'wkrdp.Page.captureScreenshot': true,
        'wkrdp.Network.clearBrowserCache': true,
        'wkrdp.Network.clearBrowserCookies': true
      };
  }.bind(this));
};

/**
 * Starts packet capture.
 *
 * #param {string} filename  local file where to copy the pcap result.
 */
BrowserLocalChrome.prototype.scheduleStartPacketCapture = function() {
  'use strict';
  throw new Error('Packet capture requested, but not implemented for Chrome');
};

/**
 * Stops packet capture and copies the result to a local file.
 */
BrowserLocalChrome.prototype.scheduleStopPacketCapture = function() {
  'use strict';
  throw new Error('Packet capture requested, but not implemented for Chrome');
};
