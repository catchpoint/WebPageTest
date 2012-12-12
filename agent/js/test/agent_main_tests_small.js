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
/*global after:true, describe:true, before:true, beforeEach:true,
  afterEach:true, it:true*/

var agent_main = require('agent_main');
var events = require('events');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var util = require('util');
var webdriver = require('webdriver');
var wpt_client = require('wpt_client');


function FakeEmitterWithRun() {
  'use strict';
}
util.inherits(FakeEmitterWithRun, events.EventEmitter);

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

  var app = webdriver.promise.Application.getInstance();
  process_utils.injectWdAppLogging('wd_server app', app);

  var sandbox;

  before(function() {
    agent_main.setSystemCommands();
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    test_utils.fakeTimers(sandbox);

    sandbox.stub(process_utils, 'scheduleExec', function() {
      return new webdriver.promise.Deferred();
    });
    sandbox.stub(process_utils, 'scheduleExitWaitOrKill', function() {
      return new webdriver.promise.Deferred();
    });
    sandbox.stub(process_utils, 'killDanglingProcesses', function(callback) {
      callback();
    });

    app.reset();  // We reuse the app across tests, clean it up.
  });

  afterEach(function() {
    sandbox.verifyAndRestore();
  });

  it('should cleanup job on timeout', function() {
    var client = new FakeEmitterWithRun();

    var runFinishedSpy = sandbox.spy();
    var fakeJob = {runFinished: runFinishedSpy};

    var agent = new agent_main.Agent(client, /*flags=*/{});
    agent.run();

    client.onJobTimeout(fakeJob);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 5);
    should.ok(runFinishedSpy.calledOnce);
  });

  it('should require selenium jar and devtools2har jar', function() {
    sandbox.stub(agent_main, 'Agent', FakeEmitterWithRun);
    sandbox.spy(FakeEmitterWithRun.prototype, 'run');
    sandbox.stub(wpt_client, 'Client', FakeEmitterWithRun);

    var flags = {};
    var runMainWithFlags = function() {
      agent_main.main(flags);
    };

    runMainWithFlags.should.throwError();

    flags.selenium_jar = 'jar';
    runMainWithFlags.should.throwError();

    flags.selenium_jar = undefined;
    flags.devtools2har_jar = 'jar';
    runMainWithFlags.should.throwError();

    flags.selenium_jar = 'jar';

    should.ok(!FakeEmitterWithRun.prototype.run.called);
    agent_main.main(flags);
    should.ok(FakeEmitterWithRun.prototype.run.calledOnce);
  });
});
