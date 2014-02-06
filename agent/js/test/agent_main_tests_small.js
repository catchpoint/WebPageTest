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
var events = require('events');
var fs = require('fs');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var util = require('util');
var webdriver = require('selenium-webdriver');


function FakeEmitterWithRun() {
  'use strict';
}
util.inherits(FakeEmitterWithRun, events.EventEmitter);

/** Fake emitter. */
FakeEmitterWithRun.prototype.run = function() {
  'use strict';
};


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

  before(function() {
    agent_main.setSystemCommands();
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    test_utils.fakeTimers(sandbox);

    // Stub out fs functions for the temp dir cleanup and ipfw check.
    sandbox.stub(fs, 'exists', function(path, cb) {
      path.should.match(/ipfw$|runtmp$/);
      global.setTimeout(function() {
        cb(/runtmp$/.test(path));
      }, 1);
    });
    sandbox.stub(fs, 'readdir', function(path, cb) {
      path.should.match(/runtmp$/);
      global.setTimeout(function() {
        cb(undefined, ['tmp1', 'tmp2']);
      }, 1);
    });
    sandbox.stub(fs, 'unlink', function(path, cb) {
      path.should.match(/runtmp[\/\\]tmp\d$/);
      global.setTimeout(function() {
        cb();
      }, 1);
    });

    ['scheduleExec', 'scheduleWait', 'scheduleGetAll',
         'scheduleAllocatePort'].forEach(function(functionName) {
      sandbox.stub(process_utils, functionName, function() {
        return new webdriver.promise.Deferred();
      });
    });

    // Create a new ControlFlow for each test.
    app = new webdriver.promise.ControlFlow();
    webdriver.promise.setDefaultFlow(app);
    process_utils.injectWdAppLogging('agent_main', app);
  });

  afterEach(function() {
    sandbox.verifyAndRestore();
  });

  it('should cleanup job on timeout', function() {
    var client = new FakeEmitterWithRun();

    var runFinishedSpy = sandbox.spy();
    var fakeJob = {runFinished: runFinishedSpy};

    var agent = new agent_main.Agent(app, client, /*flags=*/{});
    agent.run();

    client.onAbortJob(fakeJob);
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(runFinishedSpy.calledOnce);
  });
});
