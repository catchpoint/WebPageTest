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
var traffic_shaper = require('traffic_shaper');
var webdriver = require('webdriver');


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('traffic shaper small', function() {
  'use strict';

  var app = webdriver.promise.Application.getInstance();
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

  function testIpfw(deviceAddr, bwIn, bwOut, latency, plr,
      beforeList, expectedStartCalls, afterList, expectedStopCalls) {
    // stub fs.exists, spawn, and port-alloc
    sandbox.stub(fs, 'exists', function(path, cb) {
      global.setTimeout(function() {
        cb(/ipfw$/.test(path));
      }, 1);
    });
    var isAfter;
    var spawnStub = test_utils.stubOutProcessSpawn(sandbox);
    spawnStub.callback = function(proc, cmd, argv) {
      if (/ipfw$/.test(cmd)) {
        if (1 === argv.length && 'list' === argv[0]) {
          var stdout = (isAfter ? afterList : beforeList);
          global.setTimeout(function() {
            proc.stdout.emit('data', stdout);
          }, 1);
        } else {
          isAfter = true;
        }
      }
    };
    test_utils.stubCreateServer(sandbox);

    var ts = new traffic_shaper.TrafficShaper(app, {deviceAddr: deviceAddr});
    ts.scheduleStart(bwIn, bwOut, latency, plr);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 30);
    should.equal('[]', app.getSchedule());
    spawnStub.assertCalls.apply(spawnStub, expectedStartCalls);

    ts.scheduleStop();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    should.equal('[]', app.getSchedule());
    spawnStub.assertCalls.apply(spawnStub, expectedStopCalls);
  }

  it('should run ipfw for any address', function() {
    var ipfw = /ipfw$/;
    testIpfw(undefined, 123, 456, 789, 10,
      '65535 allow ip from any to any',
      [[ipfw, 'list'], // isSupported test
       [ipfw, 'add', 19999, 'pipe', 19999, 'ip', 'from', 'any', 'to', 'any'],
       [ipfw, 'pipe', 19999, 'config', 'bw', '123Kbit/s', 'delay', '394ms'],
       [ipfw, 'add', 20000, 'pipe', 20000, 'ip', 'from', 'any', 'to', 'any'],
       [ipfw, 'pipe', 20000, 'config', 'bw', '456Kbit/s', 'delay', '395ms',
           'plr', '10'],
       []],
      ('19999 pipe 19999 ip from any to any\n' +
       '20000 pipe 20000 ip from any to any\n' +
       '65535 allow ip from any to any'),
      [[ipfw, 'list'],
       [ipfw, 'delete', '19999'],
       [ipfw, 'delete', '20000'],
       [ipfw, 'pipe', 'delete', '19999'],
       [ipfw, 'pipe', 'delete', '20000'],
       []]);
  });
});

