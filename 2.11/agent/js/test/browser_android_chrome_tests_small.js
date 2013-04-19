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
/*global describe: true, before: true, beforeEach: true, afterEach: true,
  it: true*/

var browser_android_chrome = require('browser_android_chrome');
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
  var processSpawnStub;
  var iVerifiedCall;
  var chromeApk = '/gaga/Chrome.apk';
  var serial = 'GAGA123';

  function assertAdbCall() {
    test_utils.assertStringsMatch(
        ['-s', serial].concat(Array.prototype.slice.call(arguments)),
        processSpawnStub.getCall(iVerifiedCall).args[1]);
    iVerifiedCall += 1;
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    test_utils.fakeTimers(sandbox);
    app.reset();  // We reuse the app across tests, clean it up.

    processSpawnStub = test_utils.stubOutProcessSpawn(sandbox);
    iVerifiedCall = 0;
  });

  afterEach(function() {
    // Call unfakeTimers before verifyAndRestore, which may throw.
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
  });

  it('should install on first run, start, get killed', function() {
    var browser = new browser_android_chrome.BrowserAndroidChrome(
        app, /*runNumber=*/1, serial, /*chromedriver=*/undefined, chromeApk);
    should.ok(!browser.isRunning());
    browser.startBrowser();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    assertAdbCall('uninstall', /com\.[\w\.]+/);
    assertAdbCall('install', '-r', chromeApk);
    assertAdbCall('shell', 'am', 'start', '-n', /^com\.[\.\w]+/);
    assertAdbCall('forward', /tcp:\d+/, /^\w+/);
    should.ok(browser.isRunning());
    should.equal(undefined, browser.getServerUrl());
    should.equal('http://localhost:1234/json', browser.getDevToolsUrl());
    should.equal(4, processSpawnStub.callCount);

    browser.kill();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    assertAdbCall('shell', 'am', 'force-stop', /^com\.[\.\w]+/);
    should.ok(!browser.isRunning());
    should.equal(undefined, browser.getServerUrl());
    should.equal(undefined, browser.getDevToolsUrl());
  });

  it('should not install on a non-first run, start, get killed', function() {
    var browser = new browser_android_chrome.BrowserAndroidChrome(
        app, /*runNumber=*/2, serial, /*chromedriver=*/undefined, chromeApk);
    should.ok(!browser.isRunning());
    browser.startBrowser({browserName: 'chrome'}, /*isFirstRun*/false);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    assertAdbCall('shell', 'am', 'start', '-n', /^com\.[\.\w]+/);
    assertAdbCall('forward', /tcp:\d+/, /^\w+/);
    should.ok(browser.isRunning());
    should.equal(undefined, browser.getServerUrl());
    should.equal('http://localhost:1234/json', browser.getDevToolsUrl());
    should.equal(2, processSpawnStub.callCount);

    browser.kill();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    assertAdbCall('shell', 'am', 'force-stop', /^com\.[\.\w]+/);
    should.ok(!browser.isRunning());
    should.equal(undefined, browser.getServerUrl());
    should.equal(undefined, browser.getDevToolsUrl());
  });

  it('should record video with the correct device type', function() {
    // Simulate adb shell getprop ro.product.device -> shmantra
    processSpawnStub.callback = function(proc, command, args) {
      if (/adb$/.test(command) && -1 !== args.indexOf('ro.product.device')) {
        global.setTimeout(function() {
          proc.stdout.emit('data', 'shmantra');
        }, 1);
      }
    };
    var videoStart = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'scheduleStartVideoRecording');
    var videoStop = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'stopVideoRecording');
    var browser = new browser_android_chrome.BrowserAndroidChrome(
        app, /*runNumber=*/1, serial, /*chromedriver=*/undefined, chromeApk);
    browser.scheduleStartVideoRecording('test.avi');
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    should.ok(processSpawnStub.calledOnce);
    should.ok(videoStart.calledOnce);
    test_utils.assertStringsMatch(
        ['test.avi', 'shmantra'], videoStart.firstCall.args);
    should.ok(videoStop.notCalled);

    browser.stopVideoRecording();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    should.ok(processSpawnStub.calledOnce);
    should.ok(videoStart.calledOnce);
    should.ok(videoStop.calledOnce);
  });
});
