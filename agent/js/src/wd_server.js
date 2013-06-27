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

var devtools = require('devtools');
var logger = require('logger');
var process_utils = require('process_utils');
var vm = require('vm');
var wd_sandbox = require('wd_sandbox');
var webdriver = require('webdriver');

/** Allow tests to stub out. */
exports.process = process;

var WD_CONNECT_TIMEOUT_MS_ = 120000;
var DEVTOOLS_CONNECT_TIMEOUT_MS_ = 10000;
var DETACH_TIMEOUT_MS_ = 2000;

/** Allow test access. */
exports.WAIT_AFTER_ONLOAD_MS = 10000;

// onDevToolsMessage_ log levels by message.method, defaults to 'debug'
var DEVTOOLS_METHOD_TO_LEVEL = {
  'Network.dataReceived': 'extra',
  'Network.loadingFinished': 'extra',
  'Network.requestServedFromCache': 'extra',
  'Network.requestServedFromMemoryCache': 'extra',
  'Network.requestWillBeSent': 'extra',
  'Network.responseReceived': 'extra',
  'Timeline.eventRecorded': 'extra',
  'Page.loadEventFired': 'info',
  'Inspector.detached': 'warn',
  'Network.loadingFailed': 'warn',
  'Page.javascriptDialogOpening': 'warn'
};

/**
 * The WebDriverServer is forked by agent_main via './wd_server.js', and is
 * responsible for a single device/browser's WebDriver server.
 *
 * The WebDriverServer and agent_main communicate via IPC messages.  We listen
 * for 'run' and 'abort' messages, and we send back 'done' and 'error' messages.
 *
 * @constructor
 * @return {WebDriverServer} singleton.
 */
function WebDriverServer() {
  'use strict';
  if (WebDriverServer.instance_) {
    return WebDriverServer.instance_;
  }
  WebDriverServer.instance_ = this;
  return this;
}

/** @return {WebDriverServer} singleton. */
WebDriverServer.getInstance = function() {
  'use strict';
  return new WebDriverServer();
};
/** Allow test access. */
exports.WebDriverServer = WebDriverServer;

/**
 * Register for IPC messages from agent_main.
 */
WebDriverServer.prototype.initIpc = function() {
  'use strict';
  exports.process.on('message', function(message) {
    var cmd = (message ? message.cmd : '');
    if ('run' === cmd) {
      this.init(message);
      this.connect();
    } else if ('abort' === cmd) {
      logger.debug('aborting run');
      this.scheduleStop();
    } else {
      logger.error('Unrecognized IPC command %s, message: %j', cmd, message);
    }
  }.bind(this));
};

/**
 * init sets up the WebDriver server with all of the properties it needs to
 * complete a job. It also sets up an uncaught exception handler.
 * This is acts like a constructor
 *
 * @param  {Object} initMessage the IPC message with test run parameters.
 *   Has attributes:
 *     {Object=} options Selenium options can have the properties:
 *         {string} browserName Selenium name of the browser
 *         {string} browserVersion Selenium version of the browser
 *     {number} runNumber run number.
 *     {string=} script webdriverjs script.
 *     {string=} url non-script url.
 *     {string=} browser browser_* object name.
 *     {boolean=} captureVideo
 *     {boolean=} exitWhenDone
 *     {number=} timeout in milliseconds.
 *   plus browser-specific attributes, e.g.:
 *     {string=} deviceSerial unique device id.
 *     {string=} seleniumJar path to the selenium jar.
 *     {string=} chromedriver path to the chromedriver executable.
 *     {string=} java system java command.
 */
