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
/*global describe: true, before: true, afterEach: true, it: true*/

var sinon = require('sinon');
var should = require('should');
var events = require('events');
var http = require('http');
var url = require('url');
var util = require('util');
var devtools = require('devtools');
var test_utils = require('./test_utils');

describe('devtools small', function() {
  'use strict';

  afterEach(function() {
    test_utils.restoreStubs();
  });

  it('should be able to correctly process a response', function() {
    var responseBody1 = 'body1';
    var responseBody2 = 'body2';

    var setEncodingSpy = sinon.spy();
    function ResponseType() {
      events.EventEmitter.call(this);
    }
    util.inherits(ResponseType, events.EventEmitter);
    ResponseType.prototype.setEncoding = setEncodingSpy;
    var response = new ResponseType();

    var callbackSpy = sinon.spy();
    devtools.ProcessResponse(response, callbackSpy);

    response.emit('data', responseBody1);
    response.emit('data', responseBody2);
    response.emit('end');
    response.emit.bind(response, 'error').should.throwError();
    should.ok(callbackSpy.calledOnce);
    should.equal(callbackSpy.args[0][0], responseBody1 + responseBody2);
  });

  it('should be able to attempt to connect to devtools', function() {
    var devtoolsUrl = 'http://devtools.com/';
    var debuggerUrl = 'http://someurl.com:1337';
    var getResponse = '[{ "webSocketDebuggerUrl": "' + debuggerUrl + '"}]';
    var httpStub = sinon.stub(http, 'get', function(getUrl, callback) {
      should.equal(getUrl.href, url.parse(devtoolsUrl).href);
      callback(getResponse, callback);
    });
    test_utils.registerStub(httpStub);

    var processResponseStub = sinon.stub(devtools, 'ProcessResponse',
        function(response, callback) {
      callback(response);
    });
    test_utils.registerStub(processResponseStub);


    var myDevtools = new devtools.DevTools(devtoolsUrl);

    var connectDebuggerSpy = sinon.spy();
    var connectDebuggerStub = sinon.stub(myDevtools, 'connectDebugger_',
        connectDebuggerSpy);
    test_utils.registerStub(connectDebuggerStub);

    myDevtools.connect();
    should.equal(myDevtools.debuggerUrl_, debuggerUrl);
    getResponse = '';
    myDevtools.connect.should.throwError();
    should.ok(connectDebuggerSpy.calledOnce);
   });
});
