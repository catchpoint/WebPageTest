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
var vm = require('vm');
var devtools = require('devtools');
var devtools_network = require('devtools_network');
var devtools_page = require('devtools_page');
var devtools_timeline = require('devtools_timeline');
var logger = require('logger');
var system_commands = require('system_commands');
var util = require('util');
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
   * @param  {Object} initMessage the IPC message with test run parameters.
   *     Has attributes:
   *     {Object} options can have the properties:
   *         browserName: Selenium name of the browser
   *         browserVersion: Selenium version of the browser
   *     {int} runNumber the test iteration number, starting with 1.
   *     {String} script webdriverjs script.
   *     {String} seleniumJar path to the selenium jar.
   *     {String} chromedriver path to the chromedriver executable.
   *     {?javaCommand=} javaCommand system java command.
   */
  init: function(initMessage) {
      //options, runNumber, captureVideo, script,
      //seleniumJar, chromedriver, javaCommand) {
    'use strict';
    this.options_ = initMessage.options || {};
    this.runNumber_ = initMessage.runNumber;
    this.captureVideo_ = initMessage.captureVideo;
    this.script_ = initMessage.script;
    this.serverProcess_ = undefined;
    this.serverPort_ = 4444;
    this.serverUrl_ = undefined;
    this.driver_ = undefined;
    this.driverBuildTime_ = undefined;
    this.devToolsPort_ = 1234;
    this.devToolsMessages_ = [];
    this.devToolsTimelineMessages_ = [];
    this.screenshots_ = [];
    this.seleniumJar_ = initMessage.seleniumJar;
    this.chromedriver_ = initMessage.chromedriver;
    this.chrome_ = initMessage.chrome;
    this.javaCommand_ = initMessage.javaCommand || 'java';
    // Prevent WebDriver calls in onAfterDriverAction/Error from recursive
    // processing in these functions, if they call a WebDriver method.
    // Set it to true before calling a WebDriver method (e.g. takeScreenshot),
    // to false upon completion of that method.
    this.actionCbRecurseGuard_ = false;

    this.uncaughtExceptionHandler_ = this.onUncaughtException_.bind(this);
    this.setSystemCommands_();
  },

  onUncaughtException_: function(e) {
    'use strict';
    logger.critical('Stopping WebDriver server on uncaught exception: %s', e);
    process.send({cmd: 'error', e: e.toString()});
    this.stop();
  },

  /**
   * Starts the WebDriver server and schedules a wait for it to be ready.
   *
   * @this {WebDriverServer}
   * @param {Object} browserCaps capabilities to be passed to Builder.build().
   */
  startServer_: function(browserCaps) {
    'use strict';
    var self = this;
    if (!this.seleniumJar_) {
      throw new Error('Must set server jar before starting WebDriver server');
    }
    if (this.serverProcess_) {
      logger.error('prior WD server alive when launching');
      this.serverProcess_.kill();
      this.serverProcess_ = undefined;
      this.serverUrl_ = undefined;
    }
    var serverCommand, serverArgs, serverUrlPath;
    if ('chrome' === browserCaps.browserName) {
      // Run chromedriver directly.
      serverCommand = this.chromedriver_;
      serverArgs = ['-port=' + this.serverPort_];
      serverUrlPath = '';
    } else {
      // Fall back to the universal Java server
      serverCommand = this.javaCommand_;
      serverArgs = [
        '-jar', this.seleniumJar_,
        '-port=' + this.serverPort_
      ];
      serverUrlPath = '/wd/hub';
    }
    logger.info('Starting WD server: %s %j', serverCommand, serverArgs);
    var serverProcess = child_process.spawn(serverCommand, serverArgs);
    serverProcess.on('exit', function(code, signal) {
      logger.info('WD EXIT code %s signal %s', code, signal);
      self.serverProcess_ = undefined;
      self.serverUrl_ = undefined;
      process.send({cmd: 'exit', code: code, signal: signal});
    });
    serverProcess.stdout.on('data', function(data) {
      logger.info('WD STDOUT: %s', data);
    });
    // WD STDERR only gets log level warn because it outputs a lot of harmless
    // information over STDERR
    serverProcess.stderr.on('warn', function(data) {
      logger.error('WD STDERR: %s', data);
    });
    this.serverProcess_ = serverProcess;
    this.serverUrl_ = 'http://localhost:' + this.serverPort_ + serverUrlPath;
    logger.info('WebDriver URL: %s', this.serverUrl_);

    // Create an executor to simplify querying the server to see if it is ready.
    var client = new webdriver.http.HttpClient(this.serverUrl_);
    var executor = new webdriver.http.Executor(client);
    var command = new webdriver.command.Command(
        webdriver.command.CommandName.GET_SERVER_STATUS);
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
          logger.info('DevTools Network events enabled');
        });
        pageTools.enable(function() {
          logger.info('DevTools Page events enabled');
        });
        timelineTools.enable(function() {
          logger.info('DevTools Timeline events enabled');
        });
        timelineTools.start(function() {
          logger.info('DevTools Timeline events started');
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
   * Called by the sandboxed Builder after the user script calls build().
   *
   * @param {Object} driver the built driver instance (real one, not sandboxed).
   * @param {Object} browserCaps browser capabilities used to build the driver.
   * @param {Object} wdNamespace the sandboxed namespace, for app/promise sync.
   */
  onDriverBuild: function(driver, browserCaps, wdNamespace) {
    'use strict';
    logger.extra('WD post-build callback, driver=%j', driver);
    this.driver_ = driver;
    if (browserCaps.browserName.indexOf('chrome') !== -1) {
      this.connectDevTools_(wdNamespace);
    }
    if (this.captureVideo_) {
      this.takeScreenshot_(
          driver, util.format('%d_progress_0', this.runNumber_),
          'after Builder.build()').then(function() {
        this.driverBuildTime_ = Date.now();
      }.bind(this));
    } else {
      this.driverBuildTime_ = Date.now();
    }
  },

  takeScreenshot_: function(driver, fileNameNoExt, description) {
    'use strict';
    if (this.actionCbRecurseGuard_) {
      // Check the recursion guard in the calling function
      logger.error('Recursion guard true in takeScreenshot_');
    }
    this.actionCbRecurseGuard_ = true;
    // We operate in milliseconds, WPT wants "tens of seconds" units.
    return driver.takeScreenshot().then(function(screenshot) {
      this.actionCbRecurseGuard_ = false;
      logger.info('Screenshot %s (%d bytes): %s',
          fileNameNoExt, screenshot.length, description);
      this.screenshots_.push({
        fileName: fileNameNoExt + '.png',
        contentType: 'image/png',
        base64: screenshot,
        description: description});
      return screenshot;  // Allow following then()'s to reuse the screenshot.
    }.bind(this), function(e) {
      this.actionCbRecurseGuard_ = false;
      logger.error('failed to take screenshot: %s', e.message);
    }.bind(this));
  },

  /**
   * Called by the sandboxed driver before each command.
   *
   * @param {Object} driver the built driver instance (real one, not sandboxed).
   * @param {String} command WebDriver command name.
   * @param {Object} commandArgs array of command arguments.
   * *param {Object} result command result.
   */
  onBeforeDriverAction: function(driver, command, commandArgs) {
    'use strict';
    logger.extra('Injected before WD command: %s', commandArgs[1]);
    if (this.actionCbRecurseGuard_) {
      logger.extra('Recursion guard: before');
      return;
    }
    if (command.getName() === webdriver.command.CommandName.QUIT) {
      this.takeScreenshot_(
          driver,
          util.format('%d_screen', this.runNumber_),
          'before WebDriver.quit()');
    }
  },

  /**
   * Called by the sandboxed driver after each command completion.
   *
   * @param {Object} driver the built driver instance (real one, not sandboxed).
   * @param {String} command WebDriver command name.
   * @param {Object} commandArgs array of command arguments.
   * *param {Object} result command result.
   */
  onAfterDriverAction: function(driver, command, commandArgs/*, result*/) {
    'use strict';
    logger.extra('Injected after command: %s', commandArgs[1]);
    if (this.actionCbRecurseGuard_) {
      logger.extra('Recursion guard: after');
      return;
    }
    if (command.getName() === webdriver.command.CommandName.QUIT) {
      return;  // Cannot do anything after quitting the browser
    }
    var commandStr = commandArgs[1];
    if (this.captureVideo_) {
      // We operate in milliseconds, WPT wants "tenths of a second" units.
      var wptTimestamp = Math.round((Date.now() - this.driverBuildTime_) / 100);
      var progressFileName =
          util.format('%d_progress_%d', this.runNumber_, wptTimestamp);
      logger.debug('Screenshot after: %s(%j)', command.getName(), commandArgs);
      this.takeScreenshot_(driver, progressFileName, 'After ' + commandStr)
          .then(function(screenshot) {
        if (command.getName() === webdriver.command.CommandName.GET) {
          // This is also the doc-complete screenshot.
          this.screenshots_.push({
            fileName: util.format('%d_screen_doc.png', this.runNumber_),
            contentType: 'image/png',
            base64: screenshot,
            description: commandStr});
        }
      }.bind(this));
    } else if (command.getName() === webdriver.command.CommandName.GET) {
      // No video -- just intercept a get() and take a doc-complete screenshot.
      logger.debug('Doc-complete screenshot after: %s', commandStr);
      this.takeScreenshot_(
          driver,
          util.format('%d_screen_doc', this.runNumber_),
          commandStr);
    }
  },

  /**
   * Called by the sandboxed driver after a command failure.
   *
   * @param {Object} driver the built driver instance (real one, not sandboxed).
   * @param {String} command WebDriver command name.
   * @param {Object} commandArgs array of command arguments.
   * @param {Object} e command error.
   */
  onAfterDriverError: function(driver, command, commandArgs, e) {
    'use strict';
    logger.error('Driver error: %s', e.message);
    this.onAfterDriverAction(driver, command, commandArgs, e);
  },

  /**
   * Runs the user script in a sandboxed environment.
   *
   * @param {Object} browserCaps browser capabilities to build the driver.
   * @return {Object} promise that resolves when it is safe to kill the browser.
   */
  runSandboxedSession_: function(browserCaps) {
    'use strict';
    return wd_sandbox.createSandboxedWdNamespace(
        this.serverUrl_, browserCaps, this).then(function(wdSandbox) {
      var sandboxWdApp = wdSandbox.promise.Application.getInstance();
      sandboxWdApp.on(wdSandbox.promise.Application.EventType.IDLE,
          function() {
            logger.info('The sandbox application has gone idle, history: %j',
                sandboxWdApp.getHistory());
          });
      // Bring it!
      return sandboxWdApp.schedule(
          'Run Script',
          this.runScript_.bind(this, wdSandbox)).then(
          this.waitForCoalesce_.bind(this, wdSandbox, WAIT_AFTER_ONLOAD_MS_));
    }.bind(this));
  },

  /**
   * Schedules the entire webpagetest job. It starts the server,
   * connects the devtools, and uses the webdriver promise manager to schedule
   * the rest of the steps required to execute the job.
   * @this {WebDriverServer}
   */
  connect: function() {
    'use strict';
    var browserCaps = {
      browserName: (this.options_.browserName || 'chrome').toLowerCase(),
      version: this.options_.browserVersion || '',
      platform: 'ANY',
      javascriptEnabled: true,
      // Only used when launching actual Chrome, ignored otherwise
      'chrome.switches': ['-remote-debugging-port=' + this.devToolsPort_]
    };
    if (this.chrome_) {
      browserCaps['chrome.binary'] = this.chrome_;
    }
    process.once('uncaughtException', this.uncaughtExceptionHandler_);
    this.startServer_(browserCaps);  // TODO(klm): Handle process failure
    var mainWdApp = webdriver.promise.Application.getInstance();
    mainWdApp.schedule('Run sandboxed WD session',
        this.runSandboxedSession_.bind(this, browserCaps)).then(
        this.done_.bind(this),
        this.onError_.bind(this));

    mainWdApp.on(webdriver.promise.Application.EventType.IDLE, function() {
      logger.info('The main application has gone idle, history: %j',
          mainWdApp.getHistory());
    });

    logger.info('WD connect promise setup complete');
  },

  /**
   * Runs the user script in a sandboxed sandbox.
   *
   * @param  {Object} wdSandbox the context in which the script will run.
   */
  runScript_: function(wdSandbox) {
    'use strict';
    var sandbox = {
      console: console,
      setTimeout: global.setTimeout,
      webdriver: wdSandbox
    };
    logger.info('Running user script');
    vm.runInNewContext(this.script_, sandbox, 'WPT Job Script');
    logger.info('User script returned, but not necessarily finished');
  },

  /**
   * Called once the webdriver script finishes and allows post-onLoad
   * activity to finish on the page.
   *
   * @param  {Object} wdSandbox the context in which the user script runs.
   * @param  {Number} timeout how long the browser should wait after the page
   *                  finishes loading.
   */
  waitForCoalesce_: function(wdSandbox, timeout) {
    'use strict';
    logger.info('Sandbox finished, waiting for browser to coalesce');
    wdSandbox.promise.Application.getInstance().scheduleTimeout(
        'Waiting for browser to coalesce', timeout);
  },

  done_: function() {
    'use strict';
    var mainWdApp = webdriver.promise.Application.getInstance();
    logger.info('Sandboxed session succeeded');
    this.stop();
    mainWdApp.schedule('Emit done', function() {
      logger.debug('wd_server: sending IPC done');
      process.send({
          cmd: 'done',
          devToolsMessages: this.devToolsMessages_,
          devToolsTimelineMessages: this.devToolsTimelineMessages_,
          screenshots: this.screenshots_});
    }.bind(this));
  },

  onError_: function(e) {
    'use strict';
    logger.error('Sandboxed session failed, calling server stop(): %s',
        e.stack);
    this.stop();
    process.send({cmd: 'error', e: e});
  },

  onDevToolsMessage_: function(message) {
    'use strict';
    logger.extra('DevTools message: %j', message);
    if (undefined !== message.method) {
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
    // Stop handling uncaught exceptions
    process.removeListener('uncaughtException', this.uncaughtExceptionHandler_);
    var killProcess = function() {
      if (this.serverProcess_) {
        try {
          this.killServerProcess();
        } catch (killException) {
          logger.error('WebDriver server kill failed: %s', killException);
        }
      } else {
        logger.warn('stop(): server process is already unset');
      }
      // Unconditionally unset them, even if the scheduled quit/kill fails
      this.driver_ = undefined;
      this.driverBuildTime_ = undefined;
      this.serverUrl_ = undefined;
    }.bind(this);
    if (this.driver_) {
      logger.debug('stop(): driver.quit()');
      this.driver_.quit().then(killProcess, killProcess);
    } else {
      logger.warn('stop(): driver is already unset');
      killProcess();
    }
  },

  killServerProcess: function() {
    'use strict';
    var killSignal;
    try {
      killSignal = system_commands.get('kill signal');
    } catch (e) {
      killSignal = undefined;
    }
    if (this.serverProcess_) {
      logger.debug('Killing the WD server');
      this.serverProcess_.kill(killSignal);
    }
  },

  setSystemCommands_: function() {
    'use strict';

    system_commands.set('kill signal', 'SIGHUP', 'unix');
    // windows should send the default kill signal
    // system_commands.set('kill signal', '', 'win32');
  }
};
exports.WebDriverServer = WebDriverServer;

process.on('message', function(m) {
  'use strict';
  if (m.cmd === 'init') {
    exports.WebDriverServer.init(m);
  } else if (m.cmd === 'connect') {
    exports.WebDriverServer.connect();
  } else if (m.cmd === 'stop') {
    exports.WebDriverServer.stop();
  } else {
    logger.error('Unrecognized IPC command %s, message: %j', m.cmd, m);
  }
});
