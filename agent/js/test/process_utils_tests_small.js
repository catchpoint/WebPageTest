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
/*global describe:true, before:true, beforeEach:true, afterEach:true, it:true*/

var child_process = require('child_process');
var logger = require('logger');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');

describe('process_utils small', function() {
  'use strict';

  var sandbox;

  before(function() {
    process_utils.setSystemCommands();
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.verifyAndRestore();
  });

  it('should create a ProcessInfo', function() {
    var processInfo = new process_utils.ProcessInfo('123 456 abc def');
    should.equal('123', processInfo.ppid);
    should.equal('456', processInfo.pid);
    should.equal('abc def', processInfo.command);

    // Moar whitespaces plz!
    processInfo = new process_utils.ProcessInfo('  123   456    abc   def');
    should.equal('123', processInfo.ppid);
    should.equal('456', processInfo.pid);
    should.equal('abc def', processInfo.command);
  });

  it('should kill all process in killProcesses', function() {
    var processInfos = [
        new process_utils.ProcessInfo('0 1 a'),
        new process_utils.ProcessInfo('0 2 b'),
        new process_utils.ProcessInfo('0 3 c'),
        new process_utils.ProcessInfo('0 4 d'),
        new process_utils.ProcessInfo('0 5 e')];
    var numKilled = 0;
    sandbox.stub(child_process, 'exec',
        function(command, callback) {
      logger.info('Stub exec: %s', command);
      numKilled += 1;
      callback(undefined, '', '');
    });

    var doneSpy = sandbox.spy();
    process_utils.killProcesses(processInfos, doneSpy);
    should.ok(doneSpy.calledOnce);
    should.equal(5, numKilled);
  });

  it('should kill dangling processes', function() {
    sandbox.stub(child_process, 'exec',
        function(command, callback) {
      logger.info('Stub exec: %s', command);
      if (/[0-9]/.test(command)) {  // Get children: command has a PID
        callback(undefined, '', '');
      } else {  // List top dangling processes
        callback(undefined, ' 1  123  abc\n1 456 def', '');
      }
    });

    var capturedChildProcesses = [];
    sandbox.stub(process_utils, 'killProcessTrees',
        function(childProcesses, callback) {
      should.equal(0, capturedChildProcesses.length);  // Called only once
      capturedChildProcesses = childProcesses;
      callback();
    });

    var doneSpy = sandbox.spy();
    process_utils.killDanglingProcesses(doneSpy);
    should.ok(doneSpy.calledOnce);
    should.equal(2, capturedChildProcesses.length);
    should.equal('123', capturedChildProcesses[0].pid);
    should.equal('456', capturedChildProcesses[1].pid);
  });
});
