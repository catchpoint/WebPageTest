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

var agent_main = require('agent_main');
var child_process = require('child_process');
var events = require('events');
var fs = require('fs');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var util = require('util');
var webdriver = require('selenium-webdriver');
var web_page_replay = require('web_page_replay');
var wpt_client = require('wpt_client');


function FakeClient() {
  'use strict';
}
util.inherits(FakeClient, events.EventEmitter);

/** Fake for Client.prototype.run. */
FakeClient.prototype.run = function() {
  'use strict';
};


function FakeWdServer() {
  'use strict';
}
util.inherits(FakeWdServer, events.EventEmitter);

/** For stubbing. */
FakeWdServer.prototype.send = function() {};


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('agent_main', function() {
  'use strict';

  var sandbox;
  var app;
  var stubWprGetLog, stubWprRecord, stubWprReplay, stubWprStop;
  var wprErrorLog;

  before(function() {
    agent_main.setSystemCommands();
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    test_utils.fakeTimers(sandbox);

    // Create a new ControlFlow for each test.
    app = new webdriver.promise.ControlFlow();
    webdriver.promise.setDefaultFlow(app);
    process_utils.injectWdAppLogging('agent_main', app);
  });

  afterEach(function() {
    sandbox.verifyAndRestore();
  });

  function stubWpr() {
    wprErrorLog = '';
    stubWprGetLog = sandbox.stub(web_page_replay.WebPageReplay.prototype,
        'scheduleGetErrorLog', function() {
      return app.schedule('WPR get log', function() {
        return wprErrorLog;
      });
    });
    stubWprRecord = sandbox.stub(web_page_replay.WebPageReplay.prototype,
        'scheduleRecord', function() {
      app.schedule('WPR record', function() {});
    });
    stubWprReplay = sandbox.stub(web_page_replay.WebPageReplay.prototype,
        'scheduleReplay', function() {
      app.schedule('WPR replay', function() {});
    });
    stubWprStop = sandbox.stub(web_page_replay.WebPageReplay.prototype,
        'scheduleStop', function() {
      app.schedule('WPR stop', function() {});
    });
  }

  it('should cleanup job on timeout', function() {
    ['scheduleExec', 'scheduleWait', 'scheduleGetAll', 'scheduleAllocatePort']
        .forEach(function(functionName) {
      sandbox.stub(process_utils, functionName, function() {
        return new webdriver.promise.Deferred();
      });
    });
    // Stub out fs functions for the temp dir cleanup and ipfw check.
    sandbox.stub(fs, 'exists', function(path, cb) {
      path.should.match(/ipfw$|^runtmp/);
      global.setTimeout(function() {
        cb(/^runtmp/.test(path));
      }, 1);
    });
    sandbox.stub(fs, 'readdir', function(path, cb) {
      path.should.match(/^runtmp/);
      global.setTimeout(function() {
        cb(undefined, ['tmp1', 'tmp2']);
      }, 1);
    });
    sandbox.stub(fs, 'unlink', function(path, cb) {
      path.should.match(/^runtmp.*?[\/\\]tmp\d$/);
      global.setTimeout(function() {
        cb();
      }, 1);
    });
    stubWpr();

    var client = new FakeClient();
    var agent = new agent_main.Agent(app, client, /*flags=*/{});
    agent.run();

    var runFinishedSpy = sandbox.spy();
    var fakeJob = {runFinished: runFinishedSpy};
    client.onAbortJob(fakeJob);
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(runFinishedSpy.calledOnce);
    should.ok(stubWprStop.calledOnce);
  });

  it('should execute runs with WebPageReplay', function() {
    var fakeWdServer;
    var stubFork = sandbox.stub(child_process, 'fork', function() {
      fakeWdServer = new FakeWdServer();
      return fakeWdServer;
    });
    var stubIpfwStart = sandbox.spy(), stubIpfwStop = sandbox.spy();
    sandbox.stub(process_utils, 'scheduleExec', function(app, command, args) {
      if (/ipfw_config$/.test(command)) {
        if ('set' === args[0]) {
          stubIpfwStart();
        } else if ('clear' === args[0]) {
          stubIpfwStop();
        }
      }
      return new webdriver.promise.Deferred();
    });
    var stubRunFinished = sandbox.stub(wpt_client.Job.prototype, 'runFinished');
    stubWpr();

    sandbox.stub(fs, 'exists', function(path, cb) {
      path.should.match(/ipfw$|^runtmp/);
      global.setTimeout(function() {
        cb(false);
      }, 1);
    });
    sandbox.stub(fs, 'mkdir', function(path, cb) {
      path.should.match(/ipfw$|^runtmp/);
      global.setTimeout(function() {
        cb();
      }, 1);
    });

    var client = new FakeClient();
    var agent = new agent_main.Agent(app, client, {
        deviceSerial: 'T3S7'
      });
    agent.run();
    var job = new wpt_client.Job(client, {
        'Test ID': 'id',
        url: 'http://test',
        browser: 'shmowser',
        runs: 1,
        replay: 1,
        'Capture Video': 1,
        tcpdump: 1,
        timeline: 1,
        fvonly: 0
      });

    var stubSend = sandbox.stub(FakeWdServer.prototype, 'send',
        function(message) {
      should.equal('shmowser', message.options.browserName);
      message.should.have.properties({
          cmd: 'run',
          url: 'http://test',
          deviceSerial: 'T3S7',
          script: undefined,
          pac: undefined,
          runNumber: 0,
          exitWhenDone: true,
          captureVideo: false,
          capturePackets: false,
          captureTimeline: false,
          pngScreenShot: true
        });
      fakeWdServer.emit('message', {cmd: 'done'});
      fakeWdServer.emit('exit', 0);
    });
    client.onStartJobRun(job);
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(undefined, job.error);
    // Nothing prepared for submission to server.
    should.ok(job.resultFiles.should.be.empty);
    should.ok(job.zipResultFiles.should.be.empty);
    should.ok(stubRunFinished.calledOnce);
    should.equal(job, stubRunFinished.firstCall.thisValue);
    [true].should.eql(stubRunFinished.firstCall.args);
    should.ok(stubFork.calledOnce);
    should.ok(stubWprStop.calledOnce);
    should.ok(stubWprRecord.calledOnce);
    should.ok(stubWprReplay.notCalled);
    should.ok(stubWprGetLog.notCalled);
    should.ok(stubIpfwStart.calledOnce);
    should.ok(stubSend.calledOnce);
    stubSend.restore();

    stubSend = sandbox.stub(FakeWdServer.prototype, 'send',
        function(message) {
      message.should.have.properties({
          runNumber: 1,
          exitWhenDone: false,
          captureVideo: true,
          capturePackets: true,
          captureTimeline: true,
          pngScreenShot: false
        });
      fakeWdServer.emit('message', {cmd: 'done'});
    });
    job.runNumber = 1;
    client.onStartJobRun(job);
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(undefined, job.error);
    should.ok(job.resultFiles.should.be.empty);
    should.ok(job.zipResultFiles.should.be.empty);
    should.ok(stubRunFinished.calledTwice);
    should.equal(job, stubRunFinished.secondCall.thisValue);
    [false].should.eql(stubRunFinished.secondCall.args);
    should.ok(stubFork.calledTwice);  // Started wd_server again.
    should.ok(stubWprStop.calledOnce);  // No additional calls.
    should.ok(stubWprRecord.calledOnce);  // No additional calls.
    should.ok(stubWprReplay.calledOnce);  // First call.
    should.ok(stubWprGetLog.calledOnce);  // First call.
    should.ok(stubSend.calledOnce);
    stubSend.restore();

    stubSend = sandbox.stub(FakeWdServer.prototype, 'send',
        function(message) {
      message.should.have.properties({
          runNumber: 1,
          exitWhenDone: true,
          captureVideo: true,
          capturePackets: true,
          captureTimeline: true,
          pngScreenShot: false
        });
      wprErrorLog = 'gaga';
      fakeWdServer.emit('message', {cmd: 'done'});
      fakeWdServer.emit('exit', 0);
    });
    client.onStartJobRun(job);
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(undefined, job.error);
    should.ok(job.resultFiles.should.be.empty);
    should.equal('gaga', job.zipResultFiles['replay.log']);
    should.ok(stubRunFinished.calledThrice);
    should.equal(job, stubRunFinished.thirdCall.thisValue);
    [true].should.eql(stubRunFinished.thirdCall.args);
    should.ok(stubFork.calledTwice);  // No additional calls.
    should.ok(stubWprStop.calledTwice);  // Called again.
    should.ok(stubWprRecord.calledOnce);  // No additional calls.
    should.ok(stubWprReplay.calledOnce);  // No additional calls.
    should.ok(stubWprGetLog.calledTwice);  // Second call.
    should.equal(stubIpfwStart.callCount, stubIpfwStop.callCount);
    should.ok(stubSend.calledOnce);
    stubSend.restore();
  });
});
