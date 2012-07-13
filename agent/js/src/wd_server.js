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
var devtools = require('devtools');
var devtools_network = require('devtools_network');
var devtools_page = require('devtools_page');
var devtools_timeline = require('devtools_timeline');
var events = require('events');
var util = require('util');
var wd_sandbox = require('wd_sandbox');
var webdriver = require('webdriver');

var defaultJavaCommand_ = 'java';
var defaultServerJar_;
var defaultChromeDriver_;

var DEFAULT_WD_CONNECT_TIMEOUT_MS_ = 10000;  // TODO(klm): Make configurable?


exports.setJavaCommand = function(command) {
  'use strict';
  if (defaultJavaCommand_ && defaultJavaCommand_ !== 'java') {
    throw new Error('May only set Java command once');
  }
  defaultJavaCommand_ = command;
};


exports.setServerJar = function(jarPath) {
  'use strict';
  if (defaultServerJar_) {
    throw new Error('May only set WebDriver server jar path once');
  }
  defaultServerJar_ = jarPath;
};


exports.setChromeDriver = function(chromeDriver) {
  'use strict';
  if (defaultChromeDriver_) {
    throw new Error('May only set chromedriver path once');
  }
  defaultChromeDriver_ = chromeDriver;
};


/**
 * Responsible for a WebDriver server for a given browser type.
 *
 * @param options A dictionary:
 *     browserName -- Selenium name of the browser.
 *     browserVersion -- Selenium version of the browser.
 */
var WebDriverServer = function(options) {
  'use strict';
  this.javaCommand_ = defaultJavaCommand_;
  this.serverJar_ = defaultServerJar_;
  this.chromeDriver_ = defaultChromeDriver_;
  this.options_ = options || {};
  this.serverProcess_ = undefined;
  this.serverPgid_ = undefined;
  this.serverUrl_ = undefined;
  this.driver_ = undefined;
  this.devToolsPort_ = 1234;
  this.devToolsMessages_ = [];
  this.devToolsTimelineMessages_ = [];

  this.uncaughtExceptionHandler_ = this.onUncaughtException_.bind(this);
};
util.inherits(WebDriverServer, events.EventEmitter);

WebDriverServer.prototype.onUncaughtException_ = function(e) {
  'use strict';
  console.error('Stopping WebDriver server on uncaught exception: %s', e);
  this.emit('error', e);
  this.stop();
};

/** Returns a closure that returns the server URL. */
WebDriverServer.prototype.startServer_ = function() {
  'use strict';
  var self = this;  // For closure
  if (!this.serverJar_) {
    throw new Error('Must call setServerJar before starting WebDriver server');
  }
  if (this.serverProcess_) {
    console.log('WARNING: prior WD server unexpectedly alive when launching');
    this.serverProcess_.kill();
    this.serverProcess_ = undefined;
    this.serverUrl_ = undefined;
  }
  var javaArgs = [
    '-Dwebdriver.chrome.driver=' + this.chromeDriver_,
    '-jar', this.serverJar_
  ];
  console.log('Starting WD server: %s %s',
      this.javaCommand_, javaArgs.join(' '));
  var serverProcess = child_process.spawn(this.javaCommand_, javaArgs,
      {setsid: true});  // setsid: create new process group with java's PID
  this.serverPgid_ = serverProcess.pid;
  console.info('WD server PGID=%s', this.serverPgid_);
  serverProcess.on('exit', function(code, signal) {
    console.log('WD EXIT code %s, signal %s', code, signal);
    self.serverProcess_ = undefined;
    self.serverUrl_ = undefined;
    if (self.serverPgid_) {  // Kill the process group, with Chrome if running
      var pgid = self.serverPgid_;
      self.serverPgid_ = undefined;
      // process.kill(-pgid);  // kill with a negative PID == killpg
    }
    self.emit('exit', code, signal);
  });
  serverProcess.stdout.on('data', function(data) {
    console.log('WD STDOUT: %s', data);
  });
  serverProcess.stderr.on('data', function(data) {
    console.log('WD STDERR: %s', data);
  });
  this.serverProcess_ = serverProcess;
  this.serverUrl_ = 'http://localhost:4444/wd/hub';

  // Create an executor to simplify querying the server to see if it is ready.
  var client = new webdriver.node.HttpClient(this.serverUrl_);
  var executor = new webdriver.http.Executor(client);
  var command = new webdriver.Command(webdriver.CommandName.GET_SERVER_STATUS);

  var wdApp = webdriver.promise.Application.getInstance();
  wdApp.scheduleWait('Waiting for WD server to be ready', function() {
    var isReady = new webdriver.promise.Deferred();
    executor.execute(command, function(error /*, unused_response*/) {
      if (error) {
        isReady.resolve(false);
      } else {
        isReady.resolve(true);
      }
    });
    return isReady.promise;
  }, DEFAULT_WD_CONNECT_TIMEOUT_MS_);
};

WebDriverServer.prototype.onDriverBuild_ = function(
    driver, browserCaps, wdNamespace) {
  'use strict';
  console.log('WD post-build callback, driver=%s', JSON.stringify(driver));
  this.driver_ = driver;
  if (browserCaps.browserName.indexOf('chrome') !== -1) {
    this.connectDevTools_(wdNamespace);
  }
};

