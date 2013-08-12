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

var packet_capture_android = require('packet_capture_android');
var fs = require('fs');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var webdriver = require('webdriver');


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('packet_capture_android small', function() {
  'use strict';

  var app = webdriver.promise.Application.getInstance();
  process_utils.injectWdAppLogging('WD app', app);

  var sandbox;
  var spawnStub;
  var adbTcpdumpProc;
  var serial = 'GAGA123';
  var localPcapFile = '/gaga/ulala.pcap';

  /**
   * @param {Object} var_args
   */
  function assertAdbCall(var_args) { // jshint unused:false
    spawnStub.assertCall.apply(spawnStub, (0 === arguments.length ? [] :
        ['adb', '-s', serial].concat(Array.prototype.slice.call(arguments))));
  }

  function assertAdbCalls(var_args) { // jshint unused:false
    var i;
    for (i = 0; i < arguments.length; i += 1) {
      assertAdbCall.apply(undefined, arguments[i]);
    }
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    test_utils.fakeTimers(sandbox);
    app.reset();  // We reuse the app across tests, clean it up.

    spawnStub = test_utils.stubOutProcessSpawn(sandbox);
    adbTcpdumpProc = undefined;
  });

  afterEach(function() {
    should.equal('[]', app.getSchedule());
    // Call unfakeTimers before verifyAndRestore, which may throw.
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
  });

  function stop(pcap) {
    spawnStub.callback = function(proc, command, args) {
      var stdout;
      if (/adb$/.test(command)) {
        if (args.some(function(arg) { return arg === 'ps'; })) {
          stdout = 'USER ...\nuser 123 x3 x4 x5 x6 x7 x8 tcpdump\n';
        } else if (args.some(function(arg) { return arg === 'kill'; }) &&
                   args.some(function(arg) { return arg === '-INT'; })) {
          global.setTimeout(function() {
            adbTcpdumpProc.emit('exit', 0);
            adbTcpdumpProc.emit('close');
          }, 20);
        }
      }
      if (stdout !== undefined) {
        global.setTimeout(function() {
          proc.stdout.emit('data', stdout);
        }.bind(this), 1);
      }
    };

    pcap.scheduleStop();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 20);
    assertAdbCalls(
        ['shell', 'ps', 'tcpdump'],  // Output PID 123.
        ['shell', 'su', '-c', 'kill', '-INT', '123'],
        ['pull', /\/sdcard\/\w+\.pcap/, localPcapFile]);
    assertAdbCall();
  }

  function startSpawnStubCallback(proc, command, args) {
    var stdout;
    if (/adb$/.test(command)) {
      if (args.some(function(arg) { return arg === 'ps'; })) {
        stdout = 'USER ...\n';
      } else if (args.some(function(arg) { return arg === 'netcfg'; })) {
        stdout = 'usb0 UP 192.168.1.68/28 0x00001002 02:00:00:00:00:01\r\n';
      } else if (args[3] === 'su' && /tcpdump$/.test(args[5])) {
        // adb -s GAGA shell su -c .../tcpdump
        adbTcpdumpProc = proc;
        return true;  // Keep alive -- don't fake-exit.
      }
    }
    if (stdout !== undefined) {
      global.setTimeout(function() {
        proc.stdout.emit('data', stdout);
      }, 1);
      return false;  // Fake-exit in 5 fake milliseconds.
    }
    return undefined;  // Let the caller handle it.
  }

  it('should start and stop with on-device tcpdump', function() {
    var pcap = new packet_capture_android.PacketCaptureAndroid(
        app, {deviceSerial: serial});
    should.equal('[]', app.getSchedule());

    spawnStub.callback = function(proc, command, args) {
      var ret = startSpawnStubCallback(proc, command, args);
      if (ret === undefined) {
        if (/adb$/.test(command) &&
            args.some(function(arg) { return arg === 'ls'; }) &&
            args.some(new RegExp().test.bind(/^\/system[\/\w\*]+\/tcpdump$/))) {
          global.setTimeout(function() {
            proc.stdout.emit('data', '0');
          }, 1);
        }
      }
      return ret;
    };

    pcap.scheduleStart(localPcapFile);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 20);
    assertAdbCalls(
        ['shell', 'ls', '/system/*bin/tcpdump',
         '>', '/dev/null', '2>&1', ';', 'echo', '$?'],  // Output '0'.
        ['shell', 'ps', 'tcpdump'],  // Output 'USER ...'.
        ['shell', 'netcfg'],  // Output 'usb0 ...'.
        ['shell', 'su', '-c', /^tcpdump/, '-i', 'usb0', '-p', '-s', '0', '-w',
          /\/sdcard\/\w+\.pcap/]);
    assertAdbCall();

    stop(pcap);
  });

  it('should start and stop with pushed local tcpdump', function() {
    sandbox.stub(fs, 'exists', function(path, cb) { cb(true); });

    var localTcpdump = '/gaga/tcpdump';
    var pcap = new packet_capture_android.PacketCaptureAndroid(
        app, {tcpdumpBinary: localTcpdump, deviceSerial: serial});
    should.equal('[]', app.getSchedule());

    spawnStub.callback = function(proc, command, args) {
      var ret = startSpawnStubCallback(proc, command, args);
      if (ret === undefined) {
        if (/adb$/.test(command) &&
            args.some(function(arg) { return arg === 'ls'; }) &&
            args.some(function(arg) {
                return arg === '/data/local/tmp/tcpdump';
              })) {
          global.setTimeout(function() {
            proc.stdout.emit('data', '1');
          }.bind(this), 1);
        }
      }
      return ret;
    };

    pcap.scheduleStart(localPcapFile);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 20);
    assertAdbCalls(
        ['shell', 'ps', 'tcpdump'],  // Output 'USER ...'.
        ['shell', 'ls', '/data/local/tmp/tcpdump',
         '>', '/dev/null', '2>&1', ';', 'echo', '$?'],  // Output '1'.
        ['push', localTcpdump, '/data/local/tmp/tcpdump'],
        ['shell', 'su', '-c', 'chown', 'root', '/data/local/tmp/tcpdump'],
        ['shell', 'su', '-c', 'chmod', '6755', '/data/local/tmp/tcpdump'],
        ['shell', 'netcfg'],  // Output 'usb0 ...'.
        ['shell', 'su', '-c', '/data/local/tmp/tcpdump',
          '-i', 'usb0', '-p', '-s', '0', '-w',
          /\/sdcard\/\w+\.pcap/]);
    assertAdbCall();

    stop(pcap);
  });
});
