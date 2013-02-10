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
var vm = require('vm');
var devtools = require('devtools');
var logger = require('logger');
var process_utils = require('process_utils');
var util = require('util');
var webdriver = require('webdriver');
var wd_launcher = require('wd_launcher_local_chrome');  // TODO(klm): generalize
var wd_sandbox = require('wd_sandbox');

exports.process = process;  // Allow to stub out in tests.

var WD_CONNECT_TIMEOUT_MS_ = 120000;
var DEVTOOLS_CONNECT_TIMEOUT_MS_ = 10000;
exports.WAIT_AFTER_ONLOAD_MS = 10000;

/**
 * WebDriverServer Responsible for a WebDriver server for a given browser type.
 *
 * @param {Object} options A dictionary:
 *                 browserName -- Selenium name of the browser.
 *                 browserVersion -- Selenium version of the browser.
 */
exports.WebDriverServer = {
  initIpc: function() {
    'use strict';
    exports.process.on('message', function(m) {
      if (m.cmd === 'run') {
        this.init(m);
        this.connect();
      } else {
        logger.error('Unrecognized IPC command %s, message: %j', m.cmd, m);
      }
    }.bind(this));
  },

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
   *     {String} script webdriverjs script.
   *     {String} seleniumJar path to the selenium jar.
   *     {String} chromedriver path to the chromedriver executable.
   *     {?javaCommand=} javaCommand system java command.
   */
  init: function(initMessage) {
    'use strict';
    this.options_ = initMessage.options || {};
    this.exitWhenDone_ = initMessage.exitWhenDone;
    this.captureVideo_ = initMessage.captureVideo;
    this.script_ = initMessage.script;
    this.devToolsMessages_ = [];
    this.devToolsTimelineMessages_ = [];
    this.screenshots_ = [];
    if (!this.wdLauncher_) {
      this.wdLauncher_ = new wd_launcher.WdLauncherLocalChrome(
          initMessage.chromedriver, initMessage.chrome);
      this.driver_ = undefined;
      this.driverBuildTime_ = undefined;
      this.devTools_ = undefined;
      // Prevent WebDriver calls in onAfterDriverAction/Error from recursive
      // processing in these functions, if they call a WebDriver method.
      // Set it to true before calling a WebDriver method (e.g. takeScreenshot),
      // to false upon completion of that method.
      this.actionCbRecurseGuard_ = false;
      this.app_ = webdriver.promise.Application.getInstance();
      this.wdSandbox_ = undefined;
      this.sandboxApp_ = undefined;
      process_utils.injectWdAppLogging('wd_server app', this.app_);

      this.uncaughtExceptionHandler_ = this.onUncaughtException_.bind(this);
      wd_launcher.setSystemCommands();
    }
  },

  /**
   * Starts the WebDriver server and schedules a wait for it to be ready.
   *
   * @this {WebDriverServer}
   * @param {Object} browserCaps capabilities to be passed to Builder.build().
   */
  startServer_: function(browserCaps) {
    'use strict';
    if (this.wdLauncher_.isRunning()) {
      throw new Error('Internal error: prior WD server running unexpectedly');
    }

    this.wdLauncher_.start(browserCaps);
    // Create an executor to simplify querying the server to see if it is ready.
    var client = new webdriver.http.HttpClient(this.wdLauncher_.getServerUrl());
    var executor = new webdriver.http.Executor(client);
    var command = new webdriver.command.Command(
        webdriver.command.CommandName.GET_SERVER_STATUS);
    this.app_.scheduleWait('Waiting for WD server to be ready', function() {
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

    logger.info('WD connect promise setup complete');
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
    return this.app_.scheduleWait('Connect DevTools', function() {
      var isDevtoolsConnected = new wdNamespace.promise.Deferred();
      function reject(e) {
        isDevtoolsConnected.reject(e);
      }

      this.devTools_ = new devtools.DevTools(this.wdLauncher_.getDevToolsUrl());

      this.devTools_.connect(function() {
        this.devTools_.networkCommand('enable', function() {
          logger.info('DevTools Network events enabled');
          this.devTools_.pageCommand('enable', function() {
            logger.info('DevTools Page events enabled');
            // Timeline enable event never gets a response.
            this.devTools_.timelineCommand('start', function() {
              logger.info('DevTools Timeline events enabled');
              this.devTools_.onMessage(this.onDevToolsMessage_.bind(this));
              isDevtoolsConnected.resolve(true);
            }.bind(this), reject);
          }.bind(this), reject);
        }.bind(this), reject);
      }.bind(this), reject);

      return isDevtoolsConnected.promise;
    }.bind(this), DEVTOOLS_CONNECT_TIMEOUT_MS_);
  },

  onDevToolsMessage_: function(message) {
    'use strict';
    if (devtools.isNetworkMessage(message) || devtools.isPageMessage(message)) {
      logger.extra('DevTools message: %j', message);
      this.devToolsMessages_.push(message);
    } else {
      logger.extra('DevTools timeline message: %j', message);
      this.devToolsTimelineMessages_.push(message);
    }
  },

  onAfterDriverBuild_: function() {
    'use strict';
    if (this.captureVideo_) {
      this.takeScreenshot_('progress_0', 'after Builder.build()').then(
          function() {
            this.driverBuildTime_ = Date.now();
          }.bind(this));
    } else {
      this.driverBuildTime_ = Date.now();
    }
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
    if (!this.driver_) {
      this.driver_ = driver;
      if (browserCaps.browserName.indexOf('chrome') !== -1) {
        this.connectDevTools_(wdNamespace).then(
            this.onAfterDriverBuild_.bind(this), this.onError_.bind(this));
      } else {
        this.onAfterDriverBuild_();
      }
    } else if (this.driver_ !== driver) {
      throw new Error('Internal error: repeat onDriverBuild with wrong driver');
    }
  },

  takeScreenshot_: function(fileNameNoExt, description) {
    'use strict';
    // DevTools screenshots were introduced in Chrome 26:
    // http://trac.webkit.org/changeset/138236
    //   /trunk/Source/WebCore/inspector/Inspector.json
    var result = null;
    if (this.devTools_) {
      result = this.app_.schedule('Screenshot: ' + description, function() {
        var done = new webdriver.promise.Deferred();
        this.devTools_.pageCommand('captureScreenshot', function(result) {
          var screenshot = result.data;
          logger.info('Screenshot %s (%d bytes): %s',
              fileNameNoExt, screenshot.length, description);
          this.screenshots_.push({
            fileName: fileNameNoExt + '.png',
            contentType: 'image/png',
            base64: screenshot,
            description: description});
          // Allow following then()'s to reuse the screenshot.
          done.resolve(screenshot);
        }.bind(this), function(e) {
          done.reject(e);
        });
        return done;
      }.bind(this));
    } else {
      logger.error('Trying to take a screenshot while there is no DevTools');
    }
    return result;
  },

  /**
   * Called by the sandboxed driver before each command.
   *
   * @param {String} command WebDriver command name.
   * *param {Object} commandArgs array of command arguments.
   */
  onBeforeDriverAction: function(command/*, commandArgs*/) {
    'use strict';
    if (command.getName() === webdriver.command.CommandName.QUIT) {
      logger.debug('Before WD quit: resetting driver, driverBuildTime');
      this.driver_ = undefined;
      this.driverBuildTime_ = undefined;
      this.devTools_ = undefined;
    }
  },

  /**
   * Called by the sandboxed driver after each command completion.
   *
   * @param {String} command WebDriver command name.
   * @param {Object} commandArgs array of command arguments.
   * *param {Object} result command result.
   */
  onAfterDriverAction: function(command, commandArgs/*, result*/) {
    'use strict';
    logger.extra('Injected after command: %s', commandArgs[1]);
    if (this.actionCbRecurseGuard_) {
      logger.extra('Recursion guard: after');
      return;
    }
    if (command.getName() === webdriver.command.CommandName.QUIT) {
      this.driver_ = undefined;
      return;  // Cannot do anything after quitting the browser
    }
    var commandStr = commandArgs[1];
    if (this.captureVideo_) {
      // We operate in milliseconds, WPT wants "tenths of a second" units.
      var wptTimestamp = Math.round((Date.now() - this.driverBuildTime_) / 100);
      logger.debug('Screenshot after: %s(%j)', command.getName(), commandArgs);
      this.takeScreenshot_('progress_' + wptTimestamp, 'After ' + commandStr)
          .then(function(screenshot) {
        if (command.getName() === webdriver.command.CommandName.GET) {
          // This is also the doc-complete screenshot.
          this.screenshots_.push({
            fileName: 'screen_doc.png',
            contentType: 'image/png',
            base64: screenshot,
            description: commandStr});
        }
      }.bind(this));
    } else if (command.getName() === webdriver.command.CommandName.GET) {
      // No video -- just intercept a get() and take a doc-complete screenshot.
      logger.debug('Doc-complete screenshot after: %s', commandStr);
      this.takeScreenshot_('screen_doc', commandStr);
    }
  },

  /**
   * Called by the sandboxed driver after a command failure.
   *
   * @param {String} command WebDriver command name.
   * @param {Object} commandArgs array of command arguments.
   * @param {Object} e command error.
   */
  onAfterDriverError: function(command, commandArgs, e) {
    'use strict';
    logger.error('Driver error: %s', e.message);
    this.onAfterDriverAction(command, commandArgs);
  },

  /**
   * Runs the user script in a sandboxed environment.
   *
   * @param {Object} browserCaps browser capabilities to build the driver.
   * @return {Object} promise that resolves when it is safe to kill the browser.
   */
  runSandboxedSession_: function(browserCaps) {
    'use strict';
    var promise;
    if (this.sandboxApp_) {
      // Repeat load with an already running WD server and driver.
      promise = this.sandboxApp_.schedule(
              'Run Script',
              this.runScript_.bind(this, this.wdSandbox_)).then(
              this.waitForCoalesce_.bind(this, this.wdSandbox_,
                  exports.WAIT_AFTER_ONLOAD_MS));
    } else {
      promise = wd_sandbox.createSandboxedWdNamespace(
          this.wdLauncher_.getServerUrl(), browserCaps, this).then(
              function(wdSandbox) {
        this.wdSandbox_ = wdSandbox;
        this.sandboxApp_ = wdSandbox.promise.Application.getInstance();
        this.sandboxApp_.on(
            wdSandbox.promise.Application.EventType.IDLE, function() {
          logger.info('The sandbox application has gone idle, history: %j',
              this.sandboxApp_.getHistory());
        }.bind(this));
        // Bring it!
        return this.sandboxApp_.schedule(
            'Run Script',
            this.runScript_.bind(this, wdSandbox)).then(
            this.waitForCoalesce_.bind(this, wdSandbox,
                exports.WAIT_AFTER_ONLOAD_MS));
      }.bind(this));
    }
    return promise;
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
      javascriptEnabled: true
    };
    exports.process.once('uncaughtException', this.uncaughtExceptionHandler_);

    if (!this.wdLauncher_.isRunning()) {
      this.wdLauncher_.start(browserCaps);  // TODO(klm): Handle process failure
    }

    this.app_.schedule('Run sandboxed WD session',
        this.runSandboxedSession_.bind(this, browserCaps)).then(
        this.done_.bind(this),
        this.onError_.bind(this));
    // When IDLE is emitted, the app no longer runs an event loop.
    this.app_.on(webdriver.promise.Application.EventType.IDLE, function() {
      logger.info('The main application has gone idle, history: %j',
          this.app_.getHistory());
    }.bind(this));
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
      setInterval: global.setInterval,
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
    this.sandboxApp_.scheduleTimeout(
        'Waiting for browser to coalesce', timeout);
  },

  done_: function() {
    'use strict';
    logger.info('Sandboxed session succeeded');
    // We must schedule/run a driver quit before we emit 'done', to make sure
    // we take the final screenshot and send it in the 'done' IPC message.
    this.takeScreenshot_('screen', 'end of run').then(function(screenshot) {
      if (this.captureVideo_) {
        // Last video frame
        var wptTimestamp =
            Math.round((Date.now() - this.driverBuildTime_) / 100);
        this.screenshots_.push({
            fileName: 'progress_' + wptTimestamp + '.png',
            contentType: 'image/png',
            base64: screenshot,
            description: 'end of run'});
      }
    }.bind(this));
    this.app_.schedule('Send IPC done', function() {
      logger.debug('sending IPC done');
      exports.process.send({
          cmd: 'done',
          devToolsMessages: this.devToolsMessages_,
          devToolsTimelineMessages: this.devToolsTimelineMessages_,
          screenshots: this.screenshots_});
    }.bind(this));
    if (this.exitWhenDone_) {
      this.scheduleStop();
    }
  },

  onError_: function(e) {
    'use strict';
    logger.error('Sandboxed session failed, stopping: %s', e.stack);
    // Take the final screenshot (useful for debugging) and kill the browser.
    // We must schedule/run a driver quit before we emit 'done', to make sure
    // we take the final screenshot and send it in the 'done' IPC message.
    this.takeScreenshot_('screen', 'run error');
    this.app_.schedule('Send IPC error', function() {
      logger.error('Sending IPC error: %j', e);
      exports.process.send({
          cmd: 'error',
          e: e.message,
          devToolsMessages: this.devToolsMessages_,
          devToolsTimelineMessages: this.devToolsTimelineMessages_,
          screenshots: this.screenshots_});
    }.bind(this));
    this.scheduleStop();
  },

  onUncaughtException_: function(e) {
    'use strict';
    logger.critical('Uncaught exception: %s', e);
    logger.debug('Uncaught exception stack: %s', e.stack);
    exports.process.send({cmd: 'error', e: e.message});
    this.scheduleStop();
  },

  scheduleDriverQuit_: function() {
    'use strict';
    if (this.driver_) {
      logger.debug('scheduling driver.quit()');
      // onAfterDriverAction resets this.driver_ and this.driverBuildTime_.
      this.driver_.quit().addErrback(process_utils.getLoggingErrback('quit'))
          .then(function() {
        this.driverBuildTime_ = undefined;
      }.bind(this));
    } else {
      logger.warn('driver is already unset');
    }
  },

  /**
   * Cleans up after a job.
   *
   * First it asks the webdriver server to kill the driver.
   * After that it tris to kill the webdriver server itself.
   */
  scheduleStop: function() {
    'use strict';
    // Stop handling uncaught exceptions
    exports.process.removeListener('uncaughtException',
        this.uncaughtExceptionHandler_);
    this.scheduleDriverQuit_();
    this.app_.schedule('Kill WD server', this.killServer_.bind(this));
    // Disconnect parent IPC to exit gracefully without a process.exit() call.
    // This should be the last source of event queue events.
    this.app_.schedule('Disconnect IPC',
        exports.process.disconnect.bind(process));
  },

  killServer_: function() {
    'use strict';
    if (this.wdLauncher_) {
      this.wdLauncher_.kill();
      this.wdLauncher_ = undefined;
      this.devTools_ = undefined;
    } else {
      logger.warn('WD launcher is already unset');
    }
  }
};

exports.WebDriverServer.initIpc();