WebDriverServer.prototype.connectDevTools_ = function(wdNamespace) {
  'use strict';
  var self = this;  // For closure
  var wdApp = wdNamespace.promise.Application.getInstance();
  wdApp.scheduleWait('Connect DevTools', function() {
    var isDevtoolsConnected = new wdNamespace.promise.Deferred();
    var devTools = new devtools.DevTools(
        'http://localhost:' + self.devToolsPort_ + '/json');
    devTools.on('connect', function() {
      var networkTools = new devtools_network.Network(devTools);
      var pageTools = new devtools_page.Page(devTools);
      var timelineTools = new devtools_timeline.Timeline(devTools);
      networkTools.enable(function() {
        console.log('DevTools Network events enabled');
      });
      pageTools.enable(function() {
        console.log('DevTools Page events enabled');
      });
      timelineTools.enable(function() {
        console.log('DevTools Timeline events enabled');
      });
      isDevtoolsConnected.resolve(true);
    });
    devTools.on('message', function(message) {
       self.onDevToolsMessage_(message);
    });
    devTools.connect();
    return isDevtoolsConnected.promise;
  }, DEFAULT_WD_CONNECT_TIMEOUT_MS_);
};

/**
 * Emits 'connect' or 'timeout'.
 */
WebDriverServer.prototype.connect = function() {
  'use strict';
  var self = this;  // For closure
  this.startServer_();  // TODO(klm): Handle process failure
  process.once('uncaughtException', this.uncaughtExceptionHandler_);
  var browserCaps = {
    browserName: (self.options_.browserName || 'chrome').toLowerCase(),
    version: self.options_.browserVersion || '',
    platform: 'ANY',
    javascriptEnabled: true,
    // Only used when launching actual Chrome, ignored otherwise
    'chrome.switches': ['-remote-debugging-port=' + self.devToolsPort_]
  };
  console.log('browserCaps = %s', JSON.stringify(browserCaps));
  var mainWdApp = webdriver.promise.Application.getInstance();
  mainWdApp.schedule('Run sandboxed WD session', function() {
    return wd_sandbox.createSandboxedWdNamespace(
      self.serverUrl_, browserCaps, function(driver, wdSandbox) {
      self.onDriverBuild_(driver, browserCaps, wdSandbox);
    }).then(function(wdSandbox) {
      console.log('Sandboxed WD module created');
      var sandboxWdApp = wdSandbox.promise.Application.getInstance();
      sandboxWdApp.on(wdSandbox.promise.Application.EventType.IDLE, function() {
        console.log('The sandbox application has gone idle, history: %s',
            sandboxWdApp.getHistory());
      });
      // Bring it!
      return sandboxWdApp.schedule('Emit connect', function() {
        console.log('Emitting connect...');
        self.emit('connect', wdSandbox);
      }).then(function() {
        console.log('Sandbox finished, waiting for browser to coalesce');
        sandboxWdApp.scheduleTimeout(
            'Wait to let the browser coalesce', DEFAULT_WD_CONNECT_TIMEOUT_MS_);
      });
    });
  }).then(function() {
    console.log('Sandboxed session succeeded');
    self.stop();
    mainWdApp.schedule('Emit done', function() {
      self.emit('done', self.devToolsMessages_, self.devToolsTimelineMessages_);
    });
  }, function(e) {
    console.log('Sandboxed session failed, calling server stop(): %s', e.stack);
    self.stop();
    self.emit('error', e);
  });

  mainWdApp.on(webdriver.promise.Application.EventType.IDLE, function() {
    console.log('The main application has gone idle, history: %s',
        mainWdApp.getHistory());
  });

  console.log('WD connect promise setup complete');
};

WebDriverServer.prototype.onDevToolsMessage_ = function(message) {
  'use strict';
  console.log('DevTools message: %s', JSON.stringify(message));
  if ('method' in message) {
    if (message.method.slice(0, devtools_network.METHOD_PREFIX.length) ===
        devtools_network.METHOD_PREFIX
        || message.method.slice(0, devtools_page.METHOD_PREFIX.length) ===
        devtools_page.METHOD_PREFIX) {
      this.devToolsMessages_.push(message);
    } else {
      this.devToolsTimelineMessages_.push(message)
    }
  }
};

WebDriverServer.prototype.stop = function() {
  'use strict';
  // Stop handling uncaught exceptions
  process.removeListener('uncaughtException', this.uncaughtExceptionHandler_);
  var driver = this.driver_;  // For closure -- self.driver_ would be reset
  if (driver) {
    console.info('stop(): driver.quit()');
    //KLM DO NOT SUBMIT driver.quit();
  } else {
    console.error('stop(): driver is already unset');
  }
  if (this.serverProcess_) {
    try {
      // process.kill(-this.serverPgid_);
      this.serverProcess_.kill();
    } catch (killException) {
      console.error('WebDriver server kill failed: %s', killException);
    }
  } else {
    console.error('stop(): server process is already unset');
  }
  // Unconditionally unset them, even if the scheduled quit/kill fails
  this.driver_ = undefined;
  this.serverUrl_ = undefined;
};

exports.WebDriverServer = WebDriverServer;