WebDriverServer.prototype.init = function(initMessage) {
  'use strict';
  // Reset every run:
  this.abortTimer_ = undefined;
  this.captureVideo_ = initMessage.captureVideo;
  this.devToolsMessages_ = [];
  this.driver_ = undefined;
  this.exitWhenDone_ = initMessage.exitWhenDone;
  this.isRecordingDevTools_ = false;
  this.options_ = initMessage.options || {};
  this.pageLoadDonePromise_ = undefined;
  this.runNumber_ = initMessage.runNumber;
  this.screenshots_ = [];
  this.script_ = initMessage.script;
  this.testStartTime_ = undefined;
  this.timeoutTimer_ = undefined;
  this.timeout_ = initMessage.timeout;
  this.url_ = initMessage.url;
  this.videoFile_ = undefined;
  this.tearDown_();
  if (!this.browser_) {
    // Only set on the first run:
    //
    // Prevent WebDriver calls in onAfterDriverAction/Error from recursive
    // processing in these functions, if they call a WebDriver method.
    // Set it to true before calling a WebDriver method (e.g. takeScreenshot),
    // to false upon completion of that method.
    this.actionCbRecurseGuard_ = false;
    this.app_ = webdriver.promise.Application.getInstance();
    process_utils.injectWdAppLogging('wd_server app', this.app_);
    // Create the browser via reflection
    var browserType = (initMessage.browser ||
        'browser_local_chrome.BrowserLocalChrome');
    logger.debug('Creating ' + browserType);
    var lastDot = browserType.lastIndexOf('.');
    var browserModule = require(browserType.substring(0, lastDot));
    var BrowserClass = browserModule[browserType.substring(lastDot + 1)];
    this.browser_ = new BrowserClass(this.app_, initMessage);
    this.capabilities_ = undefined;
    this.devTools_ = undefined;
    this.isCacheCleared_ = false;
    this.sandboxApp_ = undefined;
    this.uncaughtExceptionHandler_ = this.onUncaughtException_.bind(this);
    this.wdSandbox_ = undefined;
  }
};

/**
 * Starts the WebDriver server and schedules a wait for it to be ready.
 *
 * @param {Object} browserCaps capabilities to be passed to Builder.build().
 * @return {webdriver.promise.Promise} resolve({boolean} isOkay).
 * @private
 */
