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

var child_process = require('child_process');
var events = require('events');
var sinon = require('sinon');
var should = require('should');
var wd_launcher_local_chrome = require('wd_launcher_local_chrome');


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('wd_launcher_local_chrome small', function() {
  'use strict';

  var sandbox;
  var fakeProcess, processSpawnStub;
  var chromedriver = '/gaga/chromedriver';

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    fakeProcess = new events.EventEmitter();
    fakeProcess.stdout = new events.EventEmitter();
    fakeProcess.stderr = new events.EventEmitter();
    fakeProcess.kill = sandbox.spy();
    processSpawnStub = sandbox.stub(child_process, 'spawn', function() {
      return fakeProcess;
    });
  });

  afterEach(function() {
    sandbox.verifyAndRestore();
  });

  it('should start and get killed', function() {
    var launcher =
        new wd_launcher_local_chrome.WdLauncherLocalChrome(chromedriver);
    should.ok(!launcher.isRunning());
    launcher.start({browserName: 'chrome'});
    should.ok(launcher.isRunning());
    should.equal('http://localhost:4444', launcher.getServerUrl());
    should.equal('http://localhost:1234/json', launcher.getDevToolsUrl());
    should.ok(processSpawnStub.calledOnce);
    processSpawnStub.firstCall.args[0].should.equal(chromedriver);
    processSpawnStub.firstCall.args[1].should.include('-port=4444');

    launcher.kill();
    should.ok(!launcher.isRunning());
    should.equal(undefined, launcher.getServerUrl());
    should.equal(undefined, launcher.getDevToolsUrl());
    should.ok(fakeProcess.kill.calledOnce);
  });

  it('should start and handle process self-exit', function() {
    var launcher =
        new wd_launcher_local_chrome.WdLauncherLocalChrome(chromedriver);
    should.ok(!launcher.isRunning());
    launcher.start({browserName: 'chrome'});
    should.ok(launcher.isRunning());
    should.equal('http://localhost:4444', launcher.getServerUrl());
    should.equal('http://localhost:1234/json', launcher.getDevToolsUrl());
    should.ok(processSpawnStub.calledOnce);
    processSpawnStub.firstCall.args[0].should.equal(chromedriver);
    processSpawnStub.firstCall.args[1].should.include('-port=4444');

    fakeProcess.emit('exit', /*code=*/0);
    should.ok(!launcher.isRunning());
    should.equal(undefined, launcher.getServerUrl());
    should.equal(undefined, launcher.getDevToolsUrl());
    should.ok(fakeProcess.kill.notCalled);
  });
});
