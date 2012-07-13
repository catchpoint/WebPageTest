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

var events = require('events');
var http = require('http');
var path = require('path');
var url = require('url');
var util = require('util');

var getWorkServlet_ = 'work/getwork.php';
var workDoneServlet_ = 'work/workdone.php';
var JOB_TEST_ID = 'Test ID';
exports.JOB_TEST_ID = JOB_TEST_ID;

var JOB_TIMEOUT_ = 60000;  // TODO(klm): Control via flag, must be much higher
var NO_JOB_PAUSE_ = 10000;

var CRLF_ = '\r\n';
var CRLF2_ = CRLF_ + CRLF_;


/**
 * A job to run, usually received from the server.
 *
 * Public attributes:
 *   <code>task</code> JSON descriptor received from the server for this job.
 *   <code>resultFiles</code> array of ResultFile objects.
 *   <code>error</code> an error object if the job failed.
 *
 * @param client the client that should submit this job's results when done.
 * @param task JSON descriptor received from the server for this job.
 */
function Job(client, task) {
  'use strict';
  this.client_ = client;
  this.task = task;
  this.id = task[JOB_TEST_ID];
  this.resultFiles = [];
  this.error = undefined;

  var uncaughtExceptionHandler = this.onUncaughtException_.bind(this);
  process.once('uncaughtException', uncaughtExceptionHandler);

  this.done = function() {
    process.removeListener('uncaughtException', uncaughtExceptionHandler);
    this.client_.jobFinished_(this);
  };
}

Job.prototype.onUncaughtException_ = function(e) {
  'use strict';
  console.error('Uncaught exception for job %s: %s',
      this.id, e.stack);
  this.error = e;
  this.done();
};


/**
 * A file produced as a result of running a job.
 *
 * @param resultType one of ResultType constants, defining the file role.
 * @param fileName file will be sent to the server with this filename.
 * @param contentType MIME content type to use when sending to the server.
 * @param content the content to send.
 */
function ResultFile(resultType, fileName, contentType, content) {
  'use strict';
  this.resultType = resultType;
  this.fileName = fileName;
  this.contentType = contentType;
  this.content = content;
}
exports.ResultFile = ResultFile;

/**
 * Constants to use for ResultFile.resultType.
 */
ResultFile.ResultType = Object.freeze({
  // PCAP: 'pcap',
  HAR: 'har',
  TIMELINE: 'timeline'
});


function processResponse(response, callback) {
  'use strict';
  var responseBody = '';
  response.setEncoding('utf8');
  response.on('data', function (chunk) {
    responseBody += chunk;
  });
  response.on('end', function () {
    console.log('Got response: ' + responseBody);
    if (callback) {
      callback(responseBody);
    }
  });
}

/**
 * A WebPageTest client that talks to the WebPageTest server.
 *
 * @param baseUrl server base URL.
 * @param location location name to use for job polling and result submission.
 * @param apiKey (optional) API key, if any.
 */
function Client(baseUrl, location, apiKey) {
  'use strict';
  events.EventEmitter.call(this);
  this.baseUrl_ = url.parse(baseUrl);
  // Bring the URL path into a normalized form ending with /
  // The trailing / is for url.resolve not to strip the last path component
  var urlPath = path.normalize(this.baseUrl_.path);
  if (urlPath.slice(urlPath.length - 1) !== '/') {
    urlPath += '/';
  }
  this.baseUrl_.path = urlPath;
  this.baseUrl_.pathname = urlPath;
  this.location_ = location;
  this.apiKey = apiKey;
  this.timeoutTimer_ = undefined;
  this.currentJob_ = undefined;

  console.log('Created Client (urlPath=%s): %s', urlPath, JSON.stringify(this));
}
util.inherits(Client, events.EventEmitter);
exports.Client = Client;

Client.prototype.onUncaughtException_ = function(job, e) {
  'use strict';
  console.error('Uncaught exception for job %s: %s', job.id, e.stack);
  job.error = e;
  job.done();
};

/**
 * Processes a server response to the job poll request.
 */
Client.prototype.processJobResponse_ = function(responseBody) {
  'use strict';
  var self = this;  // For closure
  var job = new Job(this, JSON.parse(responseBody));
  // Set up job timeout
  this.timeoutTimer_ = global.setTimeout(function() {
    console.error('Job timeout: %s', job.id);
    self.emit('timeout', job);
    job.error = new Error('timeout');
    job.done();
  }, JOB_TIMEOUT_);
  this.currentJob_ = job;  // For comparison in jobDone_()
  // Handle all exceptions while the job is being processed
  try {
    this.emit('job', job);
  } catch (e) {
    console.error('Exception while running the job: %s\n%s',
        e.message, e.stack);
    job.error = e;
    job.done();
  }
};

