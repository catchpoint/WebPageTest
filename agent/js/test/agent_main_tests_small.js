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
  var client;
  var fakeWdServer;
  var stubWprGetLog, stubWprRecord, stubWprReplay, stubWprStop;
  var stubFork;
  var stubIpfwStart, stubIpfwStop;
  var stubRunFinished;
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

  function stubFs() {
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
  }

  function stubWpr() {
    stubWprGetLog = sandbox.stub(web_page_replay.WebPageReplay.prototype,
        'scheduleGetErrorLog', function() {
      return app.schedule('WPR get log', function() {
        return 'gaga';
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
    stubFs();
    stubWpr();

    var client = new FakeClient();
    var agent = new agent_main.Agent(app, client, /*flags=*/{});
    agent.run();

    var runFinishedSpy = sandbox.spy();
    var fakeJob = {runFinished: runFinishedSpy, task: {}};
    client.onAbortJob(fakeJob);
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(runFinishedSpy.calledOnce);
  });

  function reset_() {
    fakeWdServer = undefined;
    stubFork = sandbox.stub(child_process, 'fork', function() {
      fakeWdServer = new FakeWdServer();
      return fakeWdServer;
    });
    stubIpfwStart = sandbox.spy();
    stubIpfwStop = sandbox.spy();
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
    stubRunFinished = sandbox.stub(wpt_client.Job.prototype, 'runFinished');
    stubFs();
    stubWpr();

    client = new FakeClient();
    var agent = new agent_main.Agent(app, client, {
        deviceSerial: 'T3S7'
      });
    agent.run();
  }

  function startNextRun(job) {
    var stubSend = sandbox.stub(FakeWdServer.prototype, 'send',
        function(message) {
      message.should.have.properties({
          cmd: 'run',
          runNumber: job.runNumber,
          exitWhenDone: (job.isFirstViewOnly || job.isCacheWarm),
          flags: {
            deviceSerial: 'T3S7'
          },
          task: job.task
        });
      fakeWdServer.emit('message', {cmd: 'done'});
      if (job.isFirstViewOnly || job.isCacheWarm) {
        fakeWdServer.emit('exit', 0);
      }
    });
    client.onStartJobRun(job);
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(undefined, job.error);

    if (job.isReplay) {
      should.equal('gaga', job.zipResultFiles['replay.log']);
    } else {
      should.ok(job.zipResultFiles.should.be.empty);
    }
    should.equal(job, stubRunFinished.lastCall.thisValue);
    [job.isFirstViewOnly || job.isCacheWarm].should.eql(
        stubRunFinished.lastCall.args);

    var isEndOfJob = (job.runNumber === job.runs &&
                      (job.isFirstViewOnly || job.isCacheWarm));

    should.equal(stubRunFinished.callCount,
        (Math.max(0, ((job.runNumber - (job.isReplay ? 0 : 1)) *
                      (job.isFirstViewOnly ? 1 : 2))) +
         (job.isFirstViewOnly || !job.isCacheWarm ? 1 : 2)));
    should.equal(stubFork.callCount,
        job.runNumber + (job.isReplay ? 1 : 0));
    should.equal(stubWprStop.callCount,
        job.isReplay && isEndOfJob ? 2 : 1);
    should.equal(stubWprRecord.callCount,
        job.isReplay ? 1 : 0);
    should.equal(stubWprReplay.callCount,
        (job.isReplay && job.runNumber > 0) ? 1 : 0);
    should.equal(stubWprGetLog.callCount,
        job.isReplay ? stubRunFinished.callCount : 0);
    should.equal(stubIpfwStop.callCount,
        ((job.isReplay ? 1 : 0) + (isEndOfJob ? 1 : 0)));
    should.equal(stubIpfwStart.callCount,
         (job.isReplay && job.runNumber === 0) ? 0 : 1);

    should.ok(stubSend.calledOnce);
    stubSend.restore();

    if (job.isFirstViewOnly) {
      job.runNumber += 1;
    } else {
      if (job.isCacheWarm) {
        job.runNumber += 1;
        job.isCacheWarm = false;
      } else {
        job.isCacheWarm = true;
      }
    }
  }

  function runTest(taskOverrides) {
    var task = {
        'Capture Video': 1,
        'Test ID': 'id',
        'pngScreenshot': 1,
        browser: 'shmowser',
        fvonly: 0,
        replay: 0,
        runs: 1,
        tcpdump: 1,
        timeline: 1,
        bwOut: 123,
        url: 'http://test'
      };
    Object.getOwnPropertyNames(taskOverrides).forEach(function(key) {
      task[key] = taskOverrides[key];
    });
    reset_();
    var job = new wpt_client.Job(client, task);
    var n = (job.runs + (job.isReplay ? 1 : 0)) * (job.isFirstViewOnly ? 1 : 2);
    for (var i = 0; i < n; ++i) {
      startNextRun(job);
    }
  }

  it('should execute fvonly !replay', function() {
    runTest({fvonly: 1, replay: 0, runs: 2});
  });
  it('should execute fvonly replay', function() {
    runTest({fvonly: 1, replay: 1, runs: 2});
  });
  it('should execute !fvonly !replay', function() {
    runTest({fvonly: 0, replay: 0, runs: 2});
  });
  it('should execute !fvonly replay', function() {
    runTest({fvonly: 0, replay: 1, runs: 2});
  });
});
