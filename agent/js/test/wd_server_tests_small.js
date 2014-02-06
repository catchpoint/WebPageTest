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

var browser_local_chrome = require('browser_local_chrome');
var devtools = require('devtools');
var events = require('events');
var fs = require('fs');
var logger = require('logger');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var util = require('util');
var wd_sandbox = require('wd_sandbox');
var wd_server = require('wd_server');
var webdriver = require('selenium-webdriver');
var webdriver_http = require('selenium-webdriver/http');


function FakeWebSocket(url) {
  'use strict';
  logger.debug('Creating fake WebSocket: %s', url);
  this.commands = [];
  global.setTimeout(function() {
    this.emit('open');
  }.bind(this), 10);
}
util.inherits(FakeWebSocket, events.EventEmitter);

/**
 * @param {string} messageStr
 */
FakeWebSocket.prototype.send = function(messageStr) {
  'use strict';
  logger.debug('Sending message: %s', messageStr);
  var message = JSON.parse(messageStr);
  this.commands.push(message.method);
  if ('Page.getResourceTree' === message.method) {
    message.result = {frameTree: {frame: {id: 'test-frame-id'}}};
  } else {
    message.result = {data: 'gaga'};
  }
  logger.debug('Emitting response message: %j', message);
  this.emit('message', JSON.stringify(message), {});
};

