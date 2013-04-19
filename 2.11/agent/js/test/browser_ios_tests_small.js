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

var browser_ios = require('browser_ios');
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
describe('browser_ios small', function() {
  'use strict';

  var app = webdriver.promise.Application.getInstance();
  process_utils.injectWdAppLogging('WD app', app);

  var sandbox;
  var spawnStub;
  var ideviceDir = '/gaga/ios/darwin';
  var serial = 'GAGA123';

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    test_utils.fakeTimers(sandbox);
    app.reset();  // We reuse the app across tests, clean it up.

    spawnStub = test_utils.stubOutProcessSpawn(sandbox);
    spawnStub.callback = function(proc, cmd, args) {
      var keepRunning = !/^ssh|idevice/.test(cmd);
      if (args && -1 !== args.indexOf('killall')) {
        global.setTimeout(function() {
          proc.emit('exit', 1);  // Simulate ssh killall exit code 1.
        }, 5);
        keepRunning = true;  // Suppress the stub's own emit('exit').
      } else if (args && -1 !== args.indexOf('ProductType')) {
        global.setTimeout(function() {
          proc.stdout.emit('data', 'iPhone666\n');
        }, 1);
      }
      return keepRunning;
    };
  });

  afterEach(function() {
    // Call unfakeTimers before verifyAndRestore, which may throw.
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
  });

  function verifyClearCacheAndUrlOpen(startCallNum, sshCertMatch) {
    var sshMatch = ['-p', /^\d+$/, '-i', sshCertMatch, 'root@localhost'];
    should.equal('ssh', spawnStub.getCall(startCallNum).args[0]);
    test_utils.assertStringsMatch(
        sshMatch.concat(['killall', 'MobileSafari']),
        spawnStub.getCall(startCallNum).args[1]);
    should.equal('ssh', spawnStub.getCall(startCallNum + 1).args[0]);
    test_utils.assertStringsMatch(
        sshMatch.concat(['rm', '-rf',
          /\/Cache\.db$/, /\/SuspendState\.plist$/, /\/LocalStorage$/,
          /\/ApplicationCache\.db$/, /\/Cookies\.binarycookies/]),
        spawnStub.getCall(startCallNum + 1).args[1]);
    spawnStub.getCall(startCallNum + 2).args[0]
        .should.match(/idevice-app-runner$/);
    test_utils.assertStringsMatch(
        ['-u', serial, '-r', 'com.google.openURL', '--args', /^http:/],
        spawnStub.getCall(startCallNum + 2).args[1]);
    return startCallNum + 3;
  }

  it('should start and get killed with default environment', function() {
    var browser = new browser_ios.BrowserIos(app, /*runNumber=*/1, serial);
    should.ok(!browser.isRunning());
    browser.startBrowser({browserName: 'safari'}, /*isFirstRun=*/true);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    should.ok(browser.isRunning());
    should.equal('http://localhost:9222/json', browser.getDevToolsUrl());

    var nextCallNum = verifyClearCacheAndUrlOpen(/*startCallNum=*/0, /\/id_/);
    spawnStub.getCall(nextCallNum).args[0].should.match(/proxy$/);
    var proxyFakeProcess = spawnStub.getCall(nextCallNum).returnValue;
    should.ok(proxyFakeProcess.kill.notCalled);
    nextCallNum += 1;
    // Ran no other child processes.
    should.equal(nextCallNum, spawnStub.callCount);

    browser.kill();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    should.ok(!browser.isRunning());
    should.equal(undefined, browser.getServerUrl());
    should.equal(undefined, browser.getDevToolsUrl());
    should.equal(nextCallNum, spawnStub.callCount);  // Kill is a no-op.
    should.ok(proxyFakeProcess.kill.calledOnce);
  });

  it('should start and get killed with full environment', function() {
    var sshCert = '/home/user/.ssh/my_cert';
    var appPath = '/apps/urlOpener.ipa';
    var browser = new browser_ios.BrowserIos(app, /*runNumber=*/1, serial,
        ideviceDir, '/python/proxy', /*sshLocalPort=*/1234, sshCert, appPath);
    should.ok(!browser.isRunning());
    browser.startBrowser({browserName: 'safari'}, /*isFirstRun=*/true);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    should.ok(browser.isRunning());
    should.equal('http://localhost:9222/json', browser.getDevToolsUrl());

    should.equal('python', spawnStub.getCall(0).args[0]);
    test_utils.assertStringsMatch(
        ['-B', '-OO', '-m', 'tcprelay', '-t', '22:GAGA123:1234'],
        spawnStub.getCall(0).args[1]);
    var forwardFakeProcess = spawnStub.getCall(0).returnValue;
    spawnStub.getCall(1).args[0].should.match(/ideviceinstaller$/);
    test_utils.assertStringsMatch(
        ['-U', serial, '-i', appPath], spawnStub.getCall(1).args[1]);
    var nextCallNum = verifyClearCacheAndUrlOpen(/*startCallNum=*/2, sshCert);
    spawnStub.getCall(nextCallNum).args[0].should.match(/proxy$/);
    var proxyFakeProcess = spawnStub.getCall(nextCallNum).returnValue;
    should.ok(proxyFakeProcess.kill.notCalled);
    should.ok(forwardFakeProcess.kill.notCalled);
    nextCallNum += 1;
    // Ran no other child processes.
    should.equal(nextCallNum, spawnStub.callCount);

    browser.kill();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    should.ok(!browser.isRunning());
    should.equal(undefined, browser.getServerUrl());
    should.equal(undefined, browser.getDevToolsUrl());
    should.equal(nextCallNum, spawnStub.callCount);
    should.ok(forwardFakeProcess.kill.calledOnce);
    should.ok(proxyFakeProcess.kill.calledOnce);
  });

  it('should record video with the correct device type', function() {
    var videoStart = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'scheduleStartVideoRecording');
    var videoStop = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'stopVideoRecording');
    var browser = new browser_ios.BrowserIos(app, /*runNumber=*/1, serial);
    browser.scheduleStartVideoRecording('test.avi');
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    should.ok(spawnStub.calledOnce);
    should.ok(videoStart.calledOnce);
    test_utils.assertStringsMatch(
        ['test.avi', 'iPhone666'], videoStart.firstCall.args);
    should.ok(videoStop.notCalled);

    browser.stopVideoRecording();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 4);
    should.ok(spawnStub.calledOnce);
    should.ok(videoStart.calledOnce);
    should.ok(videoStop.calledOnce);
  });
});
