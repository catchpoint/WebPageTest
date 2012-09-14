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
var events = require('events');
var util = require('util');
var vm = require('vm');
var devtools = require('devtools');
var devtools_network = require('devtools_network');
var devtools_page = require('devtools_page');
var devtools_timeline = require('devtools_timeline');
var logger = require('logger');
var system_commands = require('system_commands');
var webdriver = require('webdriver');
var wd_sandbox = require('wd_sandbox');

var WD_CONNECT_TIMEOUT_MS_ = 120000;
var DEVTOOLS_CONNECT_TIMEOUT_MS_ = 10000;
var WAIT_AFTER_ONLOAD_MS_ = 10000;

/**
 * WebDriverServer Responsible for a WebDriver server for a given browser type.
 *
 * @param {Object} options A dictionary:
 *                 browserName -- Selenium name of the browser.
 *                 browserVersion -- Selenium version of the browser.
 */
var WebDriverServer = {
  /**
   * init sets up the WebDriver server with all of the properties it needs to
   * complete a job. It also sets up an uncaught exception handler.
   * This is acts like a constructor
   * @this {WebDriverServer}
   *
   * @param  {Object} options can have the properties:
   *                    browserName: Selenium name of the browser
   *                    browserVersion: Selenium version of the browser
   * @param  {String} script webdriverjs script.
   * @param  {String} selenium_jar path to the selenium jar.
   * @param  {String} chromedriver path to the chromedriver executable.
   * @param  {?javaCommand=} javaCommand system java command.
   */
  init: function(options, script, selenium_jar, chromedriver, javaCommand) {
    'use strict';
    this.selenium_jar = selenium_jar;
    this.chromedriver_ = chromedriver;
    this.options_ = options || {};
    this.script_ = script;
    this.serverProcess_ = undefined;
    this.serverUrl_ = undefined;
    this.driver_ = undefined;
    this.devToolsPort_ = 1234;
    this.devToolsMessages_ = [];
    this.devToolsTimelineMessages_ = [];
    this.javaCommand_ = javaCommand || 'java';

    this.uncaughtExceptionHandler_ = this.onUncaughtException_.bind(this);
  },

  onUncaughtException_: function(e) {
    'use strict';
    logger.log('critical', 'Stopping WebDriver server on uncaught exception: ' +
        e);
    process.send({cmd: 'error', e: e.toString()});
    this.stop();
  },

  /**
   * startServer attempts to start the webdriver server. It initiates a promise
   * that makes this function synchronous until the server either successfully
   * starts or fails.
   * @this {WebDriverServer}
   */
  startServer_: function() {
    'use strict';
    var self = this;
    if (!this.selenium_jar) {
      throw new Error('Must set server jar before starting WebDriver server');
    }
    if (this.serverProcess_) {
      logger.log('warning', 'prior WD server alive when launching');
      this.serverProcess_.kill();
      this.serverProcess_ = undefined;
      this.serverUrl_ = undefined;
    }
    var javaArgs = [
      '-Dwebdriver.chrome.driver=' + this.chromedriver_,
      '-jar', this.selenium_jar
    ];
    logger.log('info', 'Starting WD server: ' +
        this.javaCommand_ + ' ' + javaArgs.join(' '));
    var serverProcess = child_process.spawn(this.javaCommand_, javaArgs);
    serverProcess.on('exit', function(code, signal) {
      logger.log('info', 'WD EXIT code ' + code + ' signal ' + signal);
      self.serverProcess_ = undefined;
      self.serverUrl_ = undefined;
      process.send({cmd: 'exit', code: code, signal: signal});
    });
    serverProcess.stdout.on('data', function(data) {
      logger.log('info', 'WD STDOUT: ' + data);
    });
    // WD STDERR only gets log level warn because it outputs a lot of harmless
    // information over STDERR
    serverProcess.stderr.on('warn', function(data) {
      logger.log('error', 'WD STDERR: ' + data);
    });
    this.serverProcess_ = serverProcess;
    this.serverUrl_ = 'http://localhost:4444/wd/hub';

    // Create an executor to simplify querying the server to see if it is ready.
    var client = new webdriver.node.HttpClient(this.serverUrl_);
    var executor = new webdriver.http.Executor(client);
    var command =
        new webdriver.Command(webdriver.CommandName.GET_SERVER_STATUS);
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
    }, WD_CONNECT_TIMEOUT_MS_);
  },

  onDriverBuild_: function(driver, browserCaps, wdNamespace) {
    'use strict';
    logger.log('extra', 'WD post-build callback, driver=' +
        JSON.stringify(driver));
    this.driver_ = driver;
    if (browserCaps.browserName.indexOf('chrome') !== -1) {
      this.connectDevTools_(wdNamespace);
    }
  },

  /**
   * connectDevTools_ attempts to create a new devtools instance and attempts to
   * connect it to the webdriver server
   * @this {WebDriverServer}
   *
   * @param  {Object} wdNamespace a sandboxed webdriver object that exposes
   *                  only desired properties to the user.
   */
  connectDevTools_: function(wdNamespace) {
    'use strict';
    var self = this;
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
          logger.log('info', 'DevTools Network events enabled');
        });
        pageTools.enable(function() {
          logger.log('info', 'DevTools Page events enabled');
        });
        timelineTools.enable(function() {
          logger.log('info', 'DevTools Timeline events enabled');
        });
        timelineTools.start(function() {
          logger.log('info', 'DevTools Timeline events started');
        });
        isDevtoolsConnected.resolve(true);
      });
      devTools.on('message', function(message) {
         self.onDevToolsMessage_(message);
      });
      devTools.connect();
      return isDevtoolsConnected.promise;
    }, DEVTOOLS_CONNECT_TIMEOUT_MS_);
  },

  /**
   * Creates a sandbox (map) in which to run a user script.
   *
   * @param {Object}  seeds is an object that contains the additional stuff
   *                  to put in the sandbox.
   * @return {Object} the sandbox for the vm API.
   */
  createSandbox_: function(seeds) {
    'use strict';
    var sandbox = {
      console: console,
      setTimeout: global.setTimeout
    };
    for (var property in seeds) {
      if (seeds.hasOwnProperty(property)) {
        logger.log('info', 'Copying seed property into sandbox: ' + property);
        sandbox[property] = seeds[property];
      }
    }
    return sandbox;
  },

  /**
   * connect schedules the entire webpagetest job. It starts the server,
   * connects the devtools, and uses the webdriver promise manager to schedule
   * the rest of the steps required to execute the job.
   * @this {WebDriverServer}
   */
  connect: function() {
    'use strict';
    var self = this;
    this.startServer_();  // TODO(klm): Handle process failure
    process.once('uncaughtException', this.uncaughtExceptionHandler_);
    var browserCaps = {
      browserName: (this.options_.browserName || 'chrome').toLowerCase(),
      version: this.options_.browserVersion || '',
      platform: 'ANY',
      javascriptEnabled: true,
      // Only used when launching actual Chrome, ignored otherwise
      'chrome.switches': ['-remote-debugging-port=' + this.devToolsPort_]
    };
    var mainWdApp = webdriver.promise.Application.getInstance();
    mainWdApp.schedule('Run sandboxed WD session', function() {
      return wd_sandbox.createSandboxedWdNamespace(
          self.serverUrl_, browserCaps, function(driver, wdSandbox) {
            self.onDriverBuild_(driver, browserCaps, wdSandbox);
          }).then(function(wdSandbox) {
            var sandboxWdApp = wdSandbox.promise.Application.getInstance();
            sandboxWdApp.on(wdSandbox.promise.Application.EventType.IDLE,
                function() {
              logger.log('warn', 'The sandbox application has gone idle, ' +
                  'history: ' + sandboxWdApp.getHistory());
            });
            // Bring it!
            return sandboxWdApp.schedule('Run Script', function() {
            self.runScript_(self.script_, wdSandbox);
          }).then(self.waitForCoalesce(sandboxWdApp, WAIT_AFTER_ONLOAD_MS_));
      });
    }).then(function() {
      self.done_();
    }, function(e) {
      self.onError_(e);
    });

    mainWdApp.on(webdriver.promise.Application.EventType.IDLE, function() {
      logger.log('warn', 'The main application has gone idle, history: ' +
          mainWdApp.getHistory());
    });

    logger.log('info', 'WD connect promise setup complete');
  },

  /**
   * runScript will take script and run it in the context of wd_sandbox.
   * @this {WebDriverServer}
   *
   * @param  {String} script the webdriverjs script.
   * @param  {Object} wdSandbox the context in which the script will run.
   */
  runScript_: function(script, wdSandbox) {
    'use strict';
    var sandbox = this.createSandbox_({
      webdriver: wdSandbox
    });
    vm.runInNewContext(script, sandbox, 'WPT Job Script');
  },

  /**
   * waitForCoalesce is called once the webdriver script finishes and allows
   * delayed javascript to run on the loaded page.
   *
   * @param  {Object} sandboxWdApp the main instance of the webdriver sandbox.
   * @param  {Number} timeout how long the browser should wait after the page
   *                  finishes loading.
   */
  waitForCoalesce: function(sandboxWdApp, timeout) {
    'use strict';
    logger.log('info', 'Sandbox finished, waiting for browser to coalesce');
    sandboxWdApp.scheduleTimeout(
        'Wait to let the browser coalesce', timeout);
  },

  done_: function() {
    'use strict';
    var self = this;
    var mainWdApp = webdriver.promise.Application.getInstance();
    logger.log('info', 'Sandboxed session succeeded');
    this.stop();
    mainWdApp.schedule('Emit done', function() {
      process.send({
          cmd: 'done',
          devToolsMessages: self.devToolsMessages_,
          devToolsTimelineMessages: self.devToolsTimelineMessages_});
    });
  },

  onError_: function(e) {
    'use strict';
    logger.log('error', 'Sandboxed session failed, calling server stop(): ' +
        e.stack);
    this.stop();
    process.send({cmd: 'error', e: e});
  },

  onDevToolsMessage_: function(message) {
    'use strict';
    logger.log('extra', 'DevTools message: ' + JSON.stringify(message));
    if ('method' in message) {
      if (message.method.slice(0, devtools_network.METHOD_PREFIX.length) ===
          devtools_network.METHOD_PREFIX ||
          message.method.slice(0, devtools_page.METHOD_PREFIX.length) ===
          devtools_page.METHOD_PREFIX) {
        this.devToolsMessages_.push(message);
      } else {
        this.devToolsTimelineMessages_.push(message);
      }
    }
  },

  /**
   * stop will cleanup after a job. First it asks the webdriver server to kill
   * the driver. After that it tris to kill the webdriver server itself.
   * @this {WebDriverServer}
   */
  stop: function() {
    'use strict';
    var self = this;
    // Stop handling uncaught exceptions
    process.removeListener('uncaughtException', this.uncaughtExceptionHandler_);
    var killProcess = function() {
      if (self.serverProcess_) {
        try {
          self.killServerProcess();
        } catch (killException) {
          logger.log('error', 'WebDriver server kill failed: ' + killException);
        }
      } else {
        logger.log('warn', 'stop(): server process is already unset');
      }
      // Unconditionally unset them, even if the scheduled quit/kill fails
      self.driver_ = undefined;
      self.serverUrl_ = undefined;
    }
    // For closure -- this.driver_ would be reset
    var driver = this.driver_;
    if (driver) {
      logger.log('extra', 'stop(): driver.quit()');
      driver.quit().then(killProcess, killProcess);


    } else {
      logger.log('warn', 'stop(): driver is already unset');
      killProcess();
    }
  },

  killServerProcess: function() {
    'use strict';
    if (this.serverProcess_)
      this.serverProcess_.kill(system_commands.get('kill signal'));
  }
};
exports.WebDriverServer = WebDriverServer;

process.on('message', function(m) {
  if (m.cmd === 'init') {
    exports.WebDriverServer.init(m.options, m.script,
        m.selenium_jar, m.chromedriver, m.javaCommand);
  } else if (m.cmd === 'connect') {
    exports.WebDriverServer.connect();
  } else if (m.cmd === 'stop') {
    exports.WebDriverServer.stop();
  }
});
