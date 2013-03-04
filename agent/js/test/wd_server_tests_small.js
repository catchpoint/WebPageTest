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
/*global describe: true, before: true, beforeEach: true, afterEach: true,
  it: true*/

var devtools = require('devtools');
var events = require('events');
var http = require('http');
var logger = require('logger');
var process_utils = require('process_utils');
var sinon = require('sinon');
var should = require('should');
var test_utils = require('./test_utils.js');
var timers = require('timers');
var util = require('util');
var webdriver = require('webdriver');
var browser_local_chrome = require('browser_local_chrome');
var wd_server = require('wd_server');
var wd_sandbox = require('wd_sandbox');


function FakeWebSocket(url) {
  'use strict';
  logger.debug('Creating fake WebSocket: %s', url);
  this.commands = [];
}
util.inherits(FakeWebSocket, events.EventEmitter);

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

  var app = webdriver.promise.Application.getInstance();
  process_utils.injectWdAppLogging('wd_server app', app);
  // Set to a small number of WD event loop ticks to reduce no-op ticks.
  wd_server.WAIT_AFTER_ONLOAD_MS =
      webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 2;

  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    test_utils.fakeTimers(sandbox);
    // Re-create stub process for each test to avoid accumulating listeners.
    wd_server.process = new events.EventEmitter();
    wd_server.process.send = function() {};
    wd_server.process.disconnect = function() {};

    app.reset();  // We reuse the app across tests, clean it up.
    wd_server.WebDriverServer.initIpc();  // Event listener on the fake process.
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

  function stubWdLauncher(startCb, killCb) {
    var startWdServerStub  = sandbox.stub(
        browser_local_chrome.BrowserLocalChrome.prototype, 'startWdServer',
        function() {
      this.childProcessName_ = 'stub WD server';
      this.serverUrl_ = 'http://localhost:4444';
      this.devToolsUrl_ = 'http://localhost:1234/json';
      this.childProcess_ = 'process';
      if (startCb) {
        startCb(this);
      }
    });
    var startChromeStub  = sandbox.stub(
        browser_local_chrome.BrowserLocalChrome.prototype, 'startBrowser',
        function() {
      this.childProcessName_ = 'stub Chrome';
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
    return sandbox.stub(webdriver.http.Executor.prototype, 'execute',
        function(command, callback) {
      should.equal(
          webdriver.command.CommandName.GET_SERVER_STATUS, command.getName());
      callback(/*error=*/undefined);  // Resolves isReady promise.
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
    var launcherStubs = stubWdLauncher(function() {
      should.ok(isFirstRun);  // Only spawn WD on first run.
    });
    var startWdServerStub = launcherStubs.startWdServerStub;
    var killStub = launcherStubs.killStub;
    // Stub out IPC, verify at the end.
    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');

    stubServerReadyHttp();

    // Connect DevTools
    test_utils.stubHttpGet(sandbox, /^http:\/\/localhost:\d+\/json$/,
        '[{"webSocketDebuggerUrl": "ws://gaga"}]');
    var stubWebSocket = sandbox.stub(devtools, 'WebSocket', FakeWebSocket);
    var fakeWs;  // Assign later, after DevTools connection creates a WebSocket.

    // Fake a WebDriver instance, stub Builder.build() to return it.
    var driverQuitSpy = sinon.spy();
    var fakeDriver = {
      quit: function() {
        return app.schedule('Fake WebDriver.quit()', driverQuitSpy);
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
    // wd_server ignores DevTools messages before onDriverBuild actions finish.
    // Schedule our emission function after the onDriverBuild-scheduled stuff.
    var realOnDriverBuild =
        wd_server.WebDriverServer.onDriverBuild.bind(wd_server.WebDriverServer);
    var onBuildStub = sandbox.stub(wd_server.WebDriverServer, 'onDriverBuild',
        function(driver, browserCaps, wdNamespace) {
          realOnDriverBuild.call(this, driver, browserCaps, wdNamespace);
          this.app_.schedule('Emit test DevTools events', function() {
            fakeWs.emit('message', JSON.stringify(pageMessage), {});
            fakeWs.emit('message', JSON.stringify(networkMessage), {});
            fakeWs.emit('message', JSON.stringify(timelineMessage), {});
          });
        });

    var idleSpy = sandbox.spy();
    app.on(webdriver.promise.Application.EventType.IDLE, idleSpy);

    // * Run 1 -- exitWhenDone=false.
    logger.debug('First run of WD server');
    wd_server.process.emit('message', {
        cmd: 'run',
        exitWhenDone: false,
        filePrefix: '1_Cached_',
        chromedriver: chromedriver,
        script: 'new webdriver.Builder().build();'
    });
    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS
        + webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    fakeWs = stubWebSocket.firstCall.thisValue;  // The DevTools WebSocket.
    fakeWs.emit('open');  // DevTools WebSocket connected.

    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS
        + webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 20 + 1000);
    onBuildStub.restore();  // Remove fake DevTools event emission.

    // * Verify after run 1, make sure we didn't quit/stop WD.
    // Should spawn the chromedriver process on port 4444.
    should.ok(startWdServerStub.calledOnce);
    should.equal('chrome', startWdServerStub.firstCall.args[0].browserName);

    should.ok(wdBuildStub.calledOnce);
    should.ok(stubWebSocket.calledOnce);
    should.ok('ws://gaga', stubWebSocket.firstCall.args[0]);
    [
        'Network.enable',
        'Page.enable',
        'Timeline.start',
        'Page.getResourceTree',
        'Page.setDocumentContent',
        'Page.setDocumentContent',
        'Network.clearBrowserCache',
        'Network.clearBrowserCookies',
        'Page.captureScreenshot'
    ].should.eql(fakeWs.commands);
    fakeWs.commands = [];  // Reset for next run verification.
    should.ok(sendStub.calledOnce);
    var doneIpcMsg = sendStub.firstCall.args[0];
    should.equal(doneIpcMsg.cmd, 'done');
    [pageMessage, networkMessage, timelineMessage]
        .should.eql(doneIpcMsg.devToolsMessages);

    // We are not supposed to clean up on the first run.
    should.ok(driverQuitSpy.notCalled);
    should.ok(killStub.notCalled);
    should.ok(disconnectStub.notCalled);

    // * Run 2 -- exitWhenDone=true.
    logger.debug('Second run of WD server');
    wd_server.process.emit('message', {
        cmd: 'run',
        exitWhenDone: true,
        filePrefix: '1_Cached_',
        chromedriver: chromedriver,
        script: 'new webdriver.Builder().build();'
    });
    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS
        + webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 20);

    // * Verify after run 2, make sure we did quit+stop WD.
    // Make sure we did not spawn the WD server etc. for the second time.
    should.ok(startWdServerStub.calledOnce);
    should.ok(wdBuildStub.calledOnce);
    should.ok(stubWebSocket.calledOnce);

    // These things get called for the second time on the second run.
    ['Page.captureScreenshot'].should.eql(fakeWs.commands);
    should.ok(sendStub.calledTwice);
    doneIpcMsg = sendStub.secondCall.args[0];
    should.equal(doneIpcMsg.cmd, 'done');
    [].should.eql(doneIpcMsg.devToolsMessages);

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
    var launcherStubs = stubWdLauncher(function() {
      should.ok(isFirstRun);  // Only spawn WD on first run.
    });
    var startChromeStub = launcherStubs.startChromeStub;
    var killStub = launcherStubs.killStub;
    // Stub out IPC, verify at the end.
    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');

    // Connect DevTools
    test_utils.stubHttpGet(sandbox, /^http:\/\/localhost:\d+\/json$/,
        '[{"webSocketDebuggerUrl": "ws://gaga"}]');
    var stubWebSocket = sandbox.stub(devtools, 'WebSocket', FakeWebSocket);

    var idleSpy = sandbox.spy();
    app.on(webdriver.promise.Application.EventType.IDLE, idleSpy);

    // * Run 1 -- exitWhenDone=false.
    logger.debug('First run of WD server');
    wd_server.process.emit('message', {
        cmd: 'run',
        exitWhenDone: false,
        filePrefix: '1_Cached_',
        chromedriver: chromedriver,
        url: 'http://gaga.com/ulala'
    });
    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS
        + webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    var fakeWs = stubWebSocket.firstCall.thisValue;  // The DevTools WebSocket.
    fakeWs.emit('open');  // DevTools WebSocket connected.

    // Simulate Chrome generating profiling messages as the page loads.
    var pageMessage = {method: 'Page.gaga'};
    var networkMessage = {method: 'Network.ulala'};
    var timelineMessage = {method: 'Timeline.tutu'};
    var pageLoadedMessage = {method: 'Page.loadEventFired'};
    // Verify that messages get ignored before the page load starts
    fakeWs.emit('message', JSON.stringify(networkMessage), {});

    // Emit DevTools events after the test has started -- Page.navigate fired.
    function onPageNavigate(message) {
      if (message.indexOf('Page.navigate') !== -1) {
        fakeWs.removeListener('message', onPageNavigate);  // Fire only once.
        fakeWs.emit('message', JSON.stringify(pageMessage), {});
        fakeWs.emit('message', JSON.stringify(networkMessage), {});
        fakeWs.emit('message', JSON.stringify(timelineMessage), {});
        fakeWs.emit('message', JSON.stringify(pageLoadedMessage), {});
      }
    }
    fakeWs.on('message', onPageNavigate);
    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS
        + webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 30 + 1000);

    // * Verify after run 1, make sure we didn't quit/stop Chrome.
    should.ok(startChromeStub.calledOnce);
    should.equal('chrome', startChromeStub.firstCall.args[0].browserName);

    should.ok(stubWebSocket.calledOnce);
    should.ok('ws://gaga', stubWebSocket.firstCall.args[0]);
    [
        'Network.enable',
        'Page.enable',
        'Timeline.start',
        'Page.getResourceTree',
        'Page.setDocumentContent',
        'Page.setDocumentContent',
        'Network.clearBrowserCache',
        'Network.clearBrowserCookies',
        'Page.navigate',
        'Page.captureScreenshot'
    ].should.eql(fakeWs.commands);
    fakeWs.commands = [];  // Reset for the next verification.
    should.ok(sendStub.calledOnce);
    var doneIpcMsg = sendStub.firstCall.args[0];
    should.equal(doneIpcMsg.cmd, 'done');
    [pageMessage, networkMessage, timelineMessage, pageLoadedMessage]
        .should.eql(doneIpcMsg.devToolsMessages);

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
        url: 'http://gaga.com/ulala'
    });
    // Verify that messages get ignored between runs
    fakeWs.emit('message', JSON.stringify(networkMessage), {});
    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS
        + webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 20 + 1000);
    // Simulate page load finish.
    fakeWs.emit('message', JSON.stringify(pageLoadedMessage), {});
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);

    // * Verify after run 2, make sure we did quit+stop Chrome.
    // Make sure we did not spawn Chrome or connect DevTools repeatedly.
    should.ok(startChromeStub.calledOnce);
    should.ok(stubWebSocket.calledOnce);

    // These things get called for the second time on the second run.
    [
        'Page.getResourceTree',
        'Page.setDocumentContent',
        'Page.setDocumentContent',
        'Page.navigate',
        'Page.captureScreenshot'
    ].should.eql(fakeWs.commands);
    should.ok(sendStub.calledTwice);
    doneIpcMsg = sendStub.secondCall.args[0];
    should.equal(doneIpcMsg.cmd, 'done');
    [pageLoadedMessage].should.eql(doneIpcMsg.devToolsMessages);

    // The cleanup occurs only on the second run.
    should.ok(killStub.calledOnce);
    should.ok(disconnectStub.calledOnce);
  });

  it('should fail to connect if the chromedriver/jar are not set', function() {
    wd_server.WebDriverServer.init({});
    wd_server.WebDriverServer.connect.should.throwError();
  });

  it('should stop and send error on user script exception', function() {
    var error = 'scheduled failure';
    var failingScript =
        'webdriver.promise.Application.getInstance().schedule("#fail", ' +
        '    function() { throw new Error("' + error + '"); });';
    var launcherStubs = stubWdLauncher();
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
    app.on(webdriver.promise.Application.EventType.IDLE, idleSpy);

    // Run! This calls init(message) and connect().
    logger.debug('Sending run message');
    wd_server.process.emit('message', {cmd: 'run', script: failingScript});

    // Now run the scheduled script.
    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS +
        webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 15);

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
    wd_server.WebDriverServer.init({});
    // connect() does this
    wd_server.process.once('uncaughtException',
        wd_server.WebDriverServer.uncaughtExceptionHandler_);

    var error = 'test uncaught exception';
    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');

    wd_server.process.emit('uncaughtException', new Error(error));
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 5);

    should.ok(sendStub.calledOnce);
    should.equal(sendStub.firstCall.args[0].cmd, 'error');
    should.equal(sendStub.firstCall.args[0].e, error);
    should.ok(disconnectStub.calledOnce);
  });
});
