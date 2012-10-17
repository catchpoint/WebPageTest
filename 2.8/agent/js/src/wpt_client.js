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
var logger = require('logger');

var getWorkServlet_ = 'work/getwork.php';
var workDoneServlet_ = 'work/workdone.php';
var JOB_TEST_ID = 'Test ID';
exports.JOB_TEST_ID = JOB_TEST_ID;

var DEFAULT_JOB_TIMEOUT = 60000;
exports.NO_JOB_PAUSE_ = 10000;

var CRLF_ = '\r\n';
var CRLF2_ = CRLF_ + CRLF_;


/**
 * A job to run, usually received from the server.
 *
 * Public attributes:
 *   task JSON descriptor received from the server for this job.
 *   id the job id
 *   resultFiles array of ResultFile objects.
 *   error an error object if the job failed.
 * @this {Job}
 *
 * @param {Object} client should submit this job's results when done.
 * @param {Object} task holds information about the task such as the script
 *                 and browser.
 */
exports.Job = function(client, task) {
  'use strict';
  this.client_ = client;
  this.task = task;
  this.id = task[JOB_TEST_ID];
  this.resultFiles = [];
  this.error = undefined;

  var uncaughtExceptionHandler = this.onUncaughtException_.bind(this);
  process.once('uncaughtException', uncaughtExceptionHandler);

  this.done = function() {
    logger.log('alert', 'Finished job: ' + this.id);
    process.removeListener('uncaughtException', uncaughtExceptionHandler);
    this.client_.jobFinished_(this);
  };
};

/**
 * onUncaughtException is called when the webdriver server throws an
 * unexpected or uncaught exception
 * @private
 *
 * @param {Object} e error object.
 */
exports.Job.prototype.onUncaughtException_ = function(e) {
  'use strict';
  logger.log('critical', 'Uncaught exception for job : ' + this.id);
  this.error = e;
  this.done();
};


/**
 * ResultFile sets information about the file produced as a
 * result of running a job.
 * @this {ResultFile}
 *
 * @param {String} resultType a ResultType constant defining the file role.
 * @param {String} fileName file will be sent to the server with this filename.
 * @param {String} contentType MIME content type.
 * @param {String} content the content to send.
 */
exports.ResultFile = function(resultType, fileName, contentType, content) {
  'use strict';
  this.resultType = resultType;
  this.fileName = fileName;
  this.contentType = contentType;
  this.content = content;
};

/**
 * Constants to use for ResultFile.resultType.
 */
exports.ResultFile.ResultType = Object.freeze({
  // PCAP: 'pcap',
  HAR: 'har',
  TIMELINE: 'timeline'
});


/**
 * processResponse will take a http GET response, concat its data until it
 * finishes and pass it to callback
 *
 * @param  {Object} response http GET response object.
 * @param  {Function(String)} callback called on completed http request body.
 */
exports.processResponse = function(response, callback) {
  'use strict';
  var responseBody = '';
  response.setEncoding('utf8');
  response.on('data', function(chunk) {
    responseBody += chunk;
  });
  response.on('end', function() {
    logger.log('extra', 'Got response: ' + responseBody);
    if (callback) {
      callback(responseBody);
    }
  });
};

/**
 * A WebPageTest client that talks to the WebPageTest server.
 * @this {Client}
 *
 * @param {String} baseUrl server base URL.
 * @param {String} location location name to use for job polling
 *                 and result submission.
 * @param {?String=} apiKey API key, if any.
 * @param {Number=} job_timeout how long the entire job has before it is killed.
 */
exports.Client = function(baseUrl, location, apiKey, job_timeout) {
  'use strict';
  events.EventEmitter.call(this);
  this.baseUrl_ = url.parse(baseUrl);
  // Bring the URL path into a normalized form ending with /
  // The trailing / is for url.resolve not to strip the last path component
  var urlPath = this.baseUrl_.path;
  if (urlPath.slice(urlPath.length - 1) !== '/') {
    urlPath += '/';
  }
  this.baseUrl_.path = urlPath;
  this.baseUrl_.pathname = urlPath;
  this.location_ = location;
  this.apiKey = apiKey;
  this.timeoutTimer_ = undefined;
  this.currentJob_ = undefined;
  if (job_timeout)
    this.job_timeout = job_timeout;
  else
    this.job_timeout = DEFAULT_JOB_TIMEOUT;

  logger.log('extra', 'Created Client (urlPath=' + urlPath + '): ' +
      JSON.stringify(this));
};
util.inherits(exports.Client, events.EventEmitter);

/**
 * onUncaughtException is called when the client throws an
 * unexpected or uncaught exception
 * @private
 *
 * @param {Object} job the job that threw the error.
 * @param {Object} e error object.
 */
