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

var should = require('should');
var http = require('http');
var wpt_client = require('wpt_client');
var wd_server = require('wd_server');
var agent_main = require('agent_main');
var sinon = require('sinon');
var webdriver = require('webdriver');
var ins = require('util').inspect;
var test_utils = require('./test_utils.js');
var logger = require('logger');

var WPT_SERVER = process.env.WPT_SERVER || 'http://localhost:8888';
var LOCATION = process.env.LOCATION || 'TEST';

describe('wpt_client small', function() {

  before(function() {
    process.send = function(m, args) {
    }
    agent_main.setSystemCommands();
  });

  afterEach(function() {
    test_utils.restoreStubs();
  });

  it('should call client.jobFinished_ when job done', sinon.test(function() {
    var client = new wpt_client.Client('base', 'location', 'apiKey', 0);
    var mock = sinon.mock(client);
    mock.expects('jobFinished_').once();

    var job = new wpt_client.Job(client, {JOB_TEST_ID: 'ABC'});
    job.done();

    mock.verify();

  }));

  it('should be able to timeout a job', function(done) {
    var flags = {
      wpt_server: WPT_SERVER,
      location: LOCATION,
      job_timeout: 1
    };
    var client = new wpt_client.Client(flags.wpt_server, flags.location,
      undefined, flags.job_timeout);
    client.on('timeout', function() { done(); });

    client.processJobResponse_('{}');
  });

  it('should emit job when a new job is processed', function(done) {
    var flags = {
      wpt_server: WPT_SERVER,
      location: LOCATION
    };
    var client = new wpt_client.Client(flags.wpt_server, flags.location);
    client.on('job', function() { done(); });

    client.processJobResponse_('{}');
  });

  it('should do a http get request to the correct url when requesting next job',
      function() {
    var getSpy = sinon.spy(http, 'get');
    test_utils.registerStub(getSpy);

    var flags = {
      wpt_server: WPT_SERVER,
      location: LOCATION
    };
    var client = new wpt_client.Client(flags.wpt_server, flags.location);


    client.requestNextJob_();

    should.ok(http.get.calledOnce);
    should.equal(http.get.firstCall.args[0].path,
        '/work/getwork.php?location=Test&f=json');
  });

  it('should submit the correct number of result files', function() {
    this.timeout(10000);
    var submitResultFiles = function(numFiles, last) {
      var filesSubmitted = 0;
      var flags = {
        wpt_server: WPT_SERVER,
        location: LOCATION
      };
      var client = new wpt_client.Client(flags.wpt_server, flags.location);

      sinon.stub(client, 'postResultFile_',
          function(job, resultFile, isDone, callback) {
        filesSubmitted += 1;
        if (isDone) {
          filesSubmitted.should.equal(numFiles + 1);
          return;
        }
        else
          callback();
      }.bind(client));

      var resultFiles = [];
      for (var i = 0; i < numFiles; i++)
        resultFiles.push({fileName: 'file' + i,
                          content: 'this is some content'});

      client.submitResult_({resultFiles: resultFiles});
    };

    submitResultFiles(0);
    submitResultFiles(1);
    submitResultFiles(2);
    submitResultFiles(4, true);
  });

  it('should submit the correct files', function(done) {
    var flags = {
      wpt_server: WPT_SERVER,
      location: LOCATION
     };
    var client = new wpt_client.Client(flags.wpt_server, flags.location);
    var job = {resultFiles: [{content: 'this is the result file'}]};

    sinon.stub(client, 'postResultFile_',
        function(job, resultFile, isDone, callback) {
      should.equal(resultFile.content, job.resultFiles[0].content);
      done();
    });

    client.submitResult_(job);
  });

  it('run should call requestNextJob initially, on job, and on nojob',
      function(done) {
    var flags = {
      wpt_server: WPT_SERVER,
      location: LOCATION
     };
    var client = new wpt_client.Client(flags.wpt_server, flags.location);
    wpt_client.NO_JOB_PAUSE_ = 2;

    var mock = sinon.mock(client);
    mock.expects('requestNextJob_').exactly(3);
    client.run(true);
    client.emit('done');
    client.emit('nojob');

    setTimeout(function() {
      mock.verify();
      done();
    }, 10);
  });

  it('should emit shutdown if it receives shutdown in its request',
      function(done) {
    var client = new wpt_client.Client(WPT_SERVER, LOCATION);

    client.on('shutdown', function() {
      done();
    });

    var processResponseStub = sinon.stub(wpt_client, 'processResponse',
        function(res, callback) {
      logger.log('info', 'process response callback');
      callback('shutdown');
    });
    test_utils.registerStub(processResponseStub);

    client.requestNextJob_();
  });

  it('should set job error and call done on job uncaught exception',
      function() {
    var e = 'this is an error';
    var job = new wpt_client.Job({}, {});
    var doneSpy = sinon.spy();
    sinon.stub(job, 'done', doneSpy);
    job.onUncaughtException_(e);
    should.equal(job.error, e);
    e = 'this is the second error';
    wpt_client.Client.prototype.onUncaughtException_(job, e);
    should.equal(job.error, e);
    should.ok(doneSpy.calledTwice);
  });
});
