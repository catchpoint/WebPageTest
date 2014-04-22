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

var browser_ios = require('browser_ios');
var fs = require('fs');
var http = require('http');
var net = require('net');
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
describe('browser_ios small', function() {
  'use strict';

  var sandbox;
  var app;
  var spawnStub;
  var videoStart;
  var videoStop;

  var glob = '/private/var/mobile/Applications/*/MobileSafari.app/Info.plist';

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    test_utils.fakeTimers(sandbox);
    // Create a new ControlFlow for each test.
    app = new webdriver.promise.ControlFlow();
    webdriver.promise.setDefaultFlow(app);
    process_utils.injectWdAppLogging('browser_ios', app);

    spawnStub = test_utils.stubOutProcessSpawn(sandbox);
    spawnStub.callback = spawnCallback_;
    videoStart = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'scheduleStartVideoRecording');
    videoStop = sandbox.stub(
        video_hdmi.VideoHdmi.prototype, 'scheduleStopVideoRecording');
    [http, net].forEach(function(mod) {
      test_utils.stubCreateServer(sandbox, mod);
    });
    sandbox.stub(fs, 'exists', function(path, cb) { cb(false); });
    sandbox.stub(fs, 'readFile', function(path, cb) {
      cb(new Error('no plist'));
    });
    sandbox.stub(fs, 'unlink', function(path, cb) { cb(); });
    reset_();
  });

  afterEach(function() {
    // Call unfakeTimers before verifyAndRestore, which may throw.
    should.equal('[]', app.getSchedule());
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
  });

  it('should start and get killed with default environment', function() {
    startBrowser_({runNumber: 1, flags: {deviceSerial: 'GAGA123'}, task: {}});
    killBrowser_();
  });

  it('should start and get killed with full environment', function() {
    startBrowser_({runNumber: 1, flags: {
        deviceSerial: 'GAGA123',
        iosDeviceDir: '/gaga/ios/darwin',
        iosSshProxyDir: '/python/proxy',
        iosSshCert: '/home/user/.ssh/my_cert',
        iosUrlOpenerApp: '/apps/urlOpener.ipa'
      }, task: {}});
    killBrowser_();
  });

  it('should use PAC server', function() {
    startBrowser_({runNumber: 1, flags: {deviceSerial: 'GAGA123'},
        task: {pac: 'function FindProxyForURL...'}});
    killBrowser_();
  });

  it('should record video with the correct device type', function() {
    startBrowser_({runNumber: 1, flags: {deviceSerial: 'GAGA123',
        videoCard: 2}, task: {}});
    startVideo_();
    stopVideo_();
    killBrowser_();
  });

  it('should take a screenshot', function() {
    var screenshotCbSpy = sandbox.spy();
    browser = new browser_ios.BrowserIos(app,
        {runNumber: 1, runTempDir: 'runtmp',
        flags: {deviceSerial: 'GAGA123'}, task: {}});
    browser.scheduleTakeScreenshot('gaga').then(screenshotCbSpy);
    sandbox.clock.tick(webdriver.promise.ControlFlow.EVENT_LOOP_FREQUENCY * 10);

    should.ok(screenshotCbSpy.calledOnce);
    ['runtmp/gaga.png'].should.eql(screenshotCbSpy.firstCall.args);
    spawnStub.assertCalls(
        ['idevicescreenshot', '-u', 'GAGA123'],
        {0: /convert$/, '-1': 'runtmp/gaga.png'}
      );
    spawnStub.assertCall();
  });

  /*
   * IosBrowser wrapper:
   */

  var args;
  var browser;
  var proxyFakeProcess;

  function reset_() {
    args = undefined;
    browser = undefined;
    proxyFakeProcess = undefined;
  }

  function spawnCallback_(proc, cmd, argv) {
    var stdout;
    if ('ssh' === cmd) {
      var argN = argv[argv.length - 1];
      if (/^echo\s+list\s+Setup.*scutil$/.test(argN)) {
        stdout = 'subKey [123] = foo';
      } else if (/^test\s+-f\s+(\S+)\s*|\s*ls\s+\1$/.test(argN)) {
        var path = argN.split(/\s/)[2].trim();
        stdout = (path === glob ? glob.replace('*', 'MyApp') : '');
      } else {
        stdout = '';
      }
    } else if ('scp' === cmd) {
      stdout = '';
    } else if (/idevice[-_a-z2]+$/.test(cmd)) {
      if (/ideviceinstaller$/.test(cmd)) {
        stdout = 'Install - Complete';
      } else if (/idevice-app-runner$/.test(cmd)) {
        if (-1 !== argv.indexOf('check_gdb')) {
          proc.stderr.emit('data', 'Unknown APPID (check_gdb) is not in:\n');
          global.setTimeout(function() {
            ['exit', 'close'].forEach(function(evt) {
              proc.emit(evt, 1);
            });
          }, 5);
          return true; // disable exit(0)
        } else if (-1 !== argv.indexOf('com.google.openURL')) {
          stdout = '';
        }
      } else if (/ideviceinfo$/.test(cmd) &&
          (-1 !== argv.indexOf('ProductType'))) {
        stdout = 'iPhone666';
      } else if (/idevicescreenshot$/.test(cmd)) {
        stdout = 'Screenshot saved to screenshot-2012-12-24-00-00-00.tiff';
      }
    } else if (/ios_webkit_debug_proxy$/.test(cmd)) {
      return true; // keep alive
    } else if (/convert$/.test(cmd)) {  // Convert tiff -> png.
      stdout = '';
    }
    if (undefined === stdout) {
      should.fail('Unexpected ' + cmd + ' ' + (argv || []).join(' '));
    }
    if (stdout) {
      proc.stdout.emit('data', stdout);
    }
    return false; // exit with success
  }

  function startBrowser_(argv) {
    should.equal(undefined, args);
    args = argv;

    should.equal(undefined, browser);
    browser = new browser_ios.BrowserIos(app, args);
    should.equal('[]', app.getSchedule());
    should.ok(!browser.isRunning());

    browser.startBrowser();
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(browser.isRunning());

    var serial = args.flags.deviceSerial;
    spawnStub.assertCall(/idevice-app-runner$/, '-U', serial, '-r',
        'check_gdb');

    if (1 === args.runNumber) {
      var appPath = (args.flags.iosUrlOpenerApp || 'urlOpener.ipa');
      spawnStub.assertCall(/ideviceinstaller$/, '-U', serial, '-i', appPath);
    }

    var proxy = ['-F', '/dev/null', '-i', /^\//, '-o',
        (/^ProxyCommand="[^"]+"\s+-u\s+%h$/), '-o', 'User=root'];
    var sshMatch = [(/ssh$/)].concat(proxy).concat([serial]);
    var lib = '/private/var/mobile/Applications/MyApp/Library/';
    spawnStub.assertCalls(
        sshMatch.concat(['killall', 'MobileSafari']),
        sshMatch.concat(['test -f ' + glob + ' | ls ' + glob]),
        sshMatch.concat(['rm', '-rf',
          lib + 'Caches/com.apple.mobilesafari/Cache.db',
          lib + 'Caches/fsCachedData/*',
          lib + 'Safari/History.plist',
          lib + 'Safari/SuspendState.plist',
          lib + 'WebKit/LocalStorage',
          '/private/var/mobile/Library/Cookies/Cookies.binarycookies']));
    if (args.task.pac) {
      spawnStub.assertCalls(
          sshMatch.concat(['-R', /^\d+:127.0.0.1:\d+$/, '-N']));
    }

    var localPref = /^[^@:\s]+\.plist$/;
    var remotePref = new RegExp('^' + serial + ':[^@:\\s]+\\.plist$');
    spawnStub.assertCalls(
        sshMatch.concat([(/^echo\s+list\s+Setup[^\|]+|\s*scutil$/)]),
        sshMatch.concat([new RegExp(
            '^echo\\s+-e\\s+.*' +
            (args.task.pac ?
              'd.add\\s+Proxy\\S+\\s+\\S+\/proxy.pac' :
              'd.remove\\s+Proxy') +
            '.*|\\s*scutil$')]),
        [(/scp$/)].concat(proxy).concat([remotePref, localPref]),
        [(/scp$/)].concat(proxy).concat([localPref, remotePref]));

    spawnStub.assertCall(/idevice-app-runner$/, '-u', serial, '-r',
        'com.google.openURL', '--args', /^http:/);

    var devToolsPattern = /^http:\/\/localhost:(\d+)\/json$/;
    browser.getDevToolsUrl().should.match(devToolsPattern);
    var devToolsPort = browser.getDevToolsUrl().match(devToolsPattern)[1];

    spawnStub.assertCall(/ios_webkit_debug_proxy$/, '-c',
        new RegExp('^' + serial + ':' + devToolsPort + '$'));
    spawnStub.assertCall();

    proxyFakeProcess = spawnStub.lastCall.returnValue;
    should.ok(proxyFakeProcess.kill.notCalled);
  }

  function startVideo_() {
    browser.scheduleStartVideoRecording('test.avi');
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(videoStart.calledOnce);
    spawnStub.assertCall(/ideviceinfo$/, '-k', 'ProductType', '-u',
        args.flags.deviceSerial);
    spawnStub.assertCall();
    test_utils.assertStringsMatch(
        ['test.avi', args.flags.deviceSerial,
         'iPhone666', args.flags.videoCard],
        videoStart.firstCall.args.slice(0, 4));
    should.ok(videoStop.notCalled);
  }

  function stopVideo_() {
    browser.scheduleStopVideoRecording();
    test_utils.tickUntilIdle(app, sandbox);
    spawnStub.assertCall();
    should.ok(videoStart.calledOnce);
    should.ok(videoStop.calledOnce);
  }

  function killBrowser_() {
    should.exist(browser);
    browser.kill();
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(!browser.isRunning());

    should.equal(undefined, browser.getServerUrl());
    should.equal(undefined, browser.getDevToolsUrl());
    if (args.task.pac) {
      spawnStub.assertCalls(
         {0: 'ssh', '-1': /^echo\s+list\+Setup.*|\s*scutil$/},
         {0: 'ssh', '-1': /^echo\s+-e\+.*d.remove\s+Proxy.*|\s*scutil$/},
         {0: 'scp', '-1': /^[^:]*\.plist/},
         {0: 'scp', '-1': /:\/.*\.plist/});
    }
    spawnStub.assertCall();
    should.ok(proxyFakeProcess.kill.calledOnce);
    proxyFakeProcess = undefined;
  }
});
