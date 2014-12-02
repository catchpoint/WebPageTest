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

var fs = require('fs');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils');
var webdriver = require('selenium-webdriver');
var web_page_replay = require('web_page_replay');


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('web_page_replay small', function() {
  'use strict';

  var app = webdriver.promise.controlFlow();
  process_utils.injectWdAppLogging('WD app', app);

  var sandbox;
  var callNumber;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    test_utils.fakeTimers(sandbox);
    app.reset();  // We reuse the app across tests, clean it up.

    callNumber = 0;
  });

  afterEach(function() {
    // Call unfakeTimers before verifyAndRestore, which may throw.
    should.equal('[]', app.getSchedule());
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
  });

  it('should record, replay, end', function() {
    // stub fs.exists, spawn, and port-alloc
    sandbox.stub(fs, 'exists', function(path, cb) {
      global.setTimeout(function() {
        cb(/wpr$/.test(path));
      }, 1);
    });
    var spawnStub = test_utils.stubOutProcessSpawn(sandbox);
    spawnStub.callback = function(proc, cmd, argv) {
      var stdout = '';
      if (/wpr$/.test(cmd) && 'record' === argv[0]) {
        stdout = '1.2.3.4\n';
      } else if (/wpr$/.test(cmd) && 'replay' === argv[0]) {
        stdout = '\t  1.2.3.4\r\n';
      } else if (/wpr$/.test(cmd) && 'getlog' === argv[0]) {
        stdout = 'gaga';
      }
      proc.stdout.emit('data', stdout);
      return false;
    };

    var wpr = new web_page_replay.WebPageReplay(app,
        {flags: {deviceAddr: '1.2.3.4'}, task: {}});
    wpr.scheduleRecord().then(function(ip) {
      should.equal('1.2.3.4', ip);
    });
    wpr.scheduleReplay().then(function(ip) {
      should.equal('1.2.3.4', ip);
    });
    wpr.scheduleGetErrorLog().then(function(errorLog) {
      should.equal('gaga', errorLog);
    });
    wpr.scheduleStop();
    test_utils.tickUntilIdle(app, sandbox);
    var cmd = /wpr$/;
    spawnStub.assertCalls(
        [cmd, 'status'],
        [cmd, 'record', '1.2.3.4'],
        [cmd, 'replay', '1.2.3.4'],
        [cmd, 'getlog', '1.2.3.4'],
        [cmd, 'stop', '1.2.3.4']
    );
  });
});
