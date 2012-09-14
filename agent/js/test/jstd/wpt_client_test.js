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
/*jslint nomen:false*/
/*global assertEquals: true, assertFalse: true, assertMatch: true, assertNotNull: true, assertTrue: true */

var http = require('http');
var wpt_client = require('wpt_client');

var TASK1_ = {
  'Test ID': 'my test',
  url: 'http://google.com',
  runs: '1',
  browser: 'Chrome',
  script: 'console.log("gaga");\n'
};


var ClientTest = TestCase('ClientTest');

ClientTest.prototype.setUp = function() {
  'use strict';

  // Reset if leftover from a prior testcase
  http.fakeResponseData = [];
  http.requests = [];

  this.client = new wpt_client.Client('http://localhost:1234/gaga', 'testLoc');
};

ClientTest.prototype.mockHttpForJob = function(job) {
  'use strict';
  http.fakeResponseData.push(JSON.stringify(job));
  http.fakeResponseData.push('');  // For result POST
};

ClientTest.prototype.assertPostJobDone = function(job, postBody) {
  'use strict';
  assertMatch('Result POST body',
      new RegExp('name="id"\r\n[\\s\\S]+?' + job['Test ID'] + '\r\n', 'm'),
      postBody);
  assertMatch('Result POST body', new RegExp('name="done"\r\n\r\n1\r\n', 'm'),
      postBody);
};

ClientTest.prototype.testRun_once = function() {
  'use strict';
  this.mockHttpForJob(TASK1_);
  this.client.on('job', function(job) {
    job.done();
  });
  this.client.run(/*forever*/false);
  callRemainingTimeoutCallbacks();

  assertEquals('2 HTTP requests done', 2, http.requests.length);
  assertEquals('All HTTP responses processed', 0, http.fakeResponseData.length);
  assertEquals('Job request URL',
      '/gaga/work/getwork.php?location=testLoc&f=json',
      http.requests[0].options.path);
  assertEquals('Job result POST URL',
      '/gaga/work/workdone.php',
      http.requests[1].options.path);
  this.assertPostJobDone(TASK1_, http.requests[1].data);
};

ClientTest.prototype.testRun_foreverAndShutdown = function () {
  'use strict';
  // No job; a job; no job; shutdown.
  http.fakeResponseData.push('');
  this.mockHttpForJob(TASK1_);
  http.fakeResponseData.push('');
  http.fakeResponseData.push('shutdown');
  var capturedJob;
  this.client.on('job', function(job) {
    capturedJob = job;
    job.done();
  });
  this.client.run(/*forever*/true);
  callRemainingTimeoutCallbacks();

  assertEquals('5 HTTP requests done', 5, http.requests.length);
  assertEquals('All HTTP responses processed', 0, http.fakeResponseData.length);
  // Requests: 1st and 2nd are job requests, 3rd = result
  this.assertPostJobDone(TASK1_, http.requests[2].data);
  this.assertJob(TASK1_, capturedJob);
};

ClientTest.prototype.testEvent_nojob = function() {
  'use strict';
  http.fakeResponseData.push('');  // Job request returns nothing
  var isCallbackCalled = false;
  this.client.on('nojob', function() {
    isCallbackCalled = true;
  });
  this.client.run(/*forever*/false);
  callRemainingTimeoutCallbacks();

  assertTrue(isCallbackCalled);
};

ClientTest.prototype.assertJob = function(expected, actual) {
  'use strict';
  assertNotNull(actual);
  assertUndefined(actual.error);
  assertEquals('Captured the job', expected, actual.task);
};

ClientTest.prototype.testEvent_on = function() {
  'use strict';
  this.mockHttpForJob(TASK1_);
  var capturedJob = null;
  this.client.on('job', function(job) {
    capturedJob = job;
    job.done();
  });
  this.client.run(/*forever*/false);
  callRemainingTimeoutCallbacks();

  this.assertJob(TASK1_, capturedJob);
};

ClientTest.prototype.testEvent_done = function() {
  'use strict';
  this.mockHttpForJob(TASK1_);
  var capturedJob = null;
  this.client.on('job', function(job) {
    job.done();
  });
  this.client.on('done', function(job) {
    capturedJob = job;
  });
  this.client.run(/*forever*/false);
  callRemainingTimeoutCallbacks();

  this.assertJob(TASK1_, capturedJob);
};
