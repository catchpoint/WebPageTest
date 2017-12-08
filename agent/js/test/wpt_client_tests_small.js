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

var events = require('events');
var http = require('http');
var logger = require('logger');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var Stream = require('stream');
var test_utils = require('./test_utils.js');
var wpt_client = require('wpt_client');
var webdriver = require('selenium-webdriver');
var Zip = require('node-zip');

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
  var app;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    test_utils.fakeTimers(sandbox);
    // Re-create stub process for each test to avoid accumulating listeners.
    wpt_client.process = new events.EventEmitter();

    // Create a new ControlFlow for each test.
    app = new webdriver.promise.ControlFlow();
    webdriver.promise.setDefaultFlow(app);
    process_utils.injectWdAppLogging('agent_main', app);
  });

  afterEach(function() {
    // Call unfakeTimers before verifyAndRestore, which may throw.
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
    wpt_client.process = process;
  });

  it('should call client.finishRun_ when job done', function() {
    var client = new wpt_client.Client(app, {serverUrl: 'base',
        location: 'location', apiKey: 'apiKey', jobTimeout: 0});
    sandbox.mock(client).expects('finishRun_').once();

    var job = new wpt_client.Job(client, {'Test ID': 'ABC', runs: 1});
    job.runFinished();
  });

  it('should be able to timeout a job', function() {
    var client = new wpt_client.Client(app, {serverUrl: 'server',
        location: 'location', jobTimeout: 2});
    var isTimedOut = false;
    test_utils.stubLog(sandbox, function(
         levelPrinter, levelName, stamp, source, message) {
      return ('Aborting job gaga: timeout' === message);
    });
    client.onAbortJob = function() {
      logger.info('Caught timeout in test');
      isTimedOut = true;
    };
    client.onStartJobRun = function() {};  // Never call runFinished => timeout.

    client.processJobResponse_('{"Test ID": "gaga", "runs": 2}');
    sandbox.clock.tick(wpt_client.JOB_FINISH_TIMEOUT + 1);
    should.ok(!isTimedOut);
    sandbox.clock.tick(1);
    should.ok(isTimedOut);
  });

  it('should call onStartJobRun when a new job is processed', function() {
    var client = new wpt_client.Client(app, {serverUrl: 'url'});
    client.onStartJobRun = function() {};
    var startJobRunSpy = sandbox.spy(client, 'onStartJobRun');

    client.processJobResponse_('{"Test ID": "gaga", "runs": 2}');
    should.ok(startJobRunSpy.calledOnce);
  });

  it('should do a http get request to the correct url when requesting next job',
      function() {
    sandbox.stub(http, 'get', function() {
      return new events.EventEmitter();
    });

    var client = new wpt_client.Client(app, {serverUrl: 'http://server',
        location: 'Test'});
    client.requestNextJob_();
    test_utils.tickUntilIdle(app, sandbox);

    should.ok(http.get.calledOnce);
    should.equal(http.get.firstCall.args[0].href,
        'http://server/work/getwork.php?location=Test&f=json');
  });

  it('should submit right number of result files', function() {
    var submitResultFiles = function(numFiles, callback) {
      var filesSubmitted = 0;
      var client = new wpt_client.Client(app, {serverUrl: 'server',
          location: 'location'});

      sandbox.stub(client, 'postResultFile_',
          function(job, resultFile, fields, callback) {
        logger.debug('stub postResultFile_ f=%j fields=%j', resultFile, fields);
        filesSubmitted += 1;
        callback();
      });

      var resultFiles = [];
      var iFile;
      for (iFile = 1; iFile <= numFiles; iFile += 1) {
        resultFiles.push(
            {fileName: 'file ' + iFile, content: 'content ' + iFile});
      }

      client.submitResult_(
          {id: 'test', resultFiles: resultFiles, zipResultFiles: {}},
          /*isRunFinished=*/true, function() {
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
    var client = new wpt_client.Client(app,
        {serverUrl: 'server', location: 'location'});
    var content = 'fruits of my labour';
    var job = {
        id: 'test',
        runNumber: 2,
        isCacheWarm: true,
        resultFiles: [new wpt_client.ResultFile(
            'gaga', 'resultFile', 'my/type', content)],
        zipResultFiles: {'zip.ped': content}
      };

    sandbox.stub(client, 'postResultFile_',
        function(job, resultFile, fields, callback) {
      if (resultFile) {
        if (resultFile.contentType === 'application/zip') {
          should.equal(resultFile.fileName, 'results.zip');
          var zip = new Zip(resultFile.content.toString('base64'),
              {base64: true, checkCRC32: true});
          should.equal(1, Object.getOwnPropertyNames(zip.files).length);
          should.equal(zip.files['2_Cached_zip.ped'].data, content);
        } else {
          should.equal(resultFile.fileName, 'resultFile');
          should.equal(resultFile.contentType, 'my/type');
          should.equal(resultFile.content, content);
        }
      }
      callback();
    });

    var isDone = false;
    client.submitResult_(job, /*isRunFinished=*/true, function() {
      isDone = true;
    });
    should.ok(isDone);
  });

  it('run should do HTTP GET initially, on job, and on nojob', function() {
    var getCount = 0;
    sandbox.stub(http, 'get', function(url) {
      getCount += 1;
      url.path.should.match(/work\/getwork.php/);
      return new events.EventEmitter();
    });

    var client = new wpt_client.Client(app, {serverUrl: WPT_SERVER,
        location: LOCATION});
    logger.info('run(true)');
    client.run(true);
    test_utils.tickUntilIdle(app, sandbox);
    logger.info('emit(done)');
    client.emit('done');
    test_utils.tickUntilIdle(app, sandbox);
    logger.info('emit(nojob)');
    client.emit('nojob');
    // Force nojob's delayed GET to run.
    sandbox.clock.tick(wpt_client.NO_JOB_PAUSE + 1);
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(getCount, 3);
  });

  it('should emit shutdown if it receives shutdown as the next job response',
      function() {
    var client = new wpt_client.Client(app, {serverUrl: WPT_SERVER,
        location: LOCATION});

    var shutdownSpy = sandbox.spy();
    client.on('shutdown', shutdownSpy);

    test_utils.stubHttpGet(sandbox, new RegExp('^' + WPT_SERVER), 'shutdown');

    client.run(/*forever=*/true);
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(shutdownSpy.calledOnce);
  });

  it('should run a multi run job a correct number of times', function() {
    var task = { 'Test ID': '121106_WK_M', runs: 3 };

    test_utils.stubLog(sandbox, function(
         levelPrinter, levelName, stamp, source, message) {
      return message.match(new RegExp('Finished\\srun\\s\\d+[ab]/' +
          task.runs + '\\s(.*\\s)?of\\s(finished\\s)?job\\s' +
          task['Test ID'] + '(\\s|$)'));
    });

    var numJobRuns = 0;

    var client = new wpt_client.Client(app, {serverUrl: 'url',
        location: 'test'});
    var doneSpy = sandbox.spy();
    client.on('done', doneSpy);

    // This flag flips back and forth to simulate "repeat view" runs --
    // they submit a set of results, but do not increment the run number.
    // So overall we will do 6 runs -- 2 runs * 3 iterations.
    // Each run calls runFinished with false and then true. The initial value
    // is true because we flip it right before calling runFinished.
    var isRunFinished = true;
    var expectedRunNumber = 0;
    client.onStartJobRun = function(job) {
      logger.debug('Stub start run %d/%d', job.runNumber, job.runs);
      numJobRuns += 1;
      // Simulate an async runFinished() call as in the real system.
      global.setTimeout(function() {
        isRunFinished = !isRunFinished;
        if (!isRunFinished) {
          expectedRunNumber += 1;
        }
        should.equal(expectedRunNumber, job.runNumber);
        job.runFinished(isRunFinished);
      }, 0);
    };

    test_utils.stubHttpGet(sandbox, /\/work\/getwork/, JSON.stringify(task));

    // Stub a POST
    var postResponse = new Stream();
    postResponse.setEncoding = function() {};
    sandbox.stub(http, 'request',
        function(options, responseCb) {
      logger.debug('Stub POST http://%s:%s%s',
          options.host, options.port, options.path);
      options.path.should.match(/\/work\/workdone/);
      responseCb(postResponse);
      return {  // Fake request object
        'end': function(/*body, encoding*/) {
          postResponse.emit('end');  // No data in the response
        },
        'on': function() {}
      };
    });

    client.run(/*forever=*/false);
    sandbox.clock.tick(100);
    should.ok(doneSpy.calledOnce);
    should.equal(6, numJobRuns);
  });

  it('should set job error and call done on job uncaught exception',
      function() {
    var e = new Error('this is an error');
    test_utils.stubLog(sandbox, function(
         levelPrinter, levelName, stamp, source, message) {
      return ((/^Unhandled\sexception\s/).test(message) ||
          (/^(Finished|Failed)\srun\s/).test(message));
    });
    var client = new wpt_client.Client(app, {serverUrl: 'url'});
    client.onStartJobRun = function() {};  // Do nothing, wait for exception.
    sandbox.stub(client, 'postResultFile_',
        function(job, resultFile, fields, callback) {
      logger.debug('stub postResultFile_ f=%j fields=%j', resultFile, fields);
      should.equal(job.agentError, undefined);
      should.equal(job.testError, e.message);
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
      should.equal(job.agentError, undefined);
      should.equal(job.testError, e.message);
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
    client.processJobResponse_('{"Test ID": "gaga", "runs": 1}');
    logger.debug('emitting uncaught');
    // First uncaught exception finishes the job.
    wpt_client.process.emit('uncaughtException', e);
    test_utils.tickUntilIdle(app, sandbox);
    should.ok(doneSpy.calledOnce);
  });

  function testSignal_(signal_name, expectedStartCount, expectedAbortCount) {
    // Creates a 2-run uncached+cached job, emits the given signal in the
    // middle of the first run's uncached load, then verifies that the job
    // exits with the expected startRun and abort counts.
    var startSpy = sandbox.spy();
    var submitSpy = sandbox.spy();
    var abortSpy = sandbox.spy();
    var exitSpy = sandbox.spy();

    var client = new wpt_client.Client(app, {serverUrl: 'url'});
    test_utils.stubLog(sandbox, function(
         levelPrinter, levelName, stamp, source, message) {
      return ((/^Received \S+, will exit after /).test(message) ||
          (/^Aborting job /).test(message) ||
          (/^(Finished|Failed) run \d+/).test(message) ||
          (/^Exiting due to /).test(message));
    });
    client.onStartJobRun = function(job) {
      startSpy();
      if (1 === job.runNumber && !job.isCacheWarm) {
        global.setTimeout(function() {
          wpt_client.process.emit(signal_name);  // Signal on first iteration
        }, 5);
      }
      global.setTimeout(function() {
        if (!abortSpy.called && !exitSpy.called) {
          var isRunFinished = job.isFirstViewOnly || job.isCacheWarm;
          job.isCacheWarm = !isRunFinished;  // Set for next iteration
          job.runFinished(isRunFinished);
        }
      }, 10);
    };
    client.onAbortJob = function(job) {
      abortSpy();
      job.runFinished(true);
    };
    sandbox.stub(client, 'submitResult_', function(
        job, isJobFinished, callback) {
      submitSpy();
      callback();
    });
    wpt_client.process.exit = exitSpy;
    client.processJobResponse_('{"Test ID": "gaga", "runs": 2, "fvonly": 0}');
    sandbox.clock.tick(100);

    should.ok(exitSpy.calledOnce);
    should.equal(startSpy.callCount, expectedStartCount);
    should.equal(submitSpy.callCount, startSpy.callCount);
    should.equal(abortSpy.callCount, expectedAbortCount);
  }

  it('should handle SIGQUIT', testSignal_.bind(undefined, 'SIGQUIT', 4, 0));
  it('should handle SIGABRT', testSignal_.bind(undefined, 'SIGABRT', 2, 0));
  it('should handle SIGTERM', testSignal_.bind(undefined, 'SIGTERM', 1, 1));
  it('should handle SIGINT', testSignal_.bind(undefined, 'SIGINT', 1, 1));

});
