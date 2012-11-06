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
/*jslint nomen:false */

/*global describe: true, before: true, afterEach: true, it: true*/

var child_process = require('child_process');
var logger = require('logger');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var system_commands = require('system_commands');
var test_utils = require('./test_utils.js');

describe('process_utils small', function() {
  'use strict';

  before(function() {
    process_utils.setSystemCommands();
  });

  afterEach(function() {
    test_utils.restoreStubs();
  });

  it('should kill all process in killPids', function() {
    var processInfos = [{ command: 'a', pid: 1 },
      { command: 'b', pid: 2 },
      { command: 'c', pid: 3 },
      { command: 'd', pid: 4 },
      { command: 'e', pid: 5 }];
    var childProcessExecSpy = sinon.spy();
    var childProcessExecStub = sinon.stub(child_process, 'exec',
        childProcessExecSpy);
    test_utils.registerStub(childProcessExecStub);

    process_utils.killPids(processInfos);

    should.equal(childProcessExecSpy.callCount, 5);
  });

  it('should be able to create a processInfo', function() {
    var processInfo = process_utils.processInfoFromPsLine('123 456 abc def');
    should.equal(processInfo.pid, '123');
    should.equal(processInfo.ppid, '456');
    should.equal(processInfo.command, 'abc def');
  });

  it('should be able to attempt to kill dangling processes', function() {
    var childProcessExecStub = sinon.stub(child_process, 'exec',
        function(command, callback) {
      callback(undefined, '123  4  abc\n456 4 def', '');
    });
    test_utils.registerStub(childProcessExecStub);

    var killChildTreeSpy = sinon.spy();
    var killChildTreeStub = sinon.stub(process_utils, 'killChildTree',
        killChildTreeSpy);
    test_utils.registerStub(killChildTreeStub);

    process_utils.killDanglingProcesses();

    should.equal(killChildTreeSpy.callCount, 2);
  });

  it('should be able to kill a process tree', function() {
    var processInfo = {pid: '4', ppid: '1', command: 'abc'};
    var firstFind = system_commands.get('find children', processInfo.pid);
    var childProcessExecCallCount = 0;
    var childProcessExecStub = sinon.stub(child_process, 'exec',
        function(command, callback) {
      logger.info('Running command: %s', command);
      // should.equal(command, findCommand);
      childProcessExecCallCount += 1;
      if (command === firstFind) {
        // Two child processes with the same ppid 4.
        callback(/*error=*/undefined, /*stdout=*/'123    4 def\n567 4 ghi', '');
      } else if (callback) {
        callback(/*error=*/undefined, /*stdout=*/'', '');
      }
    });
    test_utils.registerStub(childProcessExecStub);

    var killedPids = [];
    var killPidsStub = sinon.stub(process_utils, 'killPids',
        function(processInfos) {
      processInfos.forEach(function(processInfo) {
        logger.info('Stub kill %s, command: %s',
            processInfo.pid, processInfo.command);
        killedPids.push(processInfo.pid);
      });
    });
    test_utils.registerStub(killPidsStub);

    process_utils.killChildTree(processInfo);
    should.equal('567,123,4', killedPids.join());
  });
});
