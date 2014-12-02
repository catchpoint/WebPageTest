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

var devtools = require('devtools');
var events = require('events');
var http = require('http');
var should = require('should');
var sinon = require('sinon');
var Stream = require('stream');
var url = require('url');
var util = require('util');


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('devtools small', function() {
  'use strict';

  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.verifyAndRestore();
  });

  it('should process a response', function() {
    var responseBody1 = 'body1';
    var responseBody2 = 'body2';

    var setEncodingSpy = sinon.spy();
    function ResponseType() {
      events.EventEmitter.call(this);
    }
    util.inherits(ResponseType, events.EventEmitter);
    ResponseType.prototype.setEncoding = setEncodingSpy;
    var response = new ResponseType();

    var callbackSpy = sandbox.spy();
    devtools.processResponse(response, callbackSpy);

    response.emit('data', responseBody1);
    response.emit('data', responseBody2);
    response.emit('end');
    response.emit.bind(response, 'error').should.throwError();
    should.ok(callbackSpy.calledOnce);
    should.equal(callbackSpy.args[0][0], responseBody1 + responseBody2);
  });

  it('should connect to devtools', function() {
    var devtoolsUrl = 'http://my.machine:1234/';
    var debuggerUrl = 'http://my.machine:1337';
    var getResponse = '[{ "webSocketDebuggerUrl": "' + debuggerUrl + '"}]';
    sandbox.stub(http, 'get', function(getUrl, callback) {
      should.equal(getUrl.href, url.parse(devtoolsUrl).href);
      callback(getResponse, callback);
      return new Stream();
    });
    sandbox.stub(devtools, 'processResponse', function(response, callback) {
      callback(response);
    });

    var myDevtools = new devtools.DevTools(devtoolsUrl);

    var connectDebuggerStub = sandbox.stub(myDevtools, 'connectDebugger_');

    myDevtools.connect();
    should.equal(myDevtools.debuggerUrl_, debuggerUrl);
    getResponse = '';
    myDevtools.connect.should.throwError();
    should.ok(connectDebuggerStub.calledOnce);
  });

  it('should call errback on HTTP errors', function() {
    var fakeResponse = new Stream();
    sandbox.stub(http, 'get', function() {
      return fakeResponse;
    });
    var callbackSpy = sandbox.spy();
    var errbackSpy = sandbox.spy();

    var myDevtools = new devtools.DevTools('http://gaga');
    myDevtools.connect(callbackSpy, errbackSpy);
    fakeResponse.emit('error', new Error('test error'));

    should.ok(callbackSpy.notCalled);
    should.ok(errbackSpy.calledOnce);
    should.equal('test error', errbackSpy.firstCall.args[0].message);
  });
});
