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

var child_process = require('child_process');
var fs = require('fs');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var webdriver = require('webdriver');
var video_hdmi = require('video_hdmi');


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('video_hdmi small', function() {
  'use strict';

  var app = webdriver.promise.Application.getInstance();
  process_utils.injectWdAppLogging('WD app', app);

  var sandbox;
  var videoCommand = '/video/record';

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    test_utils.fakeTimers(sandbox);
    app.reset();  // We reuse the app across tests, clean it up.
  });

  afterEach(function() {
    // Call unfakeTimers before verifyAndRestore, which may throw.
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
  });

  it('should start and stop video recording', function() {
    var serial = 'GAGA123';
    var pid = 7;

    var fakeCaptureProc;
    var processSpawnStub = test_utils.stubOutProcessSpawn(sandbox);
    processSpawnStub.callback = function(proc, command) {
      if (videoCommand === command) {
        proc.pid = pid;
        fakeCaptureProc = proc;
        return true; // keep alive
      }
    };
    // Check for existence of the video record script
    var fsExistsStub = sandbox.stub(fs, 'exists', function(path, cb) {
      global.setTimeout(function() {
        cb(videoCommand === path);
      }, 1);
    });

    var killCount = 0;
    sandbox.stub(child_process, 'exec', function(command, callback) {
      if (/^ps\s/.test(command)) {
        var want_all = (/^ps(\s+-o\s+\S+)*$/.test(command));
        var want_pid = (want_all ||
            (new RegExp('^ps\\s+-p\\s' + pid + '\\s')).test(command));
        var want_ppid = (want_all || (new RegExp(
            '^ps\\s[^|]*\\|\\s+grep\\s+"\\^\\s+\\*' + pid + '\\s')).test(
            command));
        var lines = [];
        if (want_pid) {
          lines.push('1 ' + pid + ' ' + videoCommand + ' -f foo -s ' + serial +
              ' x');
        }
        if (want_all) {
          lines.push('1 ' + (pid + 100) + ' ignoreMe');
        }
        if (want_ppid) {
          lines.push(pid + ' ' + (pid + 10) + ' raw_capture');
        }
        callback(undefined, lines.join('\n'), '');
      } else if (/^kill\s/.test(command)) {
        if ((new RegExp('^kill\\s+(-\\d+\\s+)?' + pid + '$')).test(command) &&
            fakeCaptureProc) {
          fakeCaptureProc.emit('exit', undefined, 'SIGAGA');
          fakeCaptureProc = undefined;
        }
        killCount += 1;
        callback(undefined, '', '');
      } else {
        should.fail('Unexpected command: ' + command);
      }
    });

    should.equal('[]', app.getSchedule());
    var videoFile = 'test.avi';
    var deviceType = 'shmantra';
    var videoCard = '2';

    var video = new video_hdmi.VideoHdmi(app, videoCommand);
    should.equal('[]', app.getSchedule());
    video.scheduleStartVideoRecording(videoFile, serial, deviceType, videoCard);
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    should.equal('[]', app.getSchedule());
    should.equal(1, killCount);
    processSpawnStub.assertCall(videoCommand, '-f', videoFile, '-s', serial,
         '-t', deviceType, '-d', videoCard, '-w');
    should.ok(fsExistsStub.calledOnce);

    // Watch for IDLE -- make sure the wait for recording exit has finished.
    var idleSpy = sandbox.spy();
    app.on(webdriver.promise.Application.EventType.IDLE, idleSpy);
    video.scheduleStopVideoRecording();
    sandbox.clock.tick(webdriver.promise.Application.EVENT_LOOP_FREQUENCY * 10);
    should.equal('[]', app.getSchedule());
    should.equal(3, killCount);
    should.equal(undefined, fakeCaptureProc);
    processSpawnStub.assertCall();
    should.ok(idleSpy.calledOnce);
  });
});
