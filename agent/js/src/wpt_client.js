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
var logger = require('logger');
var multipart = require('multipart');
var path = require('path');
var url = require('url');
var util = require('util');

exports.process = process;  // Allow to stub out in tests

var GET_WORK_SERVLET = 'work/getwork.php';
var RESULT_IMAGE_SERVLET = 'work/resultimage.php';
var WORK_DONE_SERVLET = 'work/workdone.php';
var JOB_TEST_ID = 'Test ID';
exports.JOB_TEST_ID = JOB_TEST_ID;
var JOB_CAPTURE_VIDEO = 'Capture Video';
var JOB_RUNS = 'runs';

var DEFAULT_JOB_TIMEOUT = 60000;
exports.NO_JOB_PAUSE = 10000;


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
function Job(client, task) {
  'use strict';
  this.client_ = client;
  this.task = task;
  this.id = task[JOB_TEST_ID];
  this.captureVideo = (1 === task[JOB_CAPTURE_VIDEO]);
  this.runs = task[JOB_RUNS] || 1;
  this.runNumber = 0;  // Switch to 1 once the first run starts
  this.resultFiles = [];
  this.error = undefined;
}
exports.Job = Job;

/**
 * Called to finish the current run of this job, submit results, start next run.
 */
Job.prototype.runFinished = function() {
  'use strict';
  this.client_.finishRun_(this);
};

/**
 * ResultFile sets information about the file produced as a
 * result of running a job.
 * @this {ResultFile}
 *
 * @param {String} resultType a ResultType constant defining the file role.
 * @param {String} fileName file will be sent to the server with this filename.
 * @param {String} contentType MIME content type.
 * @param {String|Buffer} content the content to send.
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
  TIMELINE: 'timeline',
  IMAGE: 'image',
  IMAGE_ANNOTATIONS: 'image_annotations'
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
    logger.extra('Got response: %s', responseBody);
    if (callback) {
      callback(responseBody);
    }
  });
};

/**
 * A WebPageTest client that talks to the WebPageTest server.
 * @this {Client}
 *
 * @field {Function} [onStartJobRun] called upon a new job run start.
 *     #param {Job} job the job whose run has started.
 *         MUST call job.runFinished() when done, even after an error.
 * @field {Function} [onJobTimeout] job timeout callback.
 *     #param {Job} job the job that timed out.
 *         MUST call job.runFinished() after handling the timeout.
 *
 * @param {String} baseUrl server base URL.
 * @param {String} location location name to use for job polling
 *                 and result submission.
 * @param {?String=} apiKey API key, if any.
 * @param {Number=} jobTimeout how long the entire job has before it is killed.
 */
function Client(baseUrl, location, apiKey, jobTimeout) {
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
  this.jobTimeout_ = jobTimeout || DEFAULT_JOB_TIMEOUT;
  this.onStartJobRun = undefined;
  this.onJobTimeout = undefined;
  this.handlingUncaughtException_ = undefined;

  exports.process.on('uncaughtException', this.onUncaughtException_.bind(this));

  logger.extra('Created Client (urlPath=%s): %j', urlPath, this);
}
util.inherits(Client, events.EventEmitter);
exports.Client = Client;

/**
 * Unhandled exception in the client process.
 * @private
 *
\ * @param {Object} e error object.
 */
Client.prototype.onUncaughtException_ = function(e) {
  'use strict';
  logger.critical('Unhandled exception in the client: %s\n%s', e, e.stack);
  logger.debug('%s', e.stack);
  if (this.handlingUncaughtException_) {
    logger.critical(
        'Unhandled exception while handling another unhandled exception: %s',
        this.handlingUncaughtException_.message);
    // Stop handling an uncaught exception altogether
    this.handlingUncaughtException_ = undefined;
    // ...and we cannot do anything else, and we might stop working.
    // We could try to force-restart polling for jobs, not sure.
  } else if (this.currentJob_) {
    logger.critical('Unhandled exception while processing job %s',
        this.currentJob_.id);
    // Prevent an infinite loop for an exception while submitting job results.
    this.handlingUncaughtException_ = e;
    this.currentJob_.error = e.message;
    this.currentJob_.runFinished();
  } else {
    logger.critical('Unhandled exception outside of job processing');
    // Not sure if we can do anything, maybe force-restart polling for jobs.
  }
};

/**
 * requestNextJob_ will query the server for a new job and will either process
 * the job response to begin it, emit 'nojob' or 'shutdown'.
 * @private
 */
Client.prototype.requestNextJob_ = function() {
  'use strict';
  var getWorkUrl = url.resolve(this.baseUrl_,
      GET_WORK_SERVLET +
          '?location=' + encodeURIComponent(this.location_) + '&f=json');

  logger.info('Get work: %s', getWorkUrl);
  http.get(url.parse(getWorkUrl), function(res) {
    exports.processResponse(res, function(responseBody) {
      if (responseBody === '' || responseBody[0] === '<') {
        this.emit('nojob');
      } else if (responseBody === 'shutdown') {
        this.emit('shutdown');
      } else {  // We got a job
        this.processJobResponse_(responseBody);
      }
    }.bind(this));
  }.bind(this));
};

/**
 * processJobResponse_ processes a server response and starts a new job
 * @private
 *
 * @param {String} responseBody server response as stringified JSON
 *                 with job information.
 */
Client.prototype.processJobResponse_ = function(responseBody) {
  'use strict';
  var job = new exports.Job(this, JSON.parse(responseBody));
  logger.info('Got job: %j', job);
  this.startNextRun_(job);
};