Client.prototype.requestNextJob_ = function () {
  'use strict';
  var self = this;  // For closure
  var getWorkUrl = url.resolve(this.baseUrl_,
      getWorkServlet_ +
      '?location=' + encodeURIComponent(this.location_) + '&f=json');

  console.log('Get work: ' + getWorkUrl);
  http.get(url.parse(getWorkUrl), function (res) {
    processResponse(res, function (responseBody) {
      if (responseBody === '') {  // No job for us yet
        self.emit('nojob');
      } else if (responseBody === 'shutdown') {  // Job server is shutting down
        self.emit('shutdown');
      } else {  // We got a job
        self.processJobResponse_(responseBody);
      }
    });
  });
};

Client.prototype.jobFinished_ = function(job) {
  'use strict';
  if (this.currentJob_ === job) {  // Expected finish of the current job
    console.info('Job finished: %s', job.id);
    global.clearTimeout(this.timeoutTimer_);
    this.timeoutTimer_ = undefined;
    this.currentJob_ = undefined;
    this.submitResult_(job);
  } else {  // Belated finish of an old already timed-out job
    console.error('Timed-out job finished, but too late: %s', job.id);
  }
};

Client.prototype.postResultFile_ = function(job, resultFile, isDone, callback) {
  'use strict';
  console.log('postResultFile: job=%s resultFile=%s isDone=%s callback=%s',
      JSON.stringify(job), JSON.stringify(resultFile), isDone, callback);
  // Roll MIME multipart by hand, it's too simple to justify a complex library,
  // and it gives us more control over all the headers.
  var boundary = '-----12345correcthorsebatterystaple6789';
  var textPlain = 'Content-Type: text/plain';
  var partHead = '--' + boundary + CRLF_ +
      'Content-Disposition: form-data; name=';

  var body = partHead + '"id"' + CRLF_ + textPlain + CRLF2_ + job.id + CRLF_;
  if (isDone) {  // Final result submission for this job ID
    body += partHead + '"done"' + CRLF2_ + '1' + CRLF_;
  }
  body += partHead + '"location"' + CRLF2_ + this.location_ + CRLF_;
  if (this.apiKey) {
    body += partHead + '"key"' + CRLF2_ + this.apiKey + CRLF_;
  }
  if (resultFile) {
    // A part with name="resultType" and then the content with name="file"
    body += partHead + '"' + resultFile.resultType + '"' + CRLF2_ +
        '1' + CRLF_ +
        partHead + '"file"; filename="' + resultFile.fileName + '"' +
        CRLF_ + 'Content-Type: ' + resultFile.contentType + CRLF_ +
        'Content-Length: ' + resultFile.content.length + CRLF_ +
        'Content-Transfer-Encoding: binary' + CRLF2_ +
        resultFile.content + CRLF_;
  }
  body += '--' + boundary + '--' + CRLF_;
  console.info('Response body: ' + body);
  // TODO(klm): change body to chunked request.write() after adding unit tests,
  // so that console printout would no longer be a valuable debugging aid.

  var headers = {};
  headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
  headers['Content-Length'] = body.length;

  var workDonePath = path.join(this.baseUrl_.path, workDoneServlet_);
  var options = {
    method:'POST',
    host:this.baseUrl_.hostname, port:this.baseUrl_.port, path:workDonePath,
    headers:headers};
  var request = http.request(options, function (res) {
    processResponse(res, callback);
  });
  request.end(body, 'UTF-8');
};

Client.prototype.submitResult_ = function (job) {
  'use strict';
  var self = this;  // For closure
  // TODO(klm): Figure out how to submit failed jobs (with job.error)
  var filesToSubmit = job.resultFiles.slice();  // Shallow copy, will modify
  // Chain submitNextResult calls off of the HTTP request callback
  var submitNextResult = function() {
    var resultFile = filesToSubmit.shift();
    if (resultFile) {
      self.postResultFile_(job, resultFile, /*isDone=*/false, submitNextResult);
    } else {
      self.postResultFile_(job, undefined, /*isDone=*/true, function() {
        self.emit('done', job);
      });
    }
  };
  submitNextResult();
};

/**
 * Requests a job from the server and notifies listeners about the outcome.
 *
 * Event 'job' has the Job object as an argument. Calling done() on the job
 * object causes the client to submit the job result and emit 'done'.
 *
 * If the job done() does not get called within a fixed timeout, emits
 * 'timeout' with the job as an argument - to let other infrastructure clean up,
 * and then submits the job result and emits 'done'.
 *
 * @param forever if false, make only one request. If true, chain the request
 *     off of 'done' and 'nojob' events, running forever or until the server
 *     responds with 'shutdown'.
 */
Client.prototype.run = function (forever) {
  'use strict';
  var self = this;  // For closure

  if (forever) {
    this.on('nojob', function () {
      global.setTimeout(function () {
        self.requestNextJob_();
      }, NO_JOB_PAUSE_);
    });
    this.on('done', function () {
      self.requestNextJob_();
    });
  }
  this.requestNextJob_();
};
