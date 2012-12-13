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
/*global describe: true, before: true, afterEach: true, beforeEach: true,
         it: true*/

var events = require('events');
var http = require('http');
var ins = require('util').inspect;
var logger = require('logger');
var sandbox = require('sinon');
var should = require('should');
var sinon = require('sinon');
var Stream = require('stream');
var test_utils = require('./test_utils.js');
var wd_server = require('wd_server');
var webdriver = require('webdriver');
var wpt_client = require('wpt_client');

var WPT_SERVER = process.env.WPT_SERVER || 'http://localhost:8888';
var LOCATION = process.env.LOCATION || 'TEST';


/**
 * All tests are synchronous, do NOT use Mocha's function(done) async form.
 *
 * The synchronization is via:
 * 1) sinon's fake timers -- timer callbacks triggered explicitly via tick().
 * 2) stubbing out anything else with async callbacks, e.g. process or network.
 */
describe('wpt_client small', function() {
  'use strict';

  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    test_utils.fakeTimers(sandbox);
    // Re-create stub process for each test to avoid accumulating listeners.
    wpt_client.process = new events.EventEmitter();
  });

  afterEach(function() {
    // Call unfakeTimers before verifyAndRestore, which may throw.
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
    wpt_client.process = process;
  });

  it('should call client.finishRun_ when job done', function() {
    var client = new wpt_client.Client('base', 'location', 'apiKey', 0);
    sandbox.mock(client).expects('finishRun_').once();

    var job = new wpt_client.Job(client, {JOB_TEST_ID: 'ABC'});
    job.runFinished();
  });

  it('should be able to timeout a job', function() {
    var client = new wpt_client.Client('server', 'location',
      undefined, /*jobTimeout=*/1);
    var isTimedOut = false;
    client.onJobTimeout = function() {
      logger.info('Caught timeout in test');
      isTimedOut = true;
    };
    client.onStartJobRun = function() {};  // Never call runFinished => timeout.

    client.processJobResponse_('{}');
    sandbox.clock.tick(1);
    should.ok(isTimedOut);
  });

  it('should call onStartJobRun when a new job is processed', function() {
    var client = new wpt_client.Client('url');
    client.onStartJobRun = function() {};
    var startJobRunSpy = sandbox.spy(client, 'onStartJobRun');

    client.processJobResponse_('{}');
    should.ok(startJobRunSpy.calledOnce);
  });

  it('should do a http get request to the correct url when requesting next job',
      function() {
    sandbox.stub(http, 'get');

    var client = new wpt_client.Client('http://server', 'Test');
    client.requestNextJob_();

    should.ok(http.get.calledOnce);
    should.equal(http.get.firstCall.args[0].href,
        'http://server/work/getwork.php?location=Test&f=json');
  });

  it('should submit right number of result files', function() {
    var submitResultFiles = function(numFiles, callback) {
      var filesSubmitted = 0;
      var client = new wpt_client.Client('server', 'location');

      sandbox.stub(client, 'postResultFile_',
          function(job, resultFile, fields, callback) {
        logger.debug('stub postResultFile_ f=%j fields=%j', resultFile, fields);
        filesSubmitted += 1;
        callback();
      });

      var resultFiles = [];
      var iFile;
      for (iFile = 1; iFile <= numFiles; iFile += 1) {
        resultFiles.push({
            fileName: 'file ' + iFile, content: 'content ' + iFile});
      }

      client.submitResult_({id: "test", resultFiles: resultFiles}, function() {
        should.equal(filesSubmitted, numFiles + 1);
        callback();
      });
    };

    var isDone = false;
    submitResultFiles(0, function() {
      submitResultFiles(1, function() {
        submitResultFiles(2, function() {
          isDone = true;
        });
      });
    });
    should.ok(isDone);
  });

  it('should submit the right files', function() {
    var client = new wpt_client.Client('server', 'location');
    var content = 'fruits of my labour';
    var job = {id: 'test', resultFiles: [{content: content}]};

    sandbox.stub(client, 'postResultFile_',
        function(job, resultFile, fields, callback) {
      if (resultFile) {
        should.equal(resultFile.content, content);
      }
      callback();
    });

    var isDone = false;
    client.submitResult_(job, function() {
      isDone = true;
    });
    should.ok(isDone);
  });

  it('run should do HTTP GET initially, on job, and on nojob', function() {
    sandbox.mock(http).expects('get').exactly(3);

    var client = new wpt_client.Client('url');
    client.run(true);
    client.emit('done');
    client.emit('nojob');
    // Force nojob's delayed GET to run.
    sandbox.clock.tick(wpt_client.NO_JOB_PAUSE);
  });

  it('should emit shutdown if it receives shutdown as the next job response',
      function() {
    var client = new wpt_client.Client(WPT_SERVER, LOCATION);

    var shutdownSpy = sandbox.spy();
    client.on('shutdown', shutdownSpy);

    var response = new Stream();
    response.setEncoding = function() {};
    sandbox.stub(http, 'get', function(url, responseCb) {
      url.href.should.match(new RegExp('^' + WPT_SERVER));
      responseCb(response);
      response.emit('data', 'shutdown');
      response.emit('end');
    });

    client.run(/*forever=*/true);
    should.ok(shutdownSpy.calledOnce);
  });

  it('should run a 3-run job 3 times', function() {
    var numJobRuns = 0;

    var client = new wpt_client.Client('url', 'test');
    var doneSpy = sandbox.spy();
    client.on('done', doneSpy);

    client.onStartJobRun = function(job) {
      logger.debug('New job run');
      numJobRuns += 1;
      // Simulate an async runFinished() call as in the real system.
      global.setTimeout(function() {
        job.runFinished();
      }, 0);
    };

    var getResponse = new Stream();
    getResponse.setEncoding = function() {};
    sandbox.stub(http, 'get', function(url, responseCb) {
      logger.debug('Stub GET %s', url.href);
      url.href.should.match(/\/work\/getwork/);
      responseCb(getResponse);
      getResponse.emit('data', JSON.stringify({
        'Test ID': '121106_WK_M',
        runs: 3
      }));
      getResponse.emit('end');
    });
    // Must use a different Stream object for the POST, because getResponse
    // already has other completely unrelated event callbacks registered.
    var postResponse = new Stream();
    postResponse.setEncoding = function() {};
    sandbox.stub(http, 'request',
        function(options, responseCb) {
      logger.debug('Stub POST http://%s:%s%s',
          options.host, options.port, options.path);
      options.path.should.match(/\/work\/workdone/);
      responseCb(postResponse);
      return {  // Fake request object
        end: function(/*body, encoding*/) {
          postResponse.emit('end');  // No data in the response
        }
      };
    });

    client.run(/*forever=*/false);
    sandbox.clock.tick(1);  // Trigger delayed runFinished from onStartJobRun.
    should.ok(doneSpy.calledOnce);
    should.equal(3, numJobRuns);
  });

  it('should set job error and call done on job uncaught exception',
      function() {
    var e = new Error('this is an error');
    var fakeTask = {};
    fakeTask[wpt_client.JOB_TEST_ID] = 'test';
    var client = new wpt_client.Client('url');
    client.onStartJobRun = function() {};  // Do nothing, wait for exception.
    sandbox.stub(client, 'postResultFile_',
        function(job, resultFile, fields, callback) {
      logger.debug('stub postResultFile_ f=%j fields=%j', resultFile, fields);
      should.equal(job.error, e.message);
      var isFoundErrorField = false;
      fields.forEach(function(nameValue) {
        if ('error' === nameValue[0]) {
          isFoundErrorField = true;
          should.equal(e.message, nameValue[1]);
        }
      });
      callback();
    });
    var doneSpy = sandbox.spy();
    client.on('done', function(job) {
      logger.debug('client done');
      should.equal(job.error, e.message);
      // Second uncaught exception outside of job processing is ignored.
      // Spy on logger.critical just for this exception and make sure
      // that we log the message "outside of job".
      var spyLogCritical = sandbox.spy(logger, 'critical');
      try {
        wpt_client.process.emit('uncaughtException', e);
        should.ok(spyLogCritical.calledWithMatch(/outside of job/));
      } finally {
        spyLogCritical.restore();
      }
      doneSpy();
    }.bind(this));
    client.processJobResponse_('{"Test ID": "test"}');
    logger.debug('emitting uncaught');
    // First uncaught exception finishes the job.
    wpt_client.process.emit('uncaughtException', e);
    should.ok(doneSpy.calledOnce);
  });
});
