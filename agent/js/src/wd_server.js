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

var browser_base = require('browser_base');
var devtools = require('devtools');
var fs = require('fs');
var logger = require('logger');
var path = require('path');
var process_utils = require('process_utils');
var vm = require('vm');
var wd_sandbox = require('wd_sandbox');
var webdriver = require('selenium-webdriver');
var webdriver_http = require('selenium-webdriver/http');

/** Allow tests to stub out. */
exports.process = process;

var WD_CONNECT_TIMEOUT_MS_ = 120000;
var DEVTOOLS_CONNECT_TIMEOUT_MS_ = 10000;
var DETACH_TIMEOUT_MS_ = 2000;

/** Allow test access. */
exports.WAIT_AFTER_ONLOAD_MS = 10000;

var BLANK_PAGE_URL_ = 'data:text/html;charset=utf-8,';
var GHASTLY_ORANGE_ = '#DE640D';

// onDevToolsMessage_ log levels by message.method, defaults to 'debug'
var DEVTOOLS_METHOD_TO_LEVEL = {
  'Network.dataReceived': 'extra',
  'Network.loadingFinished': 'extra',
  'Network.requestServedFromCache': 'extra',
  'Network.requestServedFromMemoryCache': 'extra',
  'Network.requestWillBeSent': 'extra',
  'Network.responseReceived': 'extra',
  'Timeline.eventRecorded': 'extra',
  'Tracing.dataCollected': 'extra',
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
      this.agentErrror_ = this.agentError_ || (new Error('abort'));
      this.done_();
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
 * @param  {Object} args the IPC message with test run parameters:
 *   #param {string} runNumber run number.
 *   #param {string=} runTempDir a directory for run-specific temporary files.
 *   #param {boolean=} exitWhenDone
 *   #param {number=} timeout in milliseconds.
 *   #param {Object} flags:
 *     #param {string=} browser browser_* class name.
 *     #param ... other browser properties, chromedriver.
 *   #param {Object} task:
 *     #param {string=} browser Selenium browser name, defaults to Chrome.
 *     #param {string=} script webdriverjs script.
 *     #param {string=} url non-script url.
 *     #param ... other task properties, e.g. video.
 */
WebDriverServer.prototype.init = function(args) {
  'use strict';
  if (!this.browser_) {
    // Only set on the first run:
    //
    // Prevent WebDriver calls in onAfterDriverAction/Error from recursive
    // processing in these functions, if they call a WebDriver method.
    // Set it to true before calling a WebDriver method (e.g. takeScreenshot),
    // to false upon completion of that method.
    this.actionCbRecurseGuard_ = false;
    this.app_ = webdriver.promise.controlFlow();
    process_utils.injectWdAppLogging('wd_server', this.app_);
    // Create the browser with the given args.
    try {
      this.browser_ = browser_base.createBrowser(this.app_, args);
    } catch (e) {
      exports.process.send({cmd: 'error', e: e.message});
      throw e;
    }
    this.browser_ = browser_base.createBrowser(this.app_, args);
    this.capabilities_ = undefined;
    this.devTools_ = undefined;
    this.isCacheCleared_ = false;
    this.sandboxApp_ = undefined;
    this.uncaughtExceptionHandler_ = this.onUncaughtException_.bind(this);
    this.wdSandbox_ = undefined;
  }
  // Reset every run:
  this.isDone_ = false;
  this.abortTimer_ = undefined;
  this.agentError_ = undefined;
  this.devToolsMessages_ = [];
  this.driver_ = undefined;
  this.exitWhenDone_ = args.exitWhenDone;
  this.isRecordingDevTools_ = false;
  this.pageLoadDonePromise_ = undefined;
  this.pcapFile_ = undefined;
  this.runNumber_ = args.runNumber;
  this.isCacheWarm_ = args.isCacheWarm;
  this.screenshots_ = [];
  this.task_ = args.task;
  this.testError_ = undefined;
  this.testStartTime_ = undefined;
  this.timeoutTimer_ = undefined;
  this.timeout_ = args.timeout;
  this.traceCount_ = 0;
  this.traceFile_ = undefined;
  this.tracePromise_ = undefined;
  this.traceStream_ = undefined;
  this.videoFile_ = undefined;
  this.runTempDir_ = args.runTempDir || '';
  this.tearDown_();
};

/**
 * @param {string=} description debug title.
 * @param {Function} f the function to schedule.
 * @return {webdriver.promise.Promise} the scheduled promise.
 * @private
 */
WebDriverServer.prototype.scheduleNoFault_ = function(description, f) {
  'use strict';
  return this.app_.schedule(description, f).addErrback(function(e) {
    logger.error('Exception from "%s": %s', description, e);
    this.agentError_ = this.agentError_ || e.message;
  }.bind(this));
};

/**
 * Starts the WebDriver server and schedules a wait for it to be ready.
 *
 * @param {Object} browserCaps capabilities to be passed to Builder.build().
 * @private
 */
WebDriverServer.prototype.startWdServer_ = function(browserCaps) {
  'use strict';
  if (this.browser_.isRunning()) {
    throw new Error('Internal error: prior WD server running unexpectedly');
  }

  // Check for getCapabilities().webdriver? But then what -- exception anyway,
  // so the Browser's startWdServer may as well throw that exception.
  this.browser_.startWdServer(browserCaps);
  // The following needs to be scheduled() because getServerUrl() returns
  // the URL only after the startWdServer_() scheduled action finishes.
  this.app_.schedule('Wait for WD server to become ready', function() {
    var serverUrl = this.browser_.getServerUrl();
    logger.info('WD server URL: %s', serverUrl);
    return webdriver_http.util.waitForServer(serverUrl, WD_CONNECT_TIMEOUT_MS_)
        .then(function() {
      logger.info('WD server is ready');
    }.bind(this));
  }.bind(this));

  logger.debug('WD connect promise setup complete');
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
  this.connectDevTools_();
};

/**
 * connectDevTools_ attempts to create a new devtools instance and attempts to
 * connect it to the webdriver server.
 *
 * @private
 */
WebDriverServer.prototype.connectDevTools_ = function() {
  'use strict';
  this.app_.wait(function() {
    var connected = new webdriver.promise.Deferred();
    var devToolsUrl = this.browser_.getDevToolsUrl();
    if (devToolsUrl) {  // Browser exit resets the URL to undefined.
      var devTools = new devtools.DevTools(devToolsUrl);
      devTools.connect(function() {
        this.devTools_ = devTools;
        this.devTools_.onMessage(this.onDevToolsMessage_.bind(this));
        connected.fulfill(true);
      }.bind(this), function() {
        connected.fulfill(false);
      });
    } else {
      connected.fulfill(false);
    }
    return connected.promise;
  }.bind(this), DEVTOOLS_CONNECT_TIMEOUT_MS_, 'Connect DevTools');
  if (1 === this.task_.timeline || 1 === this.task_['Capture Video']) {
    var timelineStackDepth = (this.task_.timelineStackDepth ?
        parseInt(this.task_.timelineStackDepth, 10) : 0);
    this.timelineCommand_('start', {maxCallStackDepth: timelineStackDepth});
  }
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
      this.testError_ = this.testError_ || err.message;
      this.pageLoadDonePromise_.fulfill(false);
    } else {
      this.pageLoadDonePromise_.fulfill(true);
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
  if (this.driver_) {
    throw new Error('Internal error: DevTools callback called with WebDriver');
  }
  var level = DEVTOOLS_METHOD_TO_LEVEL[message.method] || 'debug';
  if (logger.isLogging(level)) {
    logger[level].apply(undefined, ['%sDevTools message: %s',
        (this.isRecordingDevTools_ ? '' : '#'), JSON.stringify(message)]);
  }
  if (message.method && 0 === message.method.indexOf('Tracing.')) {
    this.onTracingMessage_(message);
    return;  // Don't clutter the DevTools log with tracing events.
  }
  if (this.isRecordingDevTools_) {
    this.devToolsMessages_.push(message);
  }
  // If abortTimer_ is set, it means we received an 'Inspector.detached'
  // message, as noted below, so ignore messages until our abortTimer fires.
  if (!this.abortTimer_) {
    if ('Page.loadEventFired' === message.method) {
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
    }
    // We might be able to detect timeouts via Network.loadingFailed and
    // Page.frameStoppedLoading messages. For now we'll let our timeoutTimer
    // handle this.
  }
};

/**
 * @private
 */
WebDriverServer.prototype.onTestStarted_ = function() {
  'use strict';
  this.app_.schedule('Test started', function() {
    logger.info('Test started');
    this.testStartTime_ = Date.now();
  }.bind(this));
};

/**
 * Called by the sandboxed Builder after the user script calls build().
 *
 * @param {Object} driver the built driver instance (real one, not sandboxed).
 * #param {Object} browserCaps browser capabilities used to build the driver.
 * #param {Object} wdNamespace the sandboxed namespace, for app/promise sync.
 */
WebDriverServer.prototype.onDriverBuild = function(driver) {
  'use strict';
  logger.extra('WD post-build callback, driver=%s', driver);
  if (!this.driver_) {
    this.driver_ = driver;
    // The WebDriver server (chromedriver 2.x or ios-driver) is already
    // connected as the only DevTools client.
    // We will get the DevTools events via the "performance" log, and we
    // also cannot use DevTools, only WebDriver API via this.driver_.
    this.clearPageAndStartVideoWd_();
    this.scheduleStartPacketCaptureIfRequested_();
    this.scheduleStartTracingIfRequested_();
    this.onTestStarted_();
  } else if (this.driver_ !== driver) {
    throw new Error('Internal error: repeat onDriverBuild with wrong driver');
  }
};

/**
 * Save binary PNG screenshot data and register it in the test result.
 *
 * @param {string} fileName The filename to send in the test results.
 * @param {Buffer} screenshot binary PNG data.
 * @param {string=} description screenshot description.
 * @return {webdriver.promise.Promise} resolve(diskPath) of the written file.
 * @private
 */
WebDriverServer.prototype.saveScreenshot_ = function(
    fileName, screenshot, description) {
  'use strict';
  logger.debug('Saving screenshot %s (%d bytes): %s',
      fileName, screenshot.length, description);
  var diskPath = path.join(this.runTempDir_, fileName);
  return process_utils.scheduleFunction(this.app_,
      'Write screenshot file ' + diskPath,
      fs.writeFile, diskPath, screenshot).then(function() {
    return this.addScreenshot_(fileName, diskPath, description);
  }.bind(this));
};

/**
 * Registers an existing sreenshot file in the test result.
 *
 * @param {string} fileName filename to send in the test results.
 * @param {string} diskPath file path on disk.
 * @param {string=} description screenshot description.
 * @return {webdriver.promise.Promise} resolve(diskPath) of the written file.
 * @private
 */
WebDriverServer.prototype.addScreenshot_ = function(
    fileName, diskPath, description) {
  'use strict';
  logger.debug('Adding screenshot %s (%s): %s',
      fileName, diskPath, description);
  if (1 !== this.task_.pngScreenshot &&
       /\.png$/.test(fileName)) {  // Convert to JPEG.
    var fileNameJPEG = fileName.replace(/\.png$/i, '.jpg');
    var diskPathJPEG = diskPath.replace(/\.png$/i, '.jpg');
    var convertCommand = [diskPath];
    convertCommand.push('-resize', '50%');
    if (this.task_.rotate) {
      convertCommand.push('-rotate', this.task_.rotate);
    }
    // Force the screenshot JPEG quality level to be between 30 and 95.
    var imgQ = (this.task_.imageQuality ?
          parseInt(this.task_.imageQuality, 10) : 0);
    convertCommand.push('-quality', Math.min(Math.max(imgQ, 30), 95));
    convertCommand.push(diskPathJPEG);
    return process_utils.scheduleExec(
        this.app_, 'convert', convertCommand).then(function() {
      this.screenshots_.push({
          fileName: fileNameJPEG,
          diskPath: diskPathJPEG,
          contentType: 'image/jpeg',
          description: description
        });
      return diskPathJPEG;
    }.bind(this), function(e) {
      logger.warn('Converting %s PNG->JPEG failed, will use original PNG: %s',
          diskPath, e.message);
      this.screenshots_.push({
          fileName: fileName,
          diskPath: diskPath,
          contentType: 'image/png',
          description: description
        });
      return diskPath;
    }.bind(this));
  } else {
    var contentType = /\.png$/.test(fileName) ?
        'image/png' : 'application/octet-stream';
    this.screenshots_.push({
        fileName: fileName,
        diskPath: diskPath,
        contentType: contentType,
        description: description
      });
    return webdriver.promise.fulfilled(diskPath);
  }
};

/**
 * Capture and save a screenshot.
 *
 * @param {string} fileNameNoExt filename without the '.png' suffix.
 * @param {string=} description screenshot description.
 * @return {webdriver.promise.Promise} resolve(diskPath) of the written file.
 * @private
 */
WebDriverServer.prototype.takeScreenshot_ = function(
    fileNameNoExt, description) {
  'use strict';
  return this.getCapabilities_().then(function(caps) {
    // Screenshots implemented by the browser class are better than DevTools.
    if (caps.takeScreenshot) {
      logger.extra('Browser supports screenshots, yay');
      return this.browser_.scheduleTakeScreenshot(fileNameNoExt).then(
          function(diskPath) {
        if (!diskPath) {
          throw new Error('Unable to take browser screenshot');
        }
        return this.addScreenshot_(fileNameNoExt + path.extname(diskPath),
            diskPath, description);
      }.bind(this));
    }
    // DevTools screenshots were introduced in Chrome 26:
    //   http://trac.webkit.org/changeset/138236
    //   /trunk/Source/WebCore/inspector/Inspector.json
    if (this.devTools_ && caps['wkrdp.Page.captureScreenshot']) {
      return this.pageCommand_('captureScreenshot').then(function(result) {
        if (!result.data) {
          throw new Error('Unable to take devtools screenshot');
        }
        return this.saveScreenshot_(
            fileNameNoExt + '.png',
            new Buffer(result.data, 'base64'),
            description);
      }.bind(this));
    }
    if (this.driver_) {
      return this.driver_.takeScreenshot().then(function(screenshot) {
        if (!screenshot) {
          throw new Error('Unable to take driver screenshot');
        }
        return this.saveScreenshot_(
            fileNameNoExt + '.png',
            new Buffer(screenshot, 'base64'),
            description);
      }.bind(this));
    }
    throw new Error('Unable to take screenshot');
  }.bind(this));
};

/**
 * Called by the sandboxed driver before each command.
 *
 * @param {string} command WebDriver command name.
 * @param {Object} commandArgs array of command arguments.
 */
WebDriverServer.prototype.onBeforeDriverAction = function(
    command, commandArgs) {
  'use strict';
  logger.debug('Sending %s', commandArgs[1]);
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
 * #param {Object} result command result.
 */
WebDriverServer.prototype.onAfterDriverAction = function(command, commandArgs) {
  'use strict';
  var commandStr = commandArgs[1];
  logger.extra('Injected after command: %s', commandStr);
  if (command.getName() === webdriver.command.CommandName.QUIT) {
    this.driver_ = undefined;
    return;  // Cannot do anything after quitting the browser.
  }
  if (this.actionCbRecurseGuard_) {
    logger.extra('Recursion guard: after');
    return;
  }
  if (!this.testStartTime_ || this.isDone_) {  // Screenshots only in a test.
    return;
  }
  this.app_.schedule('After WD action', function() {
    this.actionCbRecurseGuard_ = true;
    // In lieu of 'finally': reset actionCbRecurseGuard_.
  }.bind(this)).then(function(ret) {
    this.actionCbRecurseGuard_ = false;
    return ret;
  }.bind(this), function(e) {
    this.actionCbRecurseGuard_ = false;
    throw e;
  }.bind(this));
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
 * @return {webdriver.promise.Promise} resolve() for addBoth.
 * @private
 */
WebDriverServer.prototype.runTest_ = function(browserCaps) {
  'use strict';
  return this.scheduleNoFault_('Run test', function() {
    if (this.task_.script) {
      this.runSandboxedSession_(browserCaps);
    } else {
      this.runPageLoad_(browserCaps);
    }
  }.bind(this));
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
 * @param {Object} params command options.
 * @return {webdriver.promise.Promise} resolve({string} responseBody).
 * @private
 */
WebDriverServer.prototype.timelineCommand_ = function(method, params) {
  'use strict';
  var message = {method: 'Timeline.' + method};
  if (params) {
    message.params = params;
  }
  return this.devToolsCommand_(message);
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
      html: color ? '<body style="background-color:' + color + ';"/>' : ''
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
    done.fulfill(this.capabilities_);
    return done;
  }
  return this.browser_.scheduleGetCapabilities().then(function(caps) {
    this.capabilities_ = caps;
    return caps;
  }.bind(this));
};

/**
 * Blanks out the browser at the beginning of a test, using DevTools.
 *
 * @private
 */
WebDriverServer.prototype.clearPageAndStartVideoDevTools_ = function() {
  'use strict';
  this.getCapabilities_().then(function(caps) {
    if (!this.isCacheCleared_ && !this.isCacheWarm_) {
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
  this.pageCommand_('navigate', {url: BLANK_PAGE_URL_});
  this.app_.timeout(500, 'Load blank startup page');
  this.networkCommand_('enable');
  this.pageCommand_('enable');
  if (1 === this.task_['Capture Video']) {  // Emit video sync, start recording
    this.getCapabilities_().then(function(caps) {
      if (!caps.videoRecording) {
        return;
      }
      // Get the root frameId
      this.pageCommand_('getResourceTree').then(function(result) {
        var frameId = result.frameTree.frame.id;
        // Hold orange(500ms)->white: anchor video to DevTools.
        this.setPageBackground_(frameId, GHASTLY_ORANGE_);
        this.app_.timeout(500, 'Set orange background');
        this.scheduleStartVideoRecording_();
        // Begin recording DevTools before onTestStarted_ fires,
        // to make sure we get the paint event from the below switch to white.
        // This allows us to sync the DevTools trace vs. the video by matching
        // the first DevTools paint event timestamp to the video frame where
        // the background changed from non-white to white.
        this.app_.schedule('Start recording DevTools with video', function() {
          this.isRecordingDevTools_ = true;
        }.bind(this));
        this.app_.timeout(500, 'Hold orange background');
        this.setPageBackground_(frameId);  // White
      }.bind(this));
    }.bind(this));
  }
  // Make sure we start recording DevTools regardless of the video.
  this.app_.schedule('Start recording DevTools', function() {
    this.isRecordingDevTools_ = true;
  }.bind(this));
};

/**
 * Blanks out the browser at the beginning of a test via WebDriver API.
 *
 * @private
 */
WebDriverServer.prototype.clearPageAndStartVideoWd_ = function() {
  'use strict';
  // Navigate to a blank, to make sure we clear the prior page and cancel
  // all pending events.
  this.driver_.get(BLANK_PAGE_URL_ + '<body/>');
  if (1 === this.task_['Capture Video']) {  // Emit video sync, start recording
    this.getCapabilities_().then(function(caps) {
      if (!caps.videoRecording) {
        return;
      }
      // Hold ghastly orange(500ms)->white: anchor video to DevTools.
      this.driver_.executeScript(
        'document.body.style.backgroundColor="' + GHASTLY_ORANGE_ + '";');
      this.app_.timeout(500, 'Set orange background');
      this.scheduleStartVideoRecording_();
      this.app_.timeout(500, 'Hold orange background');
      this.driver_.executeScript(
          'document.body.style.backgroundColor="white";');
    }.bind(this));
  }
};

/**
 * Starts browser tracing if it was requested, sets the tracing file.
 * @private
 */
WebDriverServer.prototype.scheduleStartTracingIfRequested_ = function() {
  'use strict';
  // TODO(wrightt): add browser-specific & WD-friendly impls.
  if (1 === this.task_.trace && !this.driver_) {
    // There's example tracing code that tries to determine if tracing is
    // supported by sending 'Tracing.hasCompleted' and asserting that the
    // browser returns an 'error'.  However, we've found that most browsers
    // (tracing-enabled- or not) respond with the same "unknown command" error.
    var traceFile = path.join(this.runTempDir_, 'trace.json');
    process_utils.scheduleOpenStream(this.app_, traceFile).then(
        function(stream) {
      // As noted in onTracingMessage_, we don't wait for the flush/drain.
      stream.write('{"traceEvents": [', 'utf8');
      this.traceFile_ = traceFile;
      this.tracePromise_ = new webdriver.promise.Deferred();
      this.traceStream_ = stream;
    }.bind(this));
    var message = {method: 'Tracing.start'};
    // Must set all param values, pending crrev/665123008.
    message.params = {
      categories: this.task_.traceCategories || 'webkit,blink,benchmark',
      options: 'record-until-full'
    };
    this.devToolsCommand_(message).then(function() {
      logger.debug('Started tracing to ' + traceFile);
    }, function(e) {
      // Might be crbug/392577, which affects Chrome 36.0.1967 - 37.0.2000.
      this.testError_ = 'Tracing is not supported.';
      this.traceFile_ = undefined;
      this.tracePromise_ = undefined;
      this.traceStream_ = undefined;
      throw e;
    }.bind(this));
  }
};

/**
 * @param {Object} message DevTools message:
 *    #param {string} method e.g. 'Tracing.dataCollected'.
 * @private
 */
WebDriverServer.prototype.onTracingMessage_ = function(message) {
  'use strict';
  if ('Tracing.dataCollected' === message.method && this.traceStream_) {
    var value = (message.params || {}).value;
    if (value instanceof Array) {
      value.forEach(function(item) {
        var data = JSON.stringify(item);
        // We don't want to block our caller, so don't wait for a 'drain' event
        // if "write" returns false; instead, let the stream buffer handle this.
        if (this.traceCount_ > 0) {
          this.traceStream_.write(',', 'utf8');
        }
        this.traceStream_.write(data, 'utf8');
        this.traceCount_ += 1;
      }.bind(this));
    }
  } else if ('Tracing.tracingComplete' === message.method &&
      this.tracePromise_ && this.tracePromise_.isPending()) {
    this.tracePromise_.fulfill();
  }
};

/**
 * Stops browser tracing.
 * @private
 */
WebDriverServer.prototype.scheduleStopTracing_ = function() {
  'use strict';
  if (1 === this.task_.trace) {
    this.app_.schedule('Wait for tracingComplete', function() {
      if (this.tracePromise_ && this.tracePromise_.isPending()) {
        this.devToolsCommand_({method: 'Tracing.end'});
        return this.tracePromise_;
      } else {
        return undefined;
      }
    }.bind(this));
    this.app_.schedule('Close tracing stream', function() {
      if (!this.traceStream_) {
        return undefined;
      } else {
        var stream = this.traceStream_;
        this.traceStream_ = undefined;
        // Ideally we'd simply do:
        //   return scheduleCloseStream(..., ']}', 'utf8');
        // but, in practice, the stream never writes this ']}' or invokes our
        // "finished" callback.  Instead, we'll simply write and flush our ']}'.
        var done = new webdriver.promise.Deferred();
        stream.write(']}', 'utf8', function() {
          logger.debug('Stopped tracing to ' + this.traceFile_);
          process_utils.scheduleCloseStream(this.app_, stream).addErrback(
              function(e) {
            logger.debug('Ignoring close error: ' + e.message);
          });  // Don't wait for close; we've already flushed.
          done.fulfill();
        }.bind(this));
        return done.promise;
      }
    }.bind(this));
  }
};

/**
 * Starts video recording, sets the video file, registers video stop handler.
 * @private
 */
WebDriverServer.prototype.scheduleStartVideoRecording_ = function() {
  'use strict';
  this.getCapabilities_().then(function(caps) {
    var videoFileExtension = caps.videoFileExtension || 'avi';
    var videoFile = path.join(this.runTempDir_, 'video.' + videoFileExtension);
    this.browser_.scheduleStartVideoRecording(
        videoFile, this.onVideoRecordingExit_.bind(this));
    this.app_.schedule('Video record started', function() {
      logger.debug('Video record start succeeded');
      this.videoFile_ = videoFile;
    }.bind(this));
  }.bind(this));
};

/**
 * Starts packet capture if it was requested, sets the pcap file.
 * @private
 */
WebDriverServer.prototype.scheduleStartPacketCaptureIfRequested_ = function() {
  'use strict';
  if (1 === this.task_.tcpdump) {
    var pcapFile = path.join(this.runTempDir_, 'tcpdump.pcap');
    this.browser_.scheduleStartPacketCapture(pcapFile);
    this.app_.schedule('Packet capture started', function() {
      logger.debug('Packet capture start succeeded');
      this.pcapFile_ = pcapFile;
    }.bind(this));
  }
};

/**
 * @param {Object} browserCaps browser capabilities used to build the driver.
 * @private
 */
WebDriverServer.prototype.runPageLoad_ = function(browserCaps) {
  'use strict';
  if (!this.devTools_) {
    this.startChrome_(browserCaps);
  }
  this.clearPageAndStartVideoDevTools_();
  this.scheduleStartPacketCaptureIfRequested_();
  this.scheduleStartTracingIfRequested_();
  // No page load timeout here -- agent_main enforces run-level timeout.
  this.app_.schedule('Run page load', function() {
    // onDevToolsMessage_ resolves this promise when it detects on-load.
    this.pageLoadDonePromise_ = new webdriver.promise.Deferred();
    if (this.timeout_) {
      var coalesceMillis = (undefined === this.task_.waitAfterOnload ?
          exports.WAIT_AFTER_ONLOAD_MS :
          (1000 * Math.floor(parseFloat(this.task_.waitAfterOnload, 10))));
      this.timeoutTimer_ = global.setTimeout(
          this.onPageLoad_.bind(this, new Error('Page load timeout')),
          this.timeout_ - coalesceMillis);
    }
    this.onTestStarted_();
    this.pageCommand_('navigate', {url: this.task_.url});
    return this.pageLoadDonePromise_.promise;
  }.bind(this));
  this.waitForCoalesce_(this.app_);
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
    this.waitForCoalesce_(this.sandboxApp_);
  } else {
    this.startWdServer_(browserCaps);
    // The following needs to be scheduled() because getServerUrl() returns
    // the URL only after the startWdServer_() scheduled action finishes.
    this.app_.schedule('Sandbox WD namespace and run the script', function() {
      wd_sandbox.createSandboxedWdNamespace(
          this.browser_.getServerUrl(), browserCaps, this).then(
              function(wdSandbox) {
        this.wdSandbox_ = wdSandbox;
        this.sandboxApp_ = wdSandbox.promise.controlFlow();
        this.sandboxApp_.on(
            wdSandbox.promise.ControlFlow.EventType.IDLE, function() {
          logger.debug('The sandbox control flow has gone idle, history: %j',
              this.sandboxApp_.getHistory());
        }.bind(this));
        // Bring it!
        this.runScript_(wdSandbox);
        this.waitForCoalesce_.bind(this.sandboxApp_);
      }.bind(this));
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
  var browserCaps = {};
  browserCaps[webdriver.Capability.BROWSER_NAME] = (this.task_.browser ?
      this.task_.browser.toLowerCase() : webdriver.Browser.CHROME);
  var loggingPrefs = {};
  loggingPrefs[webdriver.logging.Type.PERFORMANCE] =
      webdriver.logging.LevelName.ALL;  // DevTools Page, Network, Timeline.
  browserCaps[webdriver.Capability.LOGGING_PREFS] = loggingPrefs;

  this.app_.on(webdriver.promise.ControlFlow.EventType.UNCAUGHT_EXCEPTION,
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
  process.on('uncaughtException', function(e) {
    // Likely from a background function that's not ControlFlow-scheduled.
    // Immediately unwind the app's scheduled functions, as if the currently
    // function task threw this exception.
    logger.error('Top-level process uncaught exception: %s', e.message);
    var promise = new webdriver.promise.Deferred(undefined, this.app_);
    promise.reject(e);  // Like throw, only in the ControlFlow.
  }.bind(this));
  // When IDLE is emitted, the app no longer runs an event loop.
  this.app_.on(webdriver.promise.ControlFlow.EventType.IDLE, function() {
    logger.debug('The main control flow has gone idle, history: %j',
        this.app_.getHistory());
  }.bind(this));

  this.runTest_(browserCaps).addBoth(this.done_.bind(this));
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
    vm.runInNewContext(this.task_.script, sandbox, 'WPT_Job_Script');
    logger.info('User script returned, but not necessarily finished');
  }.bind(this)).addErrback(function(e) {
    logger.error('Script failed: ' + e.message);
    this.testError_ = this.testError_ || e.message;
  }.bind(this));
};

/**
 * Schedules a wait to allow extra time for post-onLoad activities to finish.
 *
 * @param {Object} app the context in which to set the timeout.
 * @private
 */
WebDriverServer.prototype.waitForCoalesce_ = function(app) {
  'use strict';
  var coalesceMillis = (undefined === this.task_.waitAfterOnload ?
      exports.WAIT_AFTER_ONLOAD_MS :
      (1000 * Math.floor(parseFloat(this.task_.waitAfterOnload, 10))));
  var minMillis = (undefined === this.task_.time ? 0 :
      (1000 * Math.floor(parseFloat(this.task_.time, 10))));
  this.app_.schedule('Wait for browser', function() {
    var currMillis = Math.floor(Date.now() - this.testStartTime_);
    var waitMillis = Math.max(coalesceMillis, (minMillis - currMillis));
    if (waitMillis > 0) {
      logger.info('Test finished, waiting for browser to coalesce');
      app.timeout(waitMillis, 'Waiting for browser to coalesce');
    }
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
  this.isRecordingDevTools_ = false;
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
 * Gets DevTools messages from the WebDriver PERFORMANCE log type.
 * @private
 */
WebDriverServer.prototype.scheduleGetWdDevToolsLog_ = function() {
  'use strict';
  if (this.devToolsMessages_.length > 0) {  // Must be empty at this point.
    throw new Error(
        'Internal error: DevTools messages were collected for WebDriver: ' +
            this.devToolsMessages_);
  }
  this.driver_.getSession().then(function(session) {
    if (session) {  // If there is no session, logs().get throws an exception.
      this.driver_.manage().logs().get(webdriver.logging.Type.PERFORMANCE)
          .then(function(log) {
        if (!log) {
          throw new Error('Unexpectedly empty WebDriver PERFORMANCE log');
        }
        // Return just the first WebView's DevTools events.
        // Additional WebViews may confuse WebPageTest, ignore them for now.
        var firstWebViewId;
        firstWebViewId = undefined;  // Guaranteed assignment, just for lint:)
        this.devToolsMessages_ = log.reduce(function(messages, entry, index) {
          var wdLoggingMessage;
          try {
            wdLoggingMessage = JSON.parse(entry.message);
          } catch (e) {
            logger.warn('WebDriver Logging entry #%d message is not JSON text',
                index);
            return messages;
          }
          if (!wdLoggingMessage.webview || !wdLoggingMessage.message) {
            logger.warn('WebDriver Logging entry #%d message does not have ' +
                'webdriver or message properties', index);
            return messages;
          }
          if (!firstWebViewId) {
            firstWebViewId = wdLoggingMessage.webview;
          }
          if (firstWebViewId === wdLoggingMessage.webview) {
            messages.push(wdLoggingMessage.message);
          }
          return messages;
        }.bind(this), []);  // Initial messages is [].
        logger.extra('Captured %d DevTools messages for WebView %s',
            this.devToolsMessages_.length, firstWebViewId);
      }.bind(this));
    }
  }.bind(this));
};

/**
 * @private
 */
WebDriverServer.prototype.done_ = function() {
  'use strict';
  this.scheduleNoFault_('Done', function() {
    if (this.isDone_) {
      // Our "done_" can be called multiple times, e.g. if we're finishing a
      // successful run but agent_main races to 'abort' us (vs our 'done' IPC).
      return;
    }
    this.isDone_ = true;

    if (this.testError_) {
      logger.error('Test failed: ' + this.testError_);
    } else {
      logger.info('Test passed');
    }
    this.scheduleStopTracing_();
    if (this.driver_) {
      this.scheduleNoFault_('Get WD Log',
          this.scheduleGetWdDevToolsLog_.bind(this));
    }
    this.takeScreenshot_('screen', 'end of run').then(
        function(diskPath) {
      this.scheduleNoFault_('Check screenshot', function() {
        process_utils.scheduleExec(this.app_,
            'identify', ['-verbose', diskPath]).then(function(stdout) {
          if ((/[\r\n]\s*Colors:\s+1\s*[\r\n]/).test(stdout)) {
            throw new Error('Screen is blank');
          }
        }, function(err) {
          logger.info('Ignoring identify error: ' + err.message);
        });
      }.bind(this));
    }.bind(this), function(err) {
      logger.info('Ignoring screenshot error: ' + err.message);
    });
    if (this.videoFile_) {
      this.scheduleNoFault_('Stop video recording',
          this.browser_.scheduleStopVideoRecording.bind(this.browser_));
    }
    if (this.pcapFile_) {
      this.scheduleNoFault_('Stop packet capture',
          this.browser_.scheduleStopPacketCapture.bind(this.browser_));
    }
    this.scheduleNoFault_('Send IPC', function() {
      exports.process.send({
          cmd: (this.testError_ ? 'error' : 'done'),
          testError: this.testError_,
          agentError: this.agentError_,
          devToolsMessages: this.devToolsMessages_,
          screenshots: this.screenshots_,
          traceFile: this.traceFile_,
          videoFile: this.videoFile_,
          pcapFile: this.pcapFile_
        });
    }.bind(this));

    // For non-webdriver tests we want to stop the browser after every run
    // (including between first and repeat view).
    if (this.testError_ || this.exitWhenDone_ || !this.driver_) {
      this.scheduleStop();
    }
    if (this.testError_ || this.exitWhenDone_) {
      // Disconnect parent IPC to exit gracefully without a process.exit() call.
      // This should be the last source of event queue events.
      this.app_.schedule('Disconnect IPC',
        exports.process.disconnect.bind(process));
    }
    this.scheduleNoFault_('Tear down', this.tearDown_.bind(this));
  }.bind(this));
};

/**
 * @param {Error=} e video error if the recording failed.
 * @private
 */
WebDriverServer.prototype.onVideoRecordingExit_ = function(e) {
  'use strict';
  if (e) {
    logger.error('Video recording failed:\n' + e.stack);
    this.agentError_ = this.agentError_ || e.message;
    // Could call this.done_();
  }
};

/**
 * @param {Error=} e uncaught error.
 * @private
 */
WebDriverServer.prototype.onUncaughtException_ = function(e) {
  'use strict';
  if (!e) {
    e = new Error('unknown');
  }
  logger.critical('Uncaught exception: %s', e.stack);
  this.agentError_ = e.message;
  this.done_();
};

/**
 * Cleans up after a job.
 *
 * First it asks the webdriver server to kill the driver.
 * After that it tries to kill the webdriver server itself.
 */
WebDriverServer.prototype.scheduleStop = function() {
  'use strict';
  this.scheduleNoFault_('Stop', function() {
    exports.process.removeListener('uncaughtException',
        this.uncaughtExceptionHandler_);

    // onAfterDriverAction resets this.driver_ and this.testStartTime_.
    if (this.driver_) {
      this.driver_.quit();
    }

    // Kill the browser.
    if (this.browser_) {
      this.browser_.kill();
      this.browser_ = undefined;
      this.devTools_ = undefined;
    }
  }.bind(this));
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