WebDriverServer.prototype.startWdServer_ = function(browserCaps) {
  'use strict';
  if (this.browser_.isRunning()) {
    throw new Error('Internal error: prior WD server running unexpectedly');
  }

  // assert getCapabilities() has webdriver === true?
  this.browser_.startWdServer(browserCaps, this.runNumber_ === 1);
  // Create an executor to simplify querying the server to see if it is ready.
  var client = new webdriver.http.HttpClient(this.browser_.getServerUrl());
  var executor = new webdriver.http.Executor(client);
  var command = new webdriver.command.Command(
      webdriver.command.CommandName.GET_SERVER_STATUS);
  var wdReadyPromise = this.app_.scheduleWait('Waiting for WD server',
      function() {
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
  return wdReadyPromise;
};

/**
 * @param {Object} browserCaps browser capabilities used to build the driver.
 * @private
 */
WebDriverServer.prototype.startChrome_ = function(browserCaps) {
  'use strict';
  if (this.browser_.isRunning()) {
    throw new Error('Internal error: prior Chrome running unexpectedly');
  }
  this.browser_.startBrowser(browserCaps, this.runNumber_ === 1);
  this.connectDevTools_(webdriver);
};

/**
 * connectDevTools_ attempts to create a new devtools instance and attempts to
 * connect it to the webdriver server.
 *
 * @param {Object} wdNamespace a sandboxed webdriver object that exposes
 *   only desired properties to the browser.
 * @private
 */
WebDriverServer.prototype.connectDevTools_ = function(wdNamespace) {
  'use strict';
  this.app_.scheduleWait('Connect DevTools to ' + wdNamespace,
      function() {
    var connected = new webdriver.promise.Deferred();
    var devTools = new devtools.DevTools(this.browser_.getDevToolsUrl());
    devTools.connect(function() {
      this.devTools_ = devTools;
      this.devTools_.onMessage(this.onDevToolsMessage_.bind(this));
      connected.resolve(true);
    }.bind(this), function() {
      connected.resolve(false);
    });
    return connected.promise;
  }.bind(this), DEVTOOLS_CONNECT_TIMEOUT_MS_);
  this.networkCommand_('enable');
  this.pageCommand_('enable');
  this.timelineCommand_('start');
};

/**
 * @param {Error=} err error if the page load failed.
 * @private
 */
WebDriverServer.prototype.onPageLoad_ = function(err) {
  'use strict';
  if (this.pageLoadDonePromise_ && this.pageLoadDonePromise_.isPending()) {
    if (this.timeoutTimer_) {
      global.clearTimeout(this.timeoutTimer_);
      this.timeoutTimer_ = undefined;
    }
    if (this.abortTimer_) {
      global.clearTimeout(this.abortTimer_);
      this.abortTimer_ = undefined;
    }
    if (err) {
      logger.warn('Unable to load page: %s', err.message);
      this.pageLoadDonePromise_.reject(err);
    } else {
      this.pageLoadDonePromise_.resolve(true);
    }
  }
};

/**
 * @param {Object} message DevTools message:
 *    #param {string} method e.g. 'Page.loadEventFired'.
 * @private
 */
WebDriverServer.prototype.onDevToolsMessage_ = function(message) {
  'use strict';
  var level = DEVTOOLS_METHOD_TO_LEVEL[message.method] || 'debug';
  if (logger.isLogging(level)) {
    logger[level].apply(undefined, ['%sDevTools message: %s',
        (this.isRecordingDevTools_ ? '' : '#'), JSON.stringify(message)]);
  }
  if (this.isRecordingDevTools_) {
    this.devToolsMessages_.push(message);
  }
  if (this.script_) {
    // WD jobs run until the script finishes -- there's no pageload promise.
    return;
  }
  if (this.abortTimer_) {
    // We received an 'Inspector.detached' message, as noted below, so ignore
    // messages until our abortTimer fires.
  } else if ('Page.loadEventFired' === message.method) {
    if (this.isRecordingDevTools_) {
      this.onPageLoad_();
    }
  } else if ('Inspector.detached' === message.method) {
    if (this.pageLoadDonePromise_ && this.pageLoadDonePromise_.isPending()) {
      // This message typically means that the browser has crashed.
      // Instead of waiting for the timeout, we'll give the browser a couple
      // seconds to paint an error message (for our screenshot) and then fail
      // the page load.
      var err = new Error('Inspector detached on run ' + this.runNumber_ +
          ', did the browser crash?', this.runNumber_);
      this.abortTimer_ = global.setTimeout(
          this.onPageLoad_.bind(this, err), DETACH_TIMEOUT_MS_);
    } else {
      // TODO detach during coalesce?
      logger.warn('%s after Page.loadEventFired?', message.method);
    }
  } else {
    // We might be able to detect timeouts via Network.loadingFailed and
    // Page.frameStoppedLoading messages.  For now we'll let our timeoutTimer
    // handle this.
  }
};

/**
 * @private
 */
WebDriverServer.prototype.onTestStarted_ = function() {
  'use strict';
  this.app_.schedule('Start recording', function() {
    this.isRecordingDevTools_ = true;
    if (this.captureVideo_ && !this.videoFile_) {
      this.takeScreenshot_('progress_0', 'test started');
    }
    this.app_.schedule('Test started', function() {
      logger.info('Test started');
      this.testStartTime_ = Date.now();
    }.bind(this));
  }.bind(this));
};

/**
 * Called by the sandboxed Builder after the user script calls build().
 *
 * @param {Object} driver the built driver instance (real one, not sandboxed).
 * @param {Object} browserCaps browser capabilities used to build the driver.
 * @param {Object} wdNamespace the sandboxed namespace, for app/promise sync.
 */
WebDriverServer.prototype.onDriverBuild = function(
    driver, browserCaps, wdNamespace) {
  'use strict';
  logger.extra('WD post-build callback, driver=%j', driver);
  if (!this.driver_) {
    this.driver_ = driver;
    if (!this.devTools_ && browserCaps.browserName.indexOf('chrome') !== -1) {
      this.connectDevTools_(wdNamespace);
      this.clearPage_();
    }
    this.onTestStarted_();
  } else if (this.driver_ !== driver) {
    throw new Error('Internal error: repeat onDriverBuild with wrong driver');
  }
};

/**
 * Save binary PNG screenshot data.
 *
 * @param {string} fileNameNoExt filename without the '.png' suffix.
 * @param {Buffer} screenshot base64-encoded PNG data.
 * @param {string=} description screenshot description.
 * @private
 */
WebDriverServer.prototype.saveScreenshot_ = function(
    fileNameNoExt, screenshot, description) {
  'use strict';
  logger.info('Screenshot %s (%d bytes): %s',
      fileNameNoExt, screenshot.length, description);
  this.screenshots_.push({
      fileName: fileNameNoExt + '.png',
      contentType: 'image/png',
      base64: screenshot,
      description: description
    });
};

/**
 * Capture and save a screenshot, if supported.
 *
 * @param {string} fileNameNoExt filename without the '.png' suffix.
 * @param {string=} description screenshot description.
 * @return {webdriver.promise.Promise} resolve({Buffer} data), where the
 *   buffer contains the base64-encoded PNG.
 * @private
 */
WebDriverServer.prototype.takeScreenshot_ = function(
    fileNameNoExt, description) {
  'use strict';
  return this.getCapabilities_().then(function(caps) {
    // DevTools screenshots were introduced in Chrome 26:
    //   http://trac.webkit.org/changeset/138236
    //   /trunk/Source/WebCore/inspector/Inspector.json
    if (this.devTools_ && caps['wkrdp.Page.captureScreenshot']) {
      return this.pageCommand_('captureScreenshot').then(function(result) {
        return result.data;
      });
    } else if (caps.takeScreenshot) {
      return this.browser_.scheduleTakeScreenshot();
    } else {
      return undefined;
    }
  }.bind(this)).then(function(screenshot) {
    if (screenshot) {
      this.saveScreenshot_(fileNameNoExt, screenshot, description);
    }
    return screenshot;
  }.bind(this), function() { // ignore errors
  });
};

/**
 * Called by the sandboxed driver before each command.
 *
 * @param {string} command WebDriver command name.
 * @param {Object} commandArgs array of command arguments.
 */
WebDriverServer.prototype.onBeforeDriverAction = function(command,
     commandArgs) { // jshint unused:false
  'use strict';
  if (command.getName() === webdriver.command.CommandName.QUIT) {
    logger.debug('Before WD quit: forget driver, devTools');
    this.driver_ = undefined;
    this.devTools_ = undefined;
  }
};

/**
 * Called by the sandboxed driver after each command completion.
 *
 * @param {string} command WebDriver command name.
 * @param {Object} commandArgs array of command arguments.
 * @param {Object} result command result.
 */
WebDriverServer.prototype.onAfterDriverAction = function(
    command, commandArgs,
     result) { // jshint unused:false
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
  if (this.captureVideo_ && !this.videoFile_) {
    // We operate in milliseconds, WPT wants "tenths of a second" units.
    var wptTimestamp = Math.round((Date.now() - this.testStartTime_) / 100);
    logger.debug('Screenshot after: %s(%j)', command.getName(), commandArgs);
    this.takeScreenshot_('progress_' + wptTimestamp,
        'After ' + commandStr).then(function(screenshot) {
      if (command.getName() === webdriver.command.CommandName.GET) {
        // This is also the doc-complete screenshot.
        this.saveScreenshot_('screen_doc', screenshot, commandStr);
      }
    }.bind(this));
  } else if (command.getName() === webdriver.command.CommandName.GET) {
    // No video -- just intercept a get() and take a doc-complete screenshot.
    logger.debug('Doc-complete screenshot after: %s', commandStr);
    this.takeScreenshot_('screen_doc', commandStr);
  }
};

/**
 * Called by the sandboxed driver after a command failure.
 *
 * @param {string} command WebDriver command name.
 * @param {Object} commandArgs array of command arguments.
 * @param {Object} e command error.
 */
WebDriverServer.prototype.onAfterDriverError = function(
    command, commandArgs, e) {
  'use strict';
  logger.error('Driver error: %s', e.message);
  this.onAfterDriverAction(command, commandArgs);
};

/**
 * Runs the test in a browser session with the given capabilities.
 *
 * @param {Object} browserCaps browser capabilities to build WebDriver.
 * @private
 */
WebDriverServer.prototype.runTest_ = function(browserCaps) {
  'use strict';
  if (this.script_) {
    this.runSandboxedSession_(browserCaps);
  } else {
    this.runPageLoad_(browserCaps);
  }
};

/**
 * @param {Object} command must have 'method' and 'params'.
 * @return {webdriver.promise.Promise} resolve({string} responseBody).
 * @private
 */
WebDriverServer.prototype.devToolsCommand_ = function(command) {
  'use strict';
  // We use a "sender" function because, at startup, our "this.devTools_"
  // is undefined and scheduled, so we can't do:
  //   return process_utils.scheduleFunction(this.app_, command.method,
  //       this.devTools_.sendCommand, command);
  var sender = (function(callback) {
    return this.devTools_.sendCommand(command, callback);
  }.bind(this));
  return process_utils.scheduleFunction(this.app_, command.method, sender);
};

/**
 * @param {string} method command method, e.g. 'navigate'.
 * @param {Object} params command options.
 * @return {webdriver.promise.Promise} resolve({string} responseBody).
 * @private
 */
WebDriverServer.prototype.pageCommand_ = function(method, params) {
  'use strict';
  return this.devToolsCommand_({method: 'Page.' + method, params: params});
};

/**
 * @param {string} method command method, e.g. 'enable'.
 * @param {Object} params command options.
 * @return {webdriver.promise.Promise} resolve({string} responseBody).
 * @private
 */
WebDriverServer.prototype.networkCommand_ = function(method, params) {
  'use strict';
  return this.devToolsCommand_({method: 'Network.' + method, params: params});
};

/**
 * @param {string} method command method, e.g. 'start'.
 * @return {webdriver.promise.Promise} resolve({string} responseBody).
 * @private
 */
WebDriverServer.prototype.timelineCommand_ = function(method) {
  'use strict';
  return this.devToolsCommand_({method: 'Timeline.' + method});
};

/**
 * @param {string} frameId frame id from the resource tree.
 * @param {string} color body bgcolor name.
 * @return {webdriver.promise.Promise} resolve({string} responseBody).
 * @private
 */
WebDriverServer.prototype.setPageBackground_ = function(frameId, color) {
  'use strict';
  return this.pageCommand_('setDocumentContent', {
      frameId: frameId,
      html: color ? '<body bgcolor="' + color + '"/>' : ''
    });
};

/**
 * @return {webdriver.promise.Promise} resolve({Object} capabilities).
 * @private
 */
WebDriverServer.prototype.getCapabilities_ = function() {
  'use strict';
  // Cache the response
  if (this.capabilities_) {
    var done = new webdriver.promise.Deferred();
    done.resolve(this.capabilities_);
    return done;
  } else {
    return this.browser_.scheduleGetCapabilities().then(function(caps) {
      this.capabilities_ = caps;
      return caps;
    }.bind(this));
  }
};

/**
 * Blanks out the browser at the beginning of a test.
 *
 * @private
 */
WebDriverServer.prototype.clearPage_ = function() {
  'use strict';
  this.getCapabilities_().then(function(caps) {
    if (!this.isCacheCleared_) {
      if (caps['wkrdp.Network.clearBrowserCache']) {
        this.networkCommand_('clearBrowserCache');
        this.app_.schedule('Cache cleared', function() {
          this.isCacheCleared_ = true;
        }.bind(this));
      }
      if (caps['wkrdp.Network.clearBrowserCookies']) {
        this.networkCommand_('clearBrowserCookies');
      }
    }
  }.bind(this));
  // Navigate to a blank, to make sure we clear the prior page and cancel
  // all pending events.  This isn't strictly required if startBrowser loads
  // "about:blank", but it's still a good idea.
  this.pageCommand_('navigate', {url: 'data:text/html;charset=utf-8,'});
  // Get the root frameId
  this.pageCommand_('getResourceTree').then(function(result) {
    var frameId = result.frameTree.frame.id;
    // Paint the page white
    // TODO Verify that this blanking is required and, if not, remove it.
    this.setPageBackground_(frameId);
    if (!this.captureVideo_) {
      return;
    }
    // Hold white(500ms) for our video / 'test started' screenshot
    this.app_.scheduleTimeout('Hold white background', 500);
    this.getCapabilities_().then(function(caps) {
      if (!caps.videoRecording) {
        return;
      }
      var videoFile = exports.process.pid + '_video.avi';
      this.browser_.scheduleStartVideoRecording(videoFile,
          this.onVideoRecordingExit_.bind(this));
      this.app_.schedule('Started recording', function() {
        logger.debug('Video record start succeeded');
        this.videoFile_ = videoFile;
      }.bind(this));
      // Hold orange(500ms)->white: anchor video to DevTools.
      this.setPageBackground_(frameId, '#DE640D');  // Ghastly orange.
      this.app_.scheduleTimeout('Hold orange background', 500);
      // Begin recording DevTools before onTestStarted_ fires,
      // to make sure we get the paint event from the below switch to white.
      // This allows us to match the DevTools event timestamp to the
      // video frame where the background changed from orange to white.
      this.app_.schedule('Start recording', function() {
        this.isRecordingDevTools_ = true;
      }.bind(this));
      this.setPageBackground_(frameId);  // White
    }.bind(this));
  }.bind(this));
};

/**
 * @param {Object} browserCaps browser capabilities used to build the driver.
 * @private
 */
WebDriverServer.prototype.runPageLoad_ = function(browserCaps) {
  'use strict';
  this.sandboxApp_ = this.app_;
  if (!this.devTools_) {
    this.startChrome_(browserCaps);
  }
  this.clearPage_();
  // No page load timeout here -- agent_main enforces run-level timeout.
  this.app_.schedule('Run page load', function() {
    // onDevToolsMessage_ resolves this promise when it detects on-load.
    this.pageLoadDonePromise_ = new webdriver.promise.Deferred();
    if (this.timeout_) {
      this.timeoutTimer_ = global.setTimeout(
          this.onPageLoad_.bind(this, new Error('Page load timeout')),
          this.timeout_);
    }
    this.onTestStarted_();
    this.pageCommand_('navigate', {url: this.url_});
    return this.pageLoadDonePromise_.promise;
  }.bind(this));
  this.waitForCoalesce_(webdriver, exports.WAIT_AFTER_ONLOAD_MS);
};

/**
 * Runs the user script in a sandboxed environment.
 *
 * @param {Object} browserCaps browser capabilities to build the driver.
 * @private
 */
WebDriverServer.prototype.runSandboxedSession_ = function(browserCaps) {
  'use strict';
  if (this.sandboxApp_) {
    if (!this.browser_.isRunning()) {
      throw new Error('WD server not running on repeat load');
    }
    // Repeat load with an already running WD server and driver.
    this.runScript_(this.wdSandbox_);
    this.waitForCoalesce_(this.wdSandbox_, exports.WAIT_AFTER_ONLOAD_MS);
  } else {
    this.startWdServer_(browserCaps);
    wd_sandbox.createSandboxedWdNamespace(
        this.browser_.getServerUrl(), browserCaps, this).then(
            function(wdSandbox) {
      this.wdSandbox_ = wdSandbox;
      this.sandboxApp_ = wdSandbox.promise.Application.getInstance();
      this.sandboxApp_.on(
          wdSandbox.promise.Application.EventType.IDLE, function() {
        logger.info('The sandbox application has gone idle, history: %j',
            this.sandboxApp_.getHistory());
      }.bind(this));
      // Bring it!
      this.runScript_(wdSandbox);
      this.waitForCoalesce_.bind(wdSandbox, exports.WAIT_AFTER_ONLOAD_MS);
    }.bind(this));
  }
};

/**
 * Schedules the entire webpagetest job. It starts the server,
 * connects the devtools, and uses the webdriver promise manager to schedule
 * the rest of the steps required to execute the job.
 */
WebDriverServer.prototype.connect = function() {
  'use strict';
  var browserCaps = {
    browserName: (this.options_.browserName || 'chrome').toLowerCase(),
    version: this.options_.browserVersion || '',
    platform: 'ANY',
    javascriptEnabled: true
  };

  this.app_.on(webdriver.promise.Application.EventType.UNCAUGHT_EXCEPTION,
      function() {
    logger.error('App uncaught exception event: %j',
        Array.prototype.slice.call(arguments));
    this.uncaughtExceptionHandler_.apply(this, arguments);
  }.bind(this));
  this.app_.on('error', function() {
    logger.error('App error event: %j',
        Array.prototype.slice.call(arguments));
    this.uncaughtExceptionHandler_.apply(this, arguments);
  }.bind(this));
  // When IDLE is emitted, the app no longer runs an event loop.
  this.app_.on(webdriver.promise.Application.EventType.IDLE, function() {
    logger.info('The main application has gone idle, history: %j',
        this.app_.getHistory());
  }.bind(this));

  this.app_.schedule('Run the test',
      this.runTest_.bind(this, browserCaps)).then(
          this.done_.bind(this), this.onError_.bind(this)).then(
              this.tearDown_.bind(this));
};

/**
 * Schedules the user script to run in a sandbox.
 *
 * @param {Object} wdSandbox the context in which the script will run.
 * @private
 */
WebDriverServer.prototype.runScript_ = function(wdSandbox) {
  'use strict';
  this.app_.schedule('Run script', function() {
    var sandbox = {
      console: console,
      setTimeout: global.setTimeout,
      setInterval: global.setInterval,
      webdriver: wdSandbox
    };
    logger.info('Running user script');
    vm.runInNewContext(this.script_, sandbox, 'WPT Job Script');
    logger.info('User script returned, but not necessarily finished');
  }.bind(this));
};

/**
 * Schedules a wait after the script finishes, to allow post-onLoad
 * activity to finish on the page.
 *
 * @param {Object} wdSandbox the context in which the user script runs.
 * @param {number} timeout how many milliseconds the browser should wait
 *    after the page finishes loading.
 * @private
 */
WebDriverServer.prototype.waitForCoalesce_ = function(wdSandbox, timeout) {
  'use strict';
  this.app_.schedule('Wait for browser', function() {
    logger.info('Test finished, waiting for browser to coalesce');
    this.sandboxApp_.scheduleTimeout(
        'Waiting for browser to coalesce', timeout);
  }.bind(this));
};

/**
 * Unsets per-run variables.
 *
 * @private
 */
WebDriverServer.prototype.tearDown_ = function() {
  'use strict';
  this.driver_ = undefined;
  this.testStartTime_ = undefined;
  if (this.pageLoadDonePromise_) {
    if (this.pageLoadDonePromise_.isPending()) {
      this.pageLoadDonePromise_.cancel('Page load promise never resolved');
    }
    this.pageLoadDonePromise_ = undefined;
  }
  if (this.timeoutTimer_) {
    global.clearTimeout(this.timeoutTimer_);
    this.timeoutTimer_ = undefined;
  }
  if (this.abortTimer_) {
    global.clearTimeout(this.abortTimer_);
    this.abortTimer_ = undefined;
  }
};

/**
 * @private
 */
WebDriverServer.prototype.done_ = function() {
  'use strict';
  logger.info('Test run succeeded');
  var videoFile = this.videoFile_;
  // We must schedule/run a driver quit before we emit 'done', to make sure
  // we take the final screenshot and send it in the 'done' IPC message.
  this.takeScreenshot_('screen', 'end of run').then(function(screenshot) {
    if (screenshot && this.captureVideo_ && !this.videoFile_) {
      // Last video frame
      var wptTimestamp =
          Math.round((Date.now() - this.testStartTime_) / 100);
      this.saveScreenshot_('progress_' + wptTimestamp, screenshot,
          'end of run');
    }
  }.bind(this));
  if (videoFile) {
    this.browser_.scheduleStopVideoRecording();
  }
  this.app_.schedule('Send IPC done', function() {
    logger.debug('sending IPC done');
    exports.process.send({
        cmd: 'done',
        devToolsMessages: this.devToolsMessages_,
        screenshots: this.screenshots_,
        videoFile: videoFile
      });
  }.bind(this));
  if (this.exitWhenDone_) {
    this.scheduleStop();
  }
};

/**
 * @param {Error=} e run error.
 * @private
 */
WebDriverServer.prototype.onError_ = function(e) {
  'use strict';
  logger.error('Run failed, stopping: %s', e.stack);
  var videoFile = this.videoFile_;
  // Take the final screenshot (useful for debugging) and kill the browser.
  // We must schedule/run a driver quit before we emit 'done', to make sure
  // we take the final screenshot and send it in the 'done' IPC message.
  this.takeScreenshot_('screen', 'run error');
  if (videoFile) {
    this.browser_.scheduleStopVideoRecording();
  }
  this.app_.schedule('Send IPC error', function() {
    logger.error('Sending IPC error: %s', e.message);
    exports.process.send({
        cmd: 'error',
        e: e.message,
        devToolsMessages: this.devToolsMessages_,
        screenshots: this.screenshots_,
        videoFile: videoFile
      });
  }.bind(this));
  this.scheduleStop();
};

/**
 * @param {Error=} e video error if the recording failed.
 * @private
 */
WebDriverServer.prototype.onVideoRecordingExit_ = function(e) {
  'use strict';
  if (e) {
    logger.error('Video recording failed:\n' + e.stack);
    this.videoFile_ = undefined;
    // We could onError_ here
  }
};

/**
 * @param {Error=} e uncaught error.
 * @private
 */
WebDriverServer.prototype.onUncaughtException_ = function(e) {
  'use strict';
  logger.critical('Uncaught exception: %s', (e ? e.stack : 'unknown'));
  exports.process.send({cmd: 'error', e: e.message || 'unknown'});
  this.scheduleStop();
};

/**
 * Cleans up after a job.
 *
 * First it asks the webdriver server to kill the driver.
 * After that it tries to kill the webdriver server itself.
 */
WebDriverServer.prototype.scheduleStop = function() {
  'use strict';
  // Stop handling uncaught exceptions
  exports.process.removeListener('uncaughtException',
      this.uncaughtExceptionHandler_);
  if (this.driver_) {
    // onAfterDriverAction resets this.driver_ and this.testStartTime_.
    logger.debug('scheduling driver.quit()');
    this.driver_.quit().addErrback(function(e) {
      logger.error('Exception from "quit": %s', e);
      logger.debug('%s', e.stack);
    });
  } else {
    logger.warn('driver is unset, will not call quit()');
  }
  // kill
  this.app_.schedule('Kill server/browser', function() {
    if (this.browser_) {
      this.browser_.kill();
      this.browser_ = undefined;
      this.devTools_ = undefined;
    } else {
      logger.warn('WD launcher is already unset');
    }
  }.bind(this));
  // Disconnect parent IPC to exit gracefully without a process.exit() call.
  // This should be the last source of event queue events.
  this.app_.schedule('Disconnect IPC',
      exports.process.disconnect.bind(process));
};

process_utils.setSystemCommands();

if (require.main === module) {
  try {
    var wds = exports.WebDriverServer.getInstance();
    wds.initIpc();
  } catch (e) {
    console.log(e);
    process.exit(-1);
  }
}
