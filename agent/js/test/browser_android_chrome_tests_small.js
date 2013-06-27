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
var browser_android_chrome = require('browser_android_chrome');
var fs = require('fs');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var video_hdmi = require('video_hdmi');
var webdriver = require('webdriver');


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('browser_android_chrome small', function() {
  'use strict';

  var app = webdriver.promise.Application.getInstance();
  process_utils.injectWdAppLogging('WD app', app);

  var sandbox;
  var spawnStub;
  var serverStub;
  var chromeApk = '/gaga/Chrome.apk';
  var serial = 'GAGA123';
  var videoCard = '2';

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
    serverStub = test_utils.stubCreateServer(sandbox);
    sandbox.stub(fs, 'exists', function(path, cb) { cb(true); });
    sandbox.stub(fs, 'unlink', function(path, cb) { cb(); });
    sandbox.stub(fs, 'writeFile', function(path, data, cb) { cb(); });
    reset_();
  });

  afterEach(function() {
    should.equal('[]', app.getSchedule());
    // Call unfakeTimers before verifyAndRestore, which may throw.
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
  });

  it('should remove \\r\'s from adb binout', function() {
    // unit tests as pairs of hexIn: hexOut
    var in2out = {'12': '12', '': '', '0d': '0d', '0a': '0a', '0a0d': '0a0d',
        '0d0a': '0a', '0d0a0d0a' : '0a0a', '70d0a6': '70d0a6', 'ab0d': 'ab0d',
        '120d0a34': '120a34', '0d0a0d0aff0d0a0d0a': '0a0aff0a0a',
        '120d0a340d0a560d780d0d0a90': '120a340a560d780d0a90'
    };
    var adb_ = new adb.Adb();
    var hexIn;
    for (hexIn in in2out) {
      var hexOut = adb_.dos2unix(new Buffer(hexIn, 'hex')).toString('hex');
      should.equal(hexOut, in2out[hexIn], hexIn);
    }
  });

  it('should install on first run, start, get killed', function() {
    startBrowser_({deviceSerial: serial, runNumber: 1, chrome: chromeApk});
    killBrowser_();
  });

  it('should not install on a non-first run, start, get killed', function() {
    startBrowser_({deviceSerial: serial, runNumber: 2, chrome: chromeApk});
    killBrowser_();
  });

  it('should use PAC server', function() {
    startBrowser_({deviceSerial: serial, runNumber: 1, chrome: chromeApk,
        pac: 'function FindProxyForURL...'});
    killBrowser_();
  });

  it('should record video with the correct device type', function() {
    // Simulate adb shell getprop ro.product.device -> shmantra
    spawnStub.callback = function(proc, command, args) {
      if (/adb$/.test(command) && -1 !== args.indexOf('ro.product.device')) {
        global.setTimeout(function() {
          proc.stdout.emit('data', 'shmantra');
        }, 1);
        return false;
      } else {
        return true; // keep capture alive
      }
    };
    var videoStart = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'scheduleStartVideoRecording');
    var videoStop = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'scheduleStopVideoRecording');
    browser = new browser_android_chrome.BrowserAndroidChrome(app,
        {deviceSerial: serial, runNumber: 1, chrome: chromeApk,
        videoCard: videoCard});
    browser.scheduleStartVideoRecording('test.avi');
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    should.ok(spawnStub.calledOnce);
    should.ok(videoStart.calledOnce);
    test_utils.assertStringsMatch(
        ['test.avi', serial, 'shmantra', videoCard],
        videoStart.firstCall.args.slice(0, 4));
    should.ok(videoStop.notCalled);

    browser.scheduleStopVideoRecording();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    should.ok(spawnStub.calledOnce);
    should.ok(videoStart.calledOnce);
    should.ok(videoStop.calledOnce);
  });

  //
  // BrowserAndroidChrome wrapper:
  //

  var args;
  var browser;
  var ncProc;

  function reset_() {
    args = undefined;
    browser = undefined;
  }

  function startBrowser_(argv) {
    should.equal(undefined, args);
    args = argv;

    ncProc = undefined;
    spawnStub.callback = function(proc, command, args) {
      var isNetcat = (/adb$/.test(command) && args.some(function(arg) {
        return (/^while true; do nc /.test(arg));
      }));
      ncProc = (isNetcat ? proc : ncProc);
      return isNetcat; // keep alive
    };

    should.equal(undefined, browser);
    browser = new browser_android_chrome.BrowserAndroidChrome(app, args);
    should.equal('[]', app.getSchedule());
    should.ok(!browser.isRunning());

    browser.startBrowser();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 14);
    if (1 === args.runNumber) {
      assertAdbCalls(
          ['uninstall', /com\.[\w\.]+/],
          ['install', '-r', chromeApk]);
    } else {
      assertAdbCall('shell', 'am', 'force-stop', /^com\.[\.\w]+/);
    }
    if (args.pac) {
      assertAdbCalls(
        ['push', /^[^\/]+\.pac_body$/, /^\/.*\/pac_body$/],
        ['shell', 'su', '-c',
            /^while true; do nc -l \d+ < \S+pac_body; done$/]);
    }
    var flags = ['--disable-fre', '--metrics-recording-only',
       '--enable-remote-debugging'];
    if (args.pac) {
      flags.push('--proxy-pac-url=http://127.0.0.1:80/from_netcat');
    }
    assertAdbCalls(
        ['shell', 'su', '-c', 'echo \\"chrome ' + flags.join(' ') +
            '\\" > /data/local/chrome-command-line'],
        ['shell', 'su', '-c',
            'rm /data/data/com.google.android.apps.chrome_dev/files/tab*'],
        ['shell', 'am', 'start', '-n', /^com\.[\.\w]+/, '-d', 'about:blank'],
        ['forward', /tcp:\d+/, /^\w+/]);
    assertAdbCall();
    should.ok(browser.isRunning());
    (browser.getDevToolsUrl() || '').should.match(new RegExp(
        '^http:\\\/\\\/localhost:(' + Object.keys(serverStub.ports).join('|') +
        ')\\\/json$'));
    should.equal(undefined, browser.getServerUrl());
    should.equal(!!ncProc, !!args.pac);
    assertAdbCall();
  }

  function killBrowser_() {
    should.exist(browser);
    browser.kill();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 5);
    should.equal('[]', app.getSchedule());
    should.ok(!browser.isRunning());

    if (args.pac) {
      assertAdbCall('shell', 'rm', /^\/.*\/pac_body$/);
    }
    assertAdbCall('shell', 'am', 'force-stop', /^com\.[\.\w]+/);
    assertAdbCall();
    should.equal(undefined, browser.getServerUrl());
    should.equal(undefined, browser.getDevToolsUrl());
    if (args.pac) {
      should.ok(ncProc.kill.calledOnce);
    }
  }
});
