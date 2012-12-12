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
    wd_server.WebDriverServer.init({});
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

  it('should run a sandboxed session', function() {
    var wdContext = {promise: webdriver.promise, isSetFromScript: false};
    var isIdleReached = false;
    sandbox.stub(wd_sandbox, 'createSandboxedWdNamespace', function() {
      return app.schedule('stub sandboxed WD namespace', function() {
        return wdContext;
      });
    });
    wd_server.WebDriverServer.script_ = 'webdriver.isSetFromScript = true';
    app.on(webdriver.promise.Application.EventType.IDLE, function() {
      isIdleReached = true;
    });

    wd_server.WebDriverServer.runSandboxedSession_({});
    sandbox.clock.tick(wd_server.WAIT_AFTER_ONLOAD_MS);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    should.ok(wdContext.isSetFromScript);
    should.ok(isIdleReached);
  });

  it('should fail to connect if the server jar is not set', function() {
    wd_server.WebDriverServer.connect.should.throwError();
  });

  it('should set the driver', function() {
    var wdNamespace = {wd: 'chrome wd namespace'};
    var driver = 'this is a driver';
    var connectDevToolsStub = sandbox.stub(wd_server.WebDriverServer,
        'connectDevTools_');

    wd_server.WebDriverServer.onDriverBuild(
        driver, {browserName: 'chrome'}, wdNamespace);

    should.ok(connectDevToolsStub.withArgs(wdNamespace).calledOnce);
    should.equal(wd_server.WebDriverServer.driver_, driver);
    should.equal(wd_server.WebDriverServer.driverBuildTime_, Date.now());
  });

  it('should stop and emit error on onError_', function() {
    var error = 'this is an error';
    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');

    wd_server.WebDriverServer.onError_(new Error(error));
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 5);

    should.ok(sendStub.calledOnce);
    should.equal(sendStub.firstCall.args[0].cmd, 'error');
    should.equal(sendStub.firstCall.args[0].e, error);
    should.ok(disconnectStub.calledOnce);
  });

  it('should correctly handle uncaught exceptions', function() {
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

  it('should send job results and kill the driver and server when done',
      function() {
    var fakeDriver = {};
    var driverQuitSpy = sinon.spy();
    fakeDriver.quit = function() {
      return app.schedule('Fake WebDriver.quit()', driverQuitSpy);
    };
    wd_server.WebDriverServer.driver_ = fakeDriver;

    var uncaughtStub = sandbox.stub(
        wd_server.WebDriverServer, 'uncaughtExceptionHandler_');
    // connect() does this, we verify below that it gets unset while stopping.
    wd_server.process.once('uncaughtException',
        wd_server.WebDriverServer.uncaughtExceptionHandler_);

    var fakeChildProcess = {};
    fakeChildProcess.kill = function() {};
    var childKillStub = sandbox.stub(fakeChildProcess, 'kill');
    wd_server.WebDriverServer.serverProcess_ = fakeChildProcess;

    var sendStub = sandbox.stub(wd_server.process, 'send');
    var disconnectStub = sandbox.stub(wd_server.process, 'disconnect');

    wd_server.WebDriverServer.done_();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 5);

    // Verify uncaught handler unset: uncaughtStub not called again, still once.
    wd_server.process.emit('uncaughtException', new Error('gaga'));
    should.ok(!uncaughtStub.called);

    should.ok(driverQuitSpy.calledOnce);
    should.ok(childKillStub.calledOnce);
    should.ok(sendStub.calledOnce);
    should.equal(sendStub.firstCall.args[0].cmd, 'done');
    should.ok(disconnectStub.calledOnce);
  });

  it('should connect the devtools', function() {
    var devTools;
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
});