/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('wd_server small', function() {
  'use strict';

  var sandbox;
  var app;
  var wds;
  var writeFileStub;
  var spawnStub;

  // Set to a small number of WD event loop ticks to reduce no-op ticks.
  wd_server.WAIT_AFTER_ONLOAD_MS =
      webdriver.promise.ControlFlow.EVENT_LOOP_FREQUENCY * 2;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    test_utils.fakeTimers(sandbox);
    // Re-create stub process for each test to avoid accumulating listeners.
    wd_server.process = new events.EventEmitter();
    wd_server.process.send = function() {};
    wd_server.process.disconnect = function() {};

    // For saveScreenshot.
    writeFileStub = sandbox.stub(fs, 'writeFile',
        function(path, data, cb) { cb(); });

    // PNG->JPEG conversion runs a command.
    spawnStub = test_utils.stubOutProcessSpawn(sandbox);

    // Create a new ControlFlow for each test.
    app = new webdriver.promise.ControlFlow();
    webdriver.promise.setDefaultFlow(app);
    process_utils.injectWdAppLogging('wd_server', app);

    wd_server.WebDriverServer.instance_ = undefined;  // Force creation.
    wds = wd_server.WebDriverServer.getInstance();
    wds.initIpc();  // Event listener on the fake process.
  });

  afterEach(function() {
    // Call unfakeTimers before verifyAndRestore, which may throw.
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
    wd_server.process = process;
  });

  before(function() {
    // Needed because in the local context process has no send method
    process.send = function(/*m, args*/) {};
  });

  function stubBrowserLauncher(startCb, killCb) {
    var startWdServerStub = sandbox.stub(
        browser_local_chrome.BrowserLocalChrome.prototype, 'startWdServer',
        function() {
      this.serverUrl_ = 'http://localhost:4444';
      this.devToolsUrl_ = undefined;
      this.childProcess_ = 'process';
      if (startCb) {
        startCb(this);
      }
    });
    var startChromeStub = sandbox.stub(
        browser_local_chrome.BrowserLocalChrome.prototype, 'startBrowser',
        function() {
      this.serverUrl_ = undefined;
      this.devToolsUrl_ = 'http://localhost:1234/json';
      this.childProcess_ = 'process';
      if (startCb) {
        startCb(this);
      }
    });
    var killStub = sandbox.stub(
        browser_local_chrome.BrowserLocalChrome.prototype, 'kill', function() {
      if (killCb) {
        killCb(this);
      }
      this.serverUrl_ = undefined;
      this.devToolsUrl_ = undefined;
      this.childProcess_ = undefined;
    });
    return {
        startWdServerStub: startWdServerStub,
        startChromeStub: startChromeStub,
        killStub: killStub
      };
  }

  function stubServerReadyHttp() {
    return sandbox.stub(webdriver_http.util, 'waitForServer',
        function(url/*, timeout*/) {
      should.equal('http://localhost:4444', url);
      return webdriver.promise.fulfilled();
    });
  }

  it('should work overall with WD - start, run, stop', function() {
    // This is a long test that does a full run twice. It goes like this:
    // * General stubs/fakes/spies.
    // * Run 1 -- exitWhenDone=false.
    // * Verify after run 1, make sure we didn't quit/stop WD.
    // * Run 2 -- exitWhenDone=true.
    // * Verify after run 2, make sure we did quit+stop WD.
    //
    // We do this as a single test, because the WebDriverServer state after
    // the first run is crucial for the second run, and because some of the
    // stubs/spies remain the same from the first run into the second run.

    // * General stubs/fakes/spies.
    var chromedriver = '/gaga/chromedriver';

    // Stub out spawning chromedriver, verify at the end.
    var isFirstRun = true;
    var launcherStubs = stubBrowserLauncher(function() {
      should.ok(isFirstRun);  // Only spawn WD on first run.
    });
    var startWdServerStub = launcherStubs.startWdServerStub;
    var killStub = launcherStubs.killStub;
    // Stub out IPC, verify at the end.
    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');

    stubServerReadyHttp();

    // Fake a WebDriver instance, stub Builder.build() to return it.
    var driverExecuteScriptSpy = sinon.spy();
    var driverGetSpy = sinon.spy();
    var driverQuitSpy = sinon.spy();
    var logsGetMock = sandbox.stub();
    var fakeDriver = {
      getSession: function() {
        return webdriver.promise.fullyResolved('fake session');
      },
      executeScript: function(script) {
        return app.schedule('Fake WebDriver.executeScript(' + script + ')',
            driverExecuteScriptSpy.bind(fakeDriver, script));
      },
      get: function(url) {
        return app.schedule('Fake WebDriver.get(' + url + ')',
            driverGetSpy.bind(fakeDriver, url));
      },
      manage: function() {
        return {
          logs: function() {
            return {
              get: function(type) {
                return app.schedule('Fake WebDriver.Logs.get(' + type + ')',
                    logsGetMock.bind(logsGetMock, type));
              }
            };
          }
        };
      },
      takeScreenshot: function() {
        return app.schedule('Fake WebDriver.takeScreenshot()', function() {
          return 'Z2FnYQ==';  // Base64 for 'gaga'.
        }.bind(fakeDriver));
      },
      quit: function() {
        return app.schedule('Fake WebDriver.quit()',
            driverQuitSpy.bind(fakeDriver));
      }
    };
    var wdBuildStub = sandbox.stub(webdriver.Builder.prototype, 'build',
        function() {
      logger.debug('Stub Builder.build() called');
      return fakeDriver;
    });

    // Simulate Chrome generating profiling messages as the page loads.
    var pageMessage = {method: 'Page.gaga'};
    var networkMessage = {method: 'Network.ulala'};
    var timelineMessage = {method: 'Timeline.tutu'};
    function wdLogEntryFromMessage(devToolsMessage) {
      return {
          level: 'INFO',
          timestamp: 123,
          message: JSON.stringify({webview: 'gaga', message: devToolsMessage})
        };
    }
    logsGetMock.withArgs('performance').returns([
        wdLogEntryFromMessage(pageMessage),
        wdLogEntryFromMessage(networkMessage),
        wdLogEntryFromMessage(timelineMessage)
      ]);

    var idleSpy = sandbox.spy();
    app.on(webdriver.promise.ControlFlow.EventType.IDLE, idleSpy);

    // * Run 1 -- exitWhenDone=false.
    logger.debug('First run of WD server');
    wd_server.process.emit('message', {
        cmd: 'run',
        exitWhenDone: false,
        filePrefix: '1_Cached_',
        chromedriver: chromedriver,
        script: 'new webdriver.Builder().build();'
      });
    test_utils.tickUntilIdle(app, sandbox, 500);

    // * Verify after run 1, make sure we didn't quit/stop WD.
    // Should spawn the chromedriver process on port 4444.
    should.ok(startWdServerStub.calledOnce);
    should.equal('chrome', startWdServerStub.firstCall.args[0].browserName);

    should.ok(wdBuildStub.calledOnce);
    should.ok(sendStub.calledOnce);
    var doneIpcMsg = sendStub.firstCall.args[0];
    should.equal(doneIpcMsg.cmd, 'done');
    [pageMessage, networkMessage, timelineMessage].should.eql(
        doneIpcMsg.devToolsMessages);
    ['screen.jpg'].should.eql(
        doneIpcMsg.screenshots.map(function(s) { return s.fileName; }));
    should.equal(1, writeFileStub.callCount);

    // We are not supposed to clean up on the first run.
    should.ok(driverQuitSpy.notCalled);
    should.ok(killStub.notCalled);
    should.ok(disconnectStub.notCalled);

    // * Run 2 -- exitWhenDone=true.
    logger.debug('Second run of WD server');
    logsGetMock.withArgs('performance').returns([
        wdLogEntryFromMessage(networkMessage)
      ]);
    wd_server.process.emit('message', {
        cmd: 'run',
        exitWhenDone: true,
        filePrefix: '1_Cached_',
        pngScreenShot: true,
        chromedriver: chromedriver,
        script: 'new webdriver.Builder().build();'
      });
    test_utils.tickUntilIdle(app, sandbox);

    // * Verify after run 2, make sure we did quit+stop WD.
    // Make sure we did not spawn the WD server etc. for the second time.
    should.ok(startWdServerStub.calledOnce);
    should.ok(wdBuildStub.calledOnce);

    // These things get called for the second time on the second run.
    should.ok(sendStub.calledTwice);
    doneIpcMsg = sendStub.secondCall.args[0];
    should.equal(doneIpcMsg.cmd, 'done');
    [networkMessage].should.eql(doneIpcMsg.devToolsMessages);
    ['screen.png'].should.eql(
        doneIpcMsg.screenshots.map(function(s) { return s.fileName; }));
    should.equal(2, writeFileStub.callCount);

    // The cleanup occurs only on the second run.
    should.ok(driverQuitSpy.calledOnce);
    should.ok(killStub.calledOnce);
    should.ok(disconnectStub.calledOnce);
  });

  it('should work overall with Chrome - start, run, stop', function() {
    // This is a long test that does a full run twice. It goes like this:
    // * General stubs/fakes/spies.
    // * Run 1 -- exitWhenDone=false.
    // * Verify after run 1, make sure we didn't quit/stop WD.
    // * Run 2 -- exitWhenDone=true.
    // * Verify after run 2, make sure we did quit+stop WD.
    //
    // We do this as a single test, because the WebDriverServer state after
    // the first run is crucial for the second run, and because some of the
    // stubs/spies remain the same from the first run into the second run.

    // * General stubs/fakes/spies.
    var chromedriver = '/gaga/chromedriver';

    // Stub out spawning chromedriver, verify at the end.
    var isFirstRun = true;
    var launcherStubs = stubBrowserLauncher(function() {
      should.ok(isFirstRun);  // Only spawn WD on first run.
    });
    var startChromeStub = launcherStubs.startChromeStub;
    var killStub = launcherStubs.killStub;
    // Stub out IPC, verify at the end.
    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');

    // Connect DevTools.
    test_utils.stubHttpGet(sandbox, /^http:\/\/localhost:\d+\/json$/,
        '[{"webSocketDebuggerUrl": "ws://gaga"}]');
    var stubWebSocket = sandbox.stub(devtools, 'WebSocket', FakeWebSocket);

    var idleSpy = sandbox.spy();
    app.on(webdriver.promise.ControlFlow.EventType.IDLE, idleSpy);

    // * Run 1 -- exitWhenDone=false.
    logger.debug('First run of WD server');
    wd_server.process.emit('message', {
        cmd: 'run',
        exitWhenDone: false,
        filePrefix: '1_Cached_',
        chromedriver: chromedriver,
        url: 'http://gaga.com/ulala',
        captureTimeline: true
      });
    // Do not use tickUntilIdle -- it will fail, because we actually stall
    // on the DevTools WebSocket connection, and we want to inject a bunch
    // of stuff before proceeding.
    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS +
        webdriver.promise.ControlFlow.EVENT_LOOP_FREQUENCY * 10);
    var fakeWs = stubWebSocket.firstCall.thisValue;  // The DevTools WebSocket.

    // Simulate Chrome generating profiling messages as the page loads.
    var pageMessage = {method: 'Page.gaga'};
    var networkMessage = {method: 'Network.ulala'};
    var timelineMessage = {method: 'Timeline.tutu'};
    var pageLoadedMessage = {method: 'Page.loadEventFired'};
    // Verify that messages get ignored before the page load starts
    fakeWs.emit('message', JSON.stringify(networkMessage), {});

    // Emit DevTools events after the test has started -- Page.navigate fired.
    function onPageNavigate(message) {
      if (/"method"\s*:\s*"Page.navigate"/.test(message)) {
        var m = message.match(/"url":"([^"]+)"/);
        var url = (m ? m[1] : '');
        if ('http://gaga.com/ulala' === url) {
          fakeWs.removeListener('message', onPageNavigate);  // Fire only once.
          fakeWs.emit('message', JSON.stringify(pageMessage), {});
          fakeWs.emit('message', JSON.stringify(networkMessage), {});
          fakeWs.emit('message', JSON.stringify(timelineMessage), {});
          fakeWs.emit('message', JSON.stringify(pageLoadedMessage), {});
        } else {
          url.should.match(/^data:text/); // ignore blank
        }
      }
    }
    fakeWs.on('message', onPageNavigate);
    test_utils.tickUntilIdle(app, sandbox);

    // * Verify after run 1, make sure we didn't quit/stop Chrome.
    should.ok(startChromeStub.calledOnce);
    should.equal('chrome', startChromeStub.firstCall.args[0].browserName);

    should.ok(stubWebSocket.calledOnce);
    should.ok('ws://gaga', stubWebSocket.firstCall.args[0]);
    [
        'Network.enable',
        'Page.enable',
        'Timeline.start',
        'Network.clearBrowserCache',
        'Network.clearBrowserCookies',
        'Page.navigate',  // To blank page.
        'Page.navigate',  // To the real page.
        'Page.captureScreenshot'
      ].should.eql(fakeWs.commands);
    fakeWs.commands = [];  // Reset for the next verification.
    should.ok(sendStub.calledOnce);
    var doneIpcMsg = sendStub.firstCall.args[0];
    should.equal(doneIpcMsg.cmd, 'done');
    [pageMessage, networkMessage, timelineMessage,
        pageLoadedMessage].should.eql(doneIpcMsg.devToolsMessages);
    ['screen.jpg'].should.eql(
        doneIpcMsg.screenshots.map(function(s) { return s.fileName; }));
    should.equal(1, writeFileStub.callCount);

    // We are not supposed to clean up on the first run.
    should.ok(killStub.notCalled);
    should.ok(disconnectStub.notCalled);

    // * Run 2 -- exitWhenDone=true.
    logger.debug('Second run of WD server');
    wd_server.process.emit('message', {
        cmd: 'run',
        exitWhenDone: true,
        filePrefix: '1_Cached_',
        chromedriver: chromedriver,
        url: 'http://gaga.com/ulala',
        pngScreenShot: true
      });
    // Verify that messages get ignored between runs
    fakeWs.emit('message', JSON.stringify(networkMessage), {});
    // Do not use tickUntilIdle -- see comment above for run 1.
    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS +
        webdriver.promise.ControlFlow.EVENT_LOOP_FREQUENCY * 20 + 1000);
    // Simulate page load finish.
    fakeWs.emit('message', JSON.stringify(pageLoadedMessage), {});
    test_utils.tickUntilIdle(app, sandbox);

    // * Verify after run 2, make sure we did quit+stop Chrome.
    // Make sure we did not spawn Chrome or connect DevTools repeatedly.
    should.ok(startChromeStub.calledOnce);
    should.ok(stubWebSocket.calledOnce);

    // These things get called for the second time on the second run.
    [
        'Page.navigate',  // To blank page.
        'Page.navigate',  // To the real page.
        'Page.captureScreenshot'
      ].should.eql(fakeWs.commands);
    should.ok(sendStub.calledTwice);
    doneIpcMsg = sendStub.secondCall.args[0];
    should.equal(doneIpcMsg.cmd, 'done');
    [pageLoadedMessage].should.eql(doneIpcMsg.devToolsMessages);
    ['screen.png'].should.eql(
        doneIpcMsg.screenshots.map(function(s) { return s.fileName; }));
    should.equal(2, writeFileStub.callCount);

    // The cleanup occurs only on the second run.
    should.ok(killStub.calledOnce);
    should.ok(disconnectStub.calledOnce);
  });

  it('should fail to connect if the chromedriver/jar are not set', function() {
    wds.init({});
    wds.connect.should.throwError();
  });

  it('should stop and send error on user script exception', function() {
    // supress expected errors
    test_utils.stubLog(sandbox, function(
         levelPrinter, levelName, stamp, source, message) {
      return ((/^wd_server\.js/).test(source) &&
          ((/^Run failed, stopping/).test(message) ||
           (/^Sending IPC error/).test(message)));
    });

    var error = 'scheduled failure';
    var failingScript =
        'webdriver.promise.controlFlow().schedule("#fail", ' +
        '    function() { throw new Error("' + error + '"); });';
    var launcherStubs = stubBrowserLauncher();
    var startWdServerStub = launcherStubs.startWdServerStub;
    var killStub = launcherStubs.killStub;
    stubServerReadyHttp();
    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');
    // WebDriverServer needs webdriver.promise in the sandboxed namespace.
    var wdContext = {promise: webdriver.promise};
    sandbox.stub(wd_sandbox, 'createSandboxedWdNamespace', function() {
      return app.schedule('stub sandboxed WD namespace', function() {
        return wdContext;
      });
    });
    var idleSpy = sandbox.spy();
    app.on(webdriver.promise.ControlFlow.EventType.IDLE, idleSpy);

    // Run! This calls init(message) and connect().
    logger.debug('Sending run message');
    wd_server.process.emit('message', {cmd: 'run', script: failingScript});

    // Now run the scheduled script.
    test_utils.tickUntilIdle(app, sandbox);

    // Verify run sequence before sending the result
    should.ok(startWdServerStub.calledOnce);
    should.ok(idleSpy.calledOnce);

    // Verify the result was sent
    should.ok(sendStub.calledOnce);
    should.equal(sendStub.firstCall.args[0].cmd, 'error');
    should.equal(sendStub.firstCall.args[0].e, error);
    should.ok(killStub.calledOnce);
    should.ok(disconnectStub.calledOnce);
  });

  it('should stop and send error on uncaught exception', function() {
    wds.init({});
    // connect() does this
    wd_server.process.once('uncaughtException',
        wds.uncaughtExceptionHandler_);
    var error = 'test uncaught exception';
    test_utils.stubLog(sandbox, function(
         levelPrinter, levelName, stamp, source, message) {
      return ((/^wd_server\.js/).test(source) &&
         (-1 !== message.indexOf(error)));
    });
    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');

    wd_server.process.emit('uncaughtException', new Error(error));
    test_utils.tickUntilIdle(app, sandbox);

    should.ok(sendStub.calledOnce);
    should.equal(sendStub.firstCall.args[0].cmd, 'error');
    should.equal(sendStub.firstCall.args[0].e, error);
    should.ok(disconnectStub.calledOnce);
  });
});