exports.Client.prototype.onUncaughtException_ = function(job, e) {
  'use strict';
  logger.log('critical', 'Uncaught exception for job ' + job.id);
  job.error = e;
  job.done();
};

/**
 * processJobResponse_ processes a server response and starts a new job
 * @private
 *
 * @param {String} responseBody server response as stringified JSON
 *                 with job information.
 */
exports.Client.prototype.processJobResponse_ = function(responseBody) {
  'use strict';
  var self = this;
  var job = new exports.Job(this, JSON.parse(responseBody));
  // Set up job timeout
  this.timeoutTimer_ = global.setTimeout(function() {
    self.emit('timeout', job);
    job.error = new Error('timeout');
    job.done();
  }, this.job_timeout);
  // For comparison in jobDone_()
  this.currentJob_ = job;
  // Handle all exceptions while the job is being processed
  try {
    this.emit('job', job);
  } catch (e) {
    logger.log('critical', 'Exception while running the job: ' + e.message);
    job.error = e;
    job.done();
  }
};

/**
 * requestNextJob_ will query the server for a new job and will either process
 * the job response to begin it, emit 'nojob' or 'shutdown'.
 * @private
 */
exports.Client.prototype.requestNextJob_ = function() {
  'use strict';
  var self = this;
  var getWorkUrl = url.resolve(this.baseUrl_,
      getWorkServlet_ +
      '?location=' + encodeURIComponent(this.location_) + '&f=json');

  logger.log('info', 'Get work: ' + getWorkUrl);
  http.get(url.parse(getWorkUrl), function(res) {
    exports.processResponse(res, function(responseBody) {
      if (responseBody === '' || responseBody[0] === '<') {
        self.emit('nojob');
      } else if (responseBody === 'shutdown') {
        self.emit('shutdown');
      } else {  // We got a job
        self.processJobResponse_(responseBody);
      }
    });
  });
};

/**
 * jobFinished_ will ensure that the supposed job finished is actually the
 * current one. If it is, it will submit it so the results can be generated
 * If a job times out and finishes later, jobFinished_ will still be called
 * but it will be handled and no results will be generated.
 * @private
 *
 * @param  {Object} job the job that supposedly finished.
 */
exports.Client.prototype.jobFinished_ = function(job) {
  'use strict';
  // Expected finish of the current job
  if (this.currentJob_ === job) {
    logger.log('notice', 'Job finished: ' + job.id);
    global.clearTimeout(this.timeoutTimer_);
    this.timeoutTimer_ = undefined;
    this.currentJob_ = undefined;
    this.submitResult_(job);
  } else {  // Belated finish of an old already timed-out job
    logger.log('error', 'Timed-out job finished, but too late: ' + job.id);
  }
};

/**
 * postResultFile_ will create the result file for the job.
 * @private
 *
 * @param  {Object} job the result file will be saved for.
 * @param  {Object} resultFile of type ResultFile.
 * @param  {Boolean} isDone whether or not the file is the last one.
 * @param  {Function} callback passed to processResponse in
 *                    the http.request callback.
 */
exports.Client.prototype.postResultFile_ =
    function(job, resultFile, isDone, callback) {
  'use strict';
  logger.log('extra', 'postResultFile: job=' + JSON.stringify(job) +
    ' resultFile=' + JSON.stringify(resultFile) + ' isDone=' + isDone +
    ' callback=' + callback);
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
  // TODO(klm): change body to chunked request.write() after adding unit tests,
  // so that console printout would no longer be a valuable debugging aid.

  var headers = {};
  headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
  headers['Content-Length'] = body.length;

  var workDonePath = path.join(this.baseUrl_.path, workDoneServlet_);
  var options = {
    method: 'POST',
    host: this.baseUrl_.hostname,
    port: this.baseUrl_.port,
    path: workDonePath,
    headers: headers};
  var request = http.request(options, function(res) {
    exports.processResponse(res, callback);
  });
  request.end(body, 'UTF-8');
};

/**
 * submitResult_ posts all result files for the job and emits done.
 * @private
 *
 * @param  {Object} job that should be completed.
 */
exports.Client.prototype.submitResult_ = function(job) {
  'use strict';
  var self = this;
  // TODO(klm): Figure out how to submit failed jobs (with job.error)
  var filesToSubmit = job.resultFiles.slice();
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
 * @param {Boolean} forever if false, make only one request. If true, chain
 *                  the request off of 'done' and 'nojob' events, running
 *                  forever or until the server responds with 'shutdown'.
 */
exports.Client.prototype.run = function(forever) {
  'use strict';
  var self = this;

  if (forever) {
    this.on('nojob', function() {
      global.setTimeout(function() {
        self.requestNextJob_();
      }, exports.NO_JOB_PAUSE_);
    });
    this.on('done', function() {
      self.requestNextJob_();
    });
  }
  this.requestNextJob_();
};
