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
/*global after: true, describe: true, before: true, afterEach: true, it: true*/

var child_process = require('child_process');
var events = require('events');
var sinon = require('sinon');
var should = require('should');
var util = require('util');
var agent_main = require('agent_main');
var test_utils = require('./test_utils.js');

describe('agent_main', function() {
  'use strict';

  before(function() {
    agent_main.setSystemCommands();
  });

  afterEach(function() {
    test_utils.restoreStubs();
  });

  it('should cleanup job on timeout', function() {
    function Client() {}
    util.inherits(Client, events.EventEmitter);
    Client.prototype.run = function() { };
    var client = new Client();

    var cleanupJobSpy = sinon.spy();
    var cleanupJobStub = sinon.stub(agent_main, 'cleanupJob',
      cleanupJobSpy);
    test_utils.registerStub(cleanupJobStub);

    agent_main.run(client, {});

    client.emit('timeout', 'e');

    should.ok(cleanupJobSpy.calledOnce);
  });
});