Client.prototype.startNextRun_ = function(job) {
  'use strict';
  if (job.runNumber < job.runs) {
    job.runNumber += 1;
    job.error = undefined;  // Reset previous run's error, if any.
    // For comparison in finishRun_()
    this.currentJob_ = job;
    // Set up job timeout
    this.timeoutTimer_ = global.setTimeout(function() {
      logger.error('job timeout: %s', job.id);
      job.error = 'timeout';
      if (this.onJobTimeout) {
        this.onJobTimeout(job);
      } else {
        job.runFinished();
      }
    }.bind(this), this.jobTimeout_);

    if (this.onStartJobRun) {
      try {
        this.onStartJobRun(job);
      } catch (e) {
        logger.error('Exception while running the job: %s', e);
        job.error = e.message;
        job.runFinished();
      }
    } else {
      logger.critical('Client.onStartJobRun must be set');
      job.error = 'Agent is not configured to process jobs';
      job.runFinished();
    }
  }
};

/**
 * Ensures that the supposed job finished is actually the current one.
 * If it is, it will submit it so the results can be generated.
 * If a job times out and finishes later, finishRun_ will still be called,
 * but it will be handled and no results will be generated.
 * @private
 *
 * @param {Object} job the job that supposedly finished.
 */
Client.prototype.finishRun_ = function(job) {
  'use strict';
  logger.alert('Finished run %s/%s of job %s', job.runNumber, job.runs, job.id);
  // Expected finish of the current job
  if (this.currentJob_ === job) {
    global.clearTimeout(this.timeoutTimer_);
    this.timeoutTimer_ = undefined;
    this.currentJob_ = undefined;
    this.submitResult_(job, function() {
      this.handlingUncaughtException_ = undefined;
      this.startNextRun_(job);
    }.bind(this));
  } else {  // Belated finish of an old already timed-out job
    logger.error('Timed-out job finished, but too late: %s', job.id);
    this.handlingUncaughtException_ = undefined;
  }
};

/**
 * Submits one part of the job result, with an optional file.
 * @private
 *
 * @param  {Object} job the result file will be saved for.
 * @param  {Object} resultFile of type ResultFile. May be null/undefined.
 * @param  {Array} [fields] an array of [name, value] text fields to add.
 * @param  {Function} [callback] will get called with the HTTP response body.
 */
Client.prototype.postResultFile_ = function(job, resultFile, fields, callback) {
  'use strict';
  logger.extra('postResultFile: job=%s resultFile=%s fields=%j callback=%s',
      job.id, (resultFile ? 'present' : null), fields, callback);
  var servlet = WORK_DONE_SERVLET;
  var mp = new multipart.Multipart();
  mp.addPart('id', job.id, ['Content-Type: text/plain']);
  mp.addPart('location', this.location_);
  if (this.apiKey) {
    mp.addPart('key', this.apiKey);
  }
  if (fields) {
    fields.forEach(function(nameValue) {
      mp.addPart(nameValue[0], nameValue[1]);
    });
  }
  if (resultFile) {
    // A part with name="resultType" and then the content with name="file"
    if (exports.ResultFile.ResultType.IMAGE === resultFile.resultType) {
      // Images go to a different servlet and don't need the resultType part
      servlet = RESULT_IMAGE_SERVLET;
    } else {
      mp.addPart(resultFile.resultType, '1');
    }
    mp.addFilePart(
        'file',
        resultFile.fileName, resultFile.contentType, resultFile.content);
  }
  // TODO(klm): change body to chunked request.write().
  // Only makes sense if done for file content, the rest is peanuts.
  var mpResponse = mp.getHeadersAndBody();

  var options = {
    method: 'POST',
    host: this.baseUrl_.hostname,
    port: this.baseUrl_.port,
    path: path.join(this.baseUrl_.path, servlet),
    headers: mpResponse.headers};
  var request = http.request(options, function(res) {
    exports.processResponse(res, callback);
  });
  request.end(mpResponse.bodyBuffer, 'UTF-8');
};

/**
 * submitResult_ posts all result files for the job and emits done.
 * @private
 *
 * @param  {Object} job that should be completed.
 */
Client.prototype.submitResult_ = function(job, callback) {
  'use strict';
  logger.debug('submitResult_: job=%s', job.id);
  var filesToSubmit = job.resultFiles.slice();
  var fields;
  job.resultFiles = [];
  // Chain submitNextResult calls off of the HTTP request callback
  var submitNextResult = function() {
    var resultFile = filesToSubmit.shift();
    if (resultFile) {
      fields = [
          ['_runNumber', String(job.runNumber)],
          ['_cacheWarmed', '0']];
      if (job.error) {
        fields.push(['error', job.error]);
      }
      this.postResultFile_(job, resultFile, fields, submitNextResult);
    } else {
      if (job.runNumber === job.runs) {
        fields = [['done', '1']];
        if (job.error) {
          fields.push(['testerror', job.error]);
        }
        this.postResultFile_(job, undefined, fields, function() {
          if (callback) {
            callback();
          }
          this.emit('done', job);
        }.bind(this));
      } else if (callback) {
         callback();
      }
    }
  }.bind(this);
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
Client.prototype.run = function(forever) {
  'use strict';
  var self = this;

  if (forever) {
    this.on('nojob', function() {
      global.setTimeout(function() {
        self.requestNextJob_();
      }, exports.NO_JOB_PAUSE);
    });
    this.on('done', function() {
      self.requestNextJob_();
    });
  }
  this.requestNextJob_();
};
