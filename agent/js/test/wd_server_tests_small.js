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

var child_process = require('child_process');
var devtools = require('devtools');
var events = require('events');
var logger = require('logger');
var process_utils = require('process_utils');
var sinon = require('sinon');
var should = require('should');
var test_utils = require('./test_utils.js');
var timers = require('timers');
var webdriver = require('webdriver');
var wd_server = require('wd_server');
var wd_sandbox = require('wd_sandbox');


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
    wd_server.WebDriverServer.initIpc();
    wd_server.WebDriverServer.init({});  // Most tests start with the defaults.
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

  it('should perform the overall sequence - start, run, stop', function() {
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
    var fakeProcess = new events.EventEmitter();
    fakeProcess.stdout = new events.EventEmitter();
    fakeProcess.stderr = new events.EventEmitter();
    fakeProcess.kill = sandbox.spy();
    var processSpawnStub = sandbox.stub(child_process, 'spawn', function() {
      should.ok(isFirstRun);  // Only spawn WD on first run.
      return fakeProcess;
    });
    // Stub out IPC, verify at the end.
    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');

    sandbox.stub(webdriver.http.Executor.prototype, 'execute',
        function(command, callback) {
      should.equal(
          webdriver.command.CommandName.GET_SERVER_STATUS, command.getName());
      callback(/*error=*/undefined);  // Resolves isReady promise.
    });

    // We test this with a separate unit test, violating public interface a bit
    // for the sake of better test granularity -- this test is already long.
    var connectDevtoolsStub = sandbox.stub(
        wd_server.WebDriverServer, 'connectDevTools_');

    // Fake a WebDriver instance, stub Builder.build() to return it.
    var screenshotSpy = sinon.spy();
    var driverQuitSpy = sinon.spy();
    var fakeDriver = {
      takeScreenshot: function() {
        return app.schedule('Fake WebDriver.screenshot()', function() {
          screenshotSpy();
          return 'fake screenshot content';
        });
      },
      quit: function() {
        return app.schedule('Fake WebDriver.quit()', driverQuitSpy);
      }
    };

    var wdBuildStub = sandbox.stub(webdriver.Builder.prototype, 'build',
        function() {
      logger.debug('Stub Builder.build() called');
      return fakeDriver;
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
        + webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 20);

    // * Verify after run 1, make sure we didn't quit/stop WD.
    // Should spawn the chromedriver process on port 4444.
    should.equal(fakeProcess, wd_server.WebDriverServer.serverProcess_);
    should.ok(processSpawnStub.calledOnce);
    processSpawnStub.firstCall.args[0].should.equal(chromedriver);
    processSpawnStub.firstCall.args[1].should.include('-port=4444');

    should.ok(wdBuildStub.calledOnce);
    should.ok(connectDevtoolsStub.calledOnce);
    should.ok(screenshotSpy.calledOnce);
    should.ok(sendStub.calledOnce);
    should.equal(sendStub.firstCall.args[0].cmd, 'done');
    should.ok(idleSpy.calledOnce);

    // We are not supposed to clean up on the first run.
    should.ok(!driverQuitSpy.called);
    should.ok(!fakeProcess.kill.called);
    should.ok(!disconnectStub.called);

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
    should.equal(fakeProcess, wd_server.WebDriverServer.serverProcess_);
    should.ok(processSpawnStub.calledOnce);
    should.ok(wdBuildStub.calledOnce);
    should.ok(connectDevtoolsStub.calledOnce);

    // These things get called for the second time on the second run.
    should.ok(screenshotSpy.calledTwice);
    should.ok(sendStub.calledTwice);
    should.equal(sendStub.secondCall.args[0].cmd, 'done');

    // The cleanup occurs only on the second run.
    should.ok(driverQuitSpy.calledOnce);
    should.ok(fakeProcess.kill.calledOnce);
    should.ok(disconnectStub.calledOnce);

    // Simulate server exit.
    fakeProcess.emit('exit', /*code=*/0);
    should.equal(undefined, wd_server.WebDriverServer.serverProcess_);
  });

  it('should fail to connect if the chromedriver/jar are not set', function() {
    wd_server.WebDriverServer.connect.should.throwError();
  });

  // Stubbed out in the overall sequence test, test it separately.
  it('should connect to Chrome DevTools', function() {
    var devTools = null;  // Appease WebStorm.
    sandbox.stub(devtools.DevTools.prototype, 'connect', function() {
      devTools = this;
      this.emit('connect');
    });

    var commands = [];
    sandbox.stub(devtools.DevTools.prototype, 'command',
        function(message, callback) {
          message.result = "ok";
          commands.push(message.method);
          callback(message);
        });

    wd_server.WebDriverServer.connectDevTools_(webdriver);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 5);
    var pageMessage = {method: 'Page.gaga'};
    var timelineMessage = {method: 'Timeline.ulala'};
    devTools.emit('message', pageMessage);
    devTools.emit('message', timelineMessage);

    ['Network.enable', 'Page.enable', 'Timeline.start'].should.eql(commands);
    [pageMessage].should.eql(wd_server.WebDriverServer.devToolsMessages_);
    [timelineMessage].should.eql(
        wd_server.WebDriverServer.devToolsTimelineMessages_);
  });

  it('should stop and send error on user script exception', function() {
    var error = 'scheduled failure';
    var failingScript =
        'webdriver.promise.Application.getInstance().schedule("#fail", ' +
        '    function() { throw new Error("' + error + '"); });';
    var startServerStub = sandbox.stub(
        wd_server.WebDriverServer, 'startServer_');
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
        webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 12);

    // Verify run sequence before sending the result
    should.ok(startServerStub.calledOnce);
    should.ok(idleSpy.calledOnce);

    // Verify the result was sent
    should.ok(sendStub.calledOnce);
    should.equal(sendStub.firstCall.args[0].cmd, 'error');
    should.equal(sendStub.firstCall.args[0].e, error);
    should.ok(disconnectStub.calledOnce);
  });

  it('should stop and send error on uncaught exception', function() {
    // connect() does this
    wd_server.process.once('uncaughtException',
        wd_server.WebDriverServer.uncaughtExceptionHandler_);

    var error = 'this is an error';
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
