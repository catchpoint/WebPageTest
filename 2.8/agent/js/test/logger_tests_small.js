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

var sinon = require('sinon');
var should = require('should');
var test_utils = require('./test_utils.js');
var logger = require('logger');

var stubs = [];
var WPT_SERVER = process.env.WPT_SERVER || 'http://localhost:8888';
var LOCATION = process.env.LOCATION || 'TEST';

describe('logger small', function() {
  afterEach(function() {
    test_utils.restoreStubs();
  });

  it('should be able to output to the error, warn, info, and log consoles zzz',
      function() {
        var consoleErrorSpy = sinon.spy();
        var consoleErrorStub = sinon.stub(console, 'error', consoleErrorSpy);
        test_utils.registerStub(consoleErrorStub);

        var consoleWarnSpy = sinon.spy();
        var consoleWarnStub = sinon.stub(console, 'warn', consoleWarnSpy);
        test_utils.registerStub(consoleWarnStub);

        var consoleInfoSpy = sinon.spy();
        var consoleInfoStub = sinon.stub(console, 'info', consoleInfoSpy);
        test_utils.registerStub(consoleInfoStub);

        var consoleLogSpy = sinon.spy();
        var consoleLogStub = sinon.stub(console, 'log', consoleLogSpy);
        test_utils.registerStub(consoleLogStub);

        var oldVerboseVar = process.env.WPT_VERBOSE;
        var oldMaxLogLevel = process.env.WPT_MAX_LOGLEVEL;
        process.env.WPT_MAX_LOGLEVEL = 99;
        process.env.WPT_VERBOSE = 'true';
        logger.log('error', 'error message');
        logger.log('warning', 'warning message');
        logger.log('info', 'info message');
        logger.log('extra', 'log message');
        process.env.WPT_MAX_LOGLEVEL = -1;
        logger.log('extra', 'log message');
        process.env.WPT_MAX_LOGLEVEL = 'extra';
        logger.log('extra', 'log message');
        process.env.WPT_MAX_LOGLEVEL = 'critical';
        logger.log('extra', 'log message');
        process.env.WPT_VERBOSE = oldVerboseVar;
        process.env.WPT_MAX_LOGLEVEL = oldMaxLogLevel;

        should.ok(consoleErrorSpy.withArgs('error: "error message"')
                                 .calledOnce);
        should.ok(consoleWarnSpy.withArgs('warning: "warning message"')
                                .calledOnce);
        should.ok(consoleInfoSpy.withArgs('info: "info message"').calledOnce);
        should.ok(consoleLogSpy.withArgs('extra: "log message"').calledTwice);
      });
});
