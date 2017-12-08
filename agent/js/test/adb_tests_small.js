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

var adb = require('adb');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var webdriver = require('selenium-webdriver');

describe('adb small', function() {
  'use strict';

  var sandbox;
  var app;
  var spawnStub;
  var serial = 'GAGA123';
  var adb_;

  /**
   * @param {Object} var_args
   */
  function assertAdbCall(var_args) {  // jshint unused:false
    spawnStub.assertCall.apply(spawnStub, (0 === arguments.length ? [] :
        ['adb', '-s', serial].concat(Array.prototype.slice.call(arguments))));
  }

  function assertAdbCalls(var_args) {  // jshint unused:false
    var i;
    for (i = 0; i < arguments.length; i += 1) {
      assertAdbCall.apply(undefined, arguments[i]);
    }
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    test_utils.fakeTimers(sandbox);
    // Create a new ControlFlow for each test.
    app = new webdriver.promise.ControlFlow();
    webdriver.promise.setDefaultFlow(app);
    process_utils.injectWdAppLogging('adb', app);

    spawnStub = test_utils.stubOutProcessSpawn(sandbox);
    adb_ = new adb.Adb(app, serial);
  });

  afterEach(function() {
    should.equal('[]', app.getSchedule());
    // Call unfakeTimers before verifyAndRestore, which may throw.
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
  });

  it('should parse netcfg output', function() {
    spawnStub.callback = function(proc, command, args) {
      command.should.match(/adb$/);
      args[args.length - 1].should.equal('netcfg');
      global.setTimeout(function() {
        proc.stdout.emit('data',
            'usb0 UP 192.168.1.68/28 0x00001002 02:00:00:00:00:01\r\n');
      }, 1);
      return false;
    };
    adb_.scheduleGetNetworkConfiguration().then(function(netcfg) {
      should.deepEqual(netcfg, [{
          name: 'usb0',
          isUp: true,
          ip: '192.168.1.68',
          mac: '02:00:00:00:00:01'
        }]);
    });
    test_utils.tickUntilIdle(app, sandbox);
    assertAdbCalls(['shell', 'netcfg']);
    spawnStub.assertCall();
  });

  /**
   * @param {boolean} expect_is_enabled
   * @param {string} netcfg_stdout
   */
  function testIsRndisEnabled(expect_is_enabled, netcfg_stdout) {
    spawnStub.callback = function(proc, command, args) {
      command.should.match(/adb$/);
      args[args.length - 1].should.equal('netcfg');
      global.setTimeout(function() {
        proc.stdout.emit('data', netcfg_stdout);
      }, 1);
      return false;
    };
    app.schedule('check rndis',
        adb_.scheduleAssertRndisIsEnabled.bind(adb_)).addBoth(function(e) {
      should.equal(undefined === e, expect_is_enabled);
    });
    test_utils.tickUntilIdle(app, sandbox);
    assertAdbCalls(['shell', 'netcfg']);
    spawnStub.assertCall();
  }

  it('should check if rndis is enabled', function() {
    var mac = '02:00:63:9e:ed:79';
    testIsRndisEnabled(false,
        'wlan0 UP 1.2.3.4/32 0x0 12:34:56:78:9a:bc');  // no rndis
    testIsRndisEnabled(false,
        'rndis0 DOWN 1.2.3.4/32 0x0 ' + mac);  // rndis down
    testIsRndisEnabled(false,
        'rndis0 UP 1.2.3.4/32 0x0 12:34:56:78:9a:bc');  // wrong MAC
    testIsRndisEnabled(true,
        'rndis0 UP 1.2.3.4/32 0x0 ' + mac);
  });

  it('should enable rndis', function() {
    var mac = '02:00:63:9e:ed:79';
    var netcfg = (
        'rndis0 DOWN 0.0.0.0/0 0x0 00:00:00:00:00:00\r\n' +
        'wlan0 UP 1.2.3.4/32 0x0 12:34:56:78:9a:bc');
    var props = {
        'sys.usb.conf': 'adb',
        'net.rndis0.dns1': '8.8.8.8',
        'net.rndis0.dns2': '8.8.4.4'
      };
    spawnStub.callback = function(proc, command, args) {
      command.should.match(/adb$/);
      var stdout;
      if ('echo x' === args[args.length - 1]) {
        stdout = 'x';
      } else if (-1 !== args.indexOf('getprop')) {
        stdout = props[args[args.length - 1]];
      } else if (-1 !== args.indexOf('netcfg')) {
        stdout = netcfg;
        netcfg = (
            'rndis0 UP 5.6.7.8/32 0x0 ' + mac + '\r\n' +
            'wlan0 DOWN 0.0.0.0/0 0x0 00:00:00:00:00:00');
      }
      if (undefined !== stdout) {
        proc.stdout.emit('data', stdout);
      }
      return false;
    };
    adb_.scheduleEnableRndis();
    test_utils.tickUntilIdle(app, sandbox);
    assertAdbCalls(
        ['shell', 'getprop', 'sys.usb.config'],
        ['shell', 'su', '-c', 'echo x'],
        ['shell', 'su', '-c', 'setprop sys.usb.config rndis,adb'],
        ['wait-for-device'],
        ['shell', 'netcfg'],
        ['shell', 'su', '-c', 'svc wifi disable'],
        ['shell', 'su', '-c', 'ifconfig wlan0 down'],
        ['shell', 'su', '-c', 'ifconfig rndis0 down'],
        ['shell', 'su', '-c', 'netcfg rndis0 hwaddr ' + mac],
        ['shell', 'su', '-c', 'ifconfig rndis0 up'],
        ['shell', 'su', '-c', 'netcfg rndis0 dhcp'],
        ['shell', 'getprop', 'net.rndis0.dns1'],
        ['shell', 'getprop', 'net.rndis0.dns2'],
        ['shell', 'su', '-c', 'ndc resolver setifdns rndis0 8.8.8.8 8.8.4.4'],
        ['shell', 'su', '-c', 'ndc resolver setdefaultif rndis0'],
        ['shell', 'netcfg']);
    spawnStub.assertCall();
  });

  it('should get the gateway address', function() {
    spawnStub.callback = function(proc) {
      proc.stdout.emit('data',
          'Iface   Destination Gateway     Flags   ...\r\n' +
          'rndis0  00000000    4E38220C    0003    ...\r\n' +
          'rndis0  4038220C    00000000    0001    ...\r\n');
    };
    adb_.scheduleGetGateway().then(function(ip) {
      should.equal(ip, '12.34.56.78');
    });
    test_utils.tickUntilIdle(app, sandbox);
    assertAdbCalls(['shell', 'cat', '/proc/net/route']);
    spawnStub.assertCall();
  });

  it('should ping', function() {
    spawnStub.callback = function(proc) {
      global.setTimeout(function() {
        proc.stdout.emit('data',
            'PING ...\r\n' +
            '64 bytes from ...\r\n' +
           '3 packets transmitted ...\r\n' +
           'rtt min/avg/max/mdev = 66.056/87.736/120.973/23.862 ms');
      }, 1);
    };
    adb_.schedulePing('1.2.3.4').then(function(rtt) {
      rtt.should.be.approximately(0.087736, 0.001);
    });
    test_utils.tickUntilIdle(app, sandbox);
    assertAdbCalls(['shell', 'ping', '-c3', '-i0.2', '-w5', '1.2.3.4']);
    spawnStub.assertCall();
  });
});
