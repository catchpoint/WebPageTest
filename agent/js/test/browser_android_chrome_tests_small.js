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

var browser_android_chrome = require('browser_android_chrome');
var fs = require('fs');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var video_hdmi = require('video_hdmi');
var webdriver = require('selenium-webdriver');


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('browser_android_chrome small', function() {
  'use strict';

  var sandbox;
  var app;
  var spawnStub;
  var serverStub;
  var chromedriver = '/gaga/chromedriver-v2.4';
  var chromeApk = '/gaga/Chrome.apk';
  var serial = 'GAGA123';
  var videoCard = '2';

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

  var regExTest = /./.test;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    test_utils.fakeTimers(sandbox);
    // Create a new ControlFlow for each test.
    app = new webdriver.promise.ControlFlow();
    webdriver.promise.setDefaultFlow(app);
    process_utils.injectWdAppLogging('browser_android', app);

    spawnStub = test_utils.stubOutProcessSpawn(sandbox);
    var shellStub = test_utils.stubShell();
    spawnStub.callback = function(proc, command, args) {
      var keepAlive = false;
      if ((/chromedriver/).test(command)) {
        shellStub.addKeepAlive(proc);
        keepAlive = true;
      } else if ('xset' === command) {
        proc.stdout.emit('data', 'has display');
      } else if ((/adb/).test(command)) {
        if (args.some(regExTest.bind(/^shell$/)) &&
            args.some(regExTest.bind(/^ps$/))) {
          proc.stdout.emit('data',
              'USER PID PPID VSIZE RSS WCHAN PC NAME\n');
          proc.stdout.emit('data',
              'root 1 0 560 404 ffffffff 00000000 S /init\n');
        } else if (!args.some(regExTest.bind(/^force-stop$/)) &&
                   !args.some(regExTest.bind(/^dumpsys$/))) {
          // Ignore shell am force-stop and shell dumpsys *.
          keepAlive = shellStub.callback(proc, command, args);
        }
      } else {
        keepAlive = shellStub.callback(proc, command, args);
      }
      return keepAlive;
    };
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

  it('should install on first run, start, get killed', function() {
    startBrowser_({runNumber: 1, flags: {deviceSerial: serial,
        chrome: chromeApk}, task: {}});
    killBrowser_();
  });

  it('should not install on a non-first run, start, get killed', function() {
    startBrowser_({runNumber: 2, flags: {deviceSerial: serial,
        chrome: chromeApk}, task: {}});
    killBrowser_();
  });

  it('should use PAC server', function() {
    startBrowser_({runNumber: 1, flags: {deviceSerial: serial,
        chrome: chromeApk}, task: {pac: 'function FindProxyForURL...'}});
    killBrowser_();
  });

  it('should record video with the correct device type', function() {
    // Simulate adb shell getprop ro.product.device -> shmantra.
    spawnStub.callback = function(proc, command, args) {
      if (/adb$/.test(command) && -1 !== args.indexOf('ro.product.device')) {
        proc.stdout.emit('data', 'shmantra');
        return false;
      }
      return true;  // Keep capture alive.
    };
    var videoStart = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'scheduleStartVideoRecording');
    var videoStop = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'scheduleStopVideoRecording');
    browser = new browser_android_chrome.BrowserAndroidChrome(app,
        {runNumber: 1, flags: {deviceSerial: serial, chrome: chromeApk,
          videoCard: videoCard}, task: {}});
    browser.scheduleStartVideoRecording('test.avi');
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(spawnStub.calledOnce);
    should.ok(videoStart.calledOnce);
    test_utils.assertStringsMatch(
        ['test.avi', serial, 'shmantra', videoCard],
        videoStart.firstCall.args.slice(0, 4));
    should.ok(videoStop.notCalled);

    browser.scheduleStopVideoRecording();
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(spawnStub.calledOnce);
    should.ok(videoStart.calledOnce);
    should.ok(videoStop.calledOnce);
  });

  it('should start and kill chromedriver', function() {
    browser = new browser_android_chrome.BrowserAndroidChrome(app, {
      runNumber: 1,
      runTempDir: 'runtmp',
      flags: {
        deviceSerial: serial,
        chromedriver: chromedriver
      },
      task: {}
    });
    should.ok(!browser.isRunning());
    browser.startWdServer({browserName: 'chrome'});
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(browser.isRunning());
    browser.getServerUrl().should.match(/^http:\/\/localhost:\d+$/);
    should.equal(undefined, browser.getDevToolsUrl());  // No DevTools with WD.
    assertAdbCalls(['shell', 'ps'],
        ['shell', 'am', 'force-stop', /^com\.[\.\w]+/],
        ['shell', 'dumpsys', 'window', 'windows']);
    if (process.platform === 'linux') {
      spawnStub.assertCall('xset', 'q');
    }
    spawnStub.assertCall({0: chromedriver, 1: /^\-port=\d+/});
    var chromedriverProcess = spawnStub.lastCall.returnValue;
    spawnStub.assertCall();

    browser.kill();
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(!browser.isRunning());
    spawnStub.assertCalls({0: 'ps'}, {0: 'kill'});
    assertAdbCalls(['shell', 'ps'],
        ['shell', 'am', 'force-stop', /^com\.[\.\w]+/],
        ['shell', 'dumpsys', 'window', 'windows']);
    spawnStub.assertCall();
    should.equal(undefined, browser.getServerUrl());
    should.equal(undefined, browser.getDevToolsUrl());
    should.ok(chromedriverProcess.kill.calledOnce);
  });

  it('should take a screenshot', function() {
    spawnStub.callback = function(proc, command, args) {
      if (/adb$/.test(command) &&
          args.some(new RegExp().test.bind(/STORAGE/))) {  // Find storage dir.
        proc.stdout.emit('data', '/gagacard');
      }
      return false;
    };
    var screenshotCbSpy = sandbox.spy();
    browser = new browser_android_chrome.BrowserAndroidChrome(app, {
      runNumber: 1,
      runTempDir: 'runtmp',
      flags: {
        deviceSerial: serial,
        chromedriver: chromedriver
      },
      task: {}
    });
    browser.scheduleTakeScreenshot('gaga').then(screenshotCbSpy);
    test_utils.tickUntilIdle(app, sandbox);

    should.ok(screenshotCbSpy.calledOnce);
    ['runtmp/gaga.png'].should.eql(screenshotCbSpy.firstCall.args);
    assertAdbCalls(
        ['shell', /STORAGE/],  // Find storage dir.
        ['shell', 'screencap', '-p', /^\/gagacard/],
        ['pull', /^\/gagacard/, 'runtmp/gaga.png']);
    assertAdbCall();
  });

  /*
   * BrowserAndroidChrome wrapper:
   */

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
    var shellStub = test_utils.stubShell();
    spawnStub.callback = function(proc, command, args) {
      var keepAlive = false;
      var stdout;
      if (/adb$/.test(command)) {
        if (args.some(regExTest.bind(/^while true; do nc /))) {
          ncProc = proc;
          shellStub.addKeepAlive(ncProc);
          keepAlive = true;
        } else if ('echo x' === args[args.length - 1]) {
          stdout = 'x';
        } else if (args.some(regExTest.bind(/^shell$/)) &&
            args.some(regExTest.bind(/^ps$/))) {
          stdout = 'USER PID PPID VSIZE RSS WCHAN PC NAME\n' +
              'root 1 0 560 404 ffffffff 00000000 S /init\n';
        } else if (args.some(new RegExp().test.bind(/STORAGE/))) {
          stdout = '/gagacard';
        } else if (/^ls \/data\/data\//.test(args[args.length - 1])) {
          stdout = 'app_tabs\nfiles\ncache';
        }
      } else {
        keepAlive = shellStub.callback(proc, command, args);
      }
      if (undefined !== stdout) {
        proc.stdout.emit('data', stdout);
      }
      return keepAlive;
    };

    should.equal(undefined, browser);
    browser = new browser_android_chrome.BrowserAndroidChrome(app, args);
    should.equal('[]', app.getSchedule());
    should.ok(!browser.isRunning());

    browser.startBrowser();
    test_utils.tickUntilIdle(app, sandbox);
    assertAdbCalls(['shell', 'ps'],
        ['shell', 'am', 'force-stop', /^com\.[\.\w]+/],
        ['shell', 'dumpsys', 'window', 'windows']);
    if (1 === args.runNumber) {
      assertAdbCalls(
          ['uninstall', /com\.[\w\.]+/],
          ['install', '-r', chromeApk]);
    }
    if (args.task.pac) {
      assertAdbCall('push', /^[^\/]+\.pac_body$/, /^\/.*\/pac_body$/);
    }
    if (args.task.pac) {
      assertAdbCall('shell', 'su', '-c', 'echo x');
      assertAdbCall('shell', 'su', '-c',
          /^while true; do nc -l \d+ < \S+pac_body; done$/);
    }
    var flags = ['--no-first-run', '--disable-background-networking',
      '--no-default-browser-check', '--process-per-tab',
      '--allow-running-insecure-content', '--disable-fre',
      '--enable-benchmarking', '--metrics-recording-only',
      '--disable-geolocation', '--disable-external-intent-requests',
      '--disable-infobars', '--enable-remote-debugging'];
    if (args.task.pac) {
      flags.push('--proxy-pac-url=http://127.0.0.1:80/from_netcat');
    }
    assertAdbCalls(
        ['shell', /^\[\[ -w "\$EXTERNAL_STORAGE"/], // Output ''.
        ['push', 'wpt_chrome_command_line',
         '/gagacard/wpt_chrome_command_line']);
    if (!args.task.pac) {
      assertAdbCall('shell', 'su', '-c', 'echo x');
    }
    assertAdbCalls(
        ['shell', 'su', '-c',
            'cp /gagacard/wpt_chrome_command_line' +
            ' /data/local/chrome-command-line'],
        ['shell', 'rm', '/gagacard/wpt_chrome_command_line'],
        ['shell', 'su', '-c', 'chmod 666 /data/local/chrome-command-line'],
        ['shell', 'su', '-c', 'ls /data/data/com.android.chrome'],
        ['shell', 'su', '-c', 'rm -r /data/data/com.android.chrome/app_tabs'],
        ['shell', 'su', '-c', 'rm -r /data/data/com.android.chrome/files'],
        ['shell', 'su', '-c', 'rm -r /data/data/com.android.chrome/cache'],
        ['shell', 'su', '-c', 'ndc resolver flushdefaultif'],
        ['shell', 'am', 'start', '-n', /^com\.[\.\w]+/, '-d', 'about:blank'],
        ['forward', /tcp:\d+/, /^\w+/]);
    assertAdbCall();
    should.ok(browser.isRunning());
    (browser.getDevToolsUrl() || '').should.match(new RegExp(
        '^http:\\\/\\\/localhost:(' + Object.keys(serverStub.ports).join('|') +
            ')\\\/json$'));
    should.equal(undefined, browser.getServerUrl());
    should.equal(!!ncProc, !!args.task.pac);
    assertAdbCall();
  }

  function killBrowser_() {
    should.exist(browser);
    browser.kill();
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(!browser.isRunning());

    assertAdbCall('forward', '--remove', /^tcp:\d+$/);
    if (args.task.pac) {
      spawnStub.assertCalls({0: 'ps'}, {0: 'kill'});
      assertAdbCall('shell', 'rm', /^\/.*\/pac_body$/);
    }
    assertAdbCalls(['shell', 'ps'],
        ['shell', 'am', 'force-stop', /^com\.[\.\w]+/],
        ['shell', 'dumpsys', 'window', 'windows']);
    should.equal(undefined, browser.getServerUrl());
    should.equal(undefined, browser.getDevToolsUrl());
    if (args.task.pac) {
      should.ok(ncProc.kill.calledOnce);
    }
  }
});
