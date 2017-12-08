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

var browser_base = require('browser_base');
var child_process = require('child_process');
var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var logger = require('logger');
var nopt = require('nopt');
var path = require('path');
var process_utils = require('process_utils');
var system_commands = require('system_commands');
var webdriver = require('selenium-webdriver');
var web_page_replay = require('web_page_replay');
var wpt_client = require('wpt_client');

/**
 * Partial list of expected command-line options.
 *
 * @see wd_server init defines additional command-line args, e.g.:
 *     browser: [String, null],
 *     chromedriver: [String, null],
 *     ..
 */
var knownOpts = {
  serverUrl: [String, null],
  insecure: Boolean,
  clientCert: [String, null],
  clientCertPass: [String, null],
  location: [String, null],
  deviceAddr: [String, null],
  deviceSerial: [String, null],
  jobTimeout: [Number, null],
  apiKey: [String, null],
  exitTests: [Number, null]
};

var WD_SERVER_EXIT_TIMEOUT = 5000;  // Wait for 5 seconds before force-killing

/**
 * @param {webdriver.promise.ControlFlow} app the ControlFlow for scheduling.
 * @param {wpt_client.Client} client the WebPagetest client.
 * @param {Object} flags from knownOpts.
 * @constructor
 */
function Agent(app, client, flags) {
  'use strict';
  this.client_ = client;
  this.flags_ = flags;
  this.app_ = app;
  process_utils.injectWdAppLogging('agent_main', this.app_);
  // The directory to store run result files. Clean it up before+after each run.
  // We want a fixed name, to avoid leaving junk after agent crashes/restarts.
  var runTempSuffix = flags.deviceSerial || '';
  if (!/^[a-z0-9\-]*$/i.test(runTempSuffix)) {
    throw new Error('--deviceSerial may contain only letters and digits');
  }
  this.runTempRoot_ = 'runtmp/' + (runTempSuffix || '_wpt');
  deleteFolderRecursive(this.runTempRoot_);
  this.runTempDir_ = this.runTempRoot_;
  this.workDir_ = 'work/' + (runTempSuffix || '_wpt');
  this.scheduleCleanWorkDir_();
  this.aliveFile_ = undefined;
  if (flags.alive)
    this.aliveFile_ = flags.alive + '.alive';
  this.wdServer_ = undefined;  // The wd_server child process.
  this.webPageReplay_ = new web_page_replay.WebPageReplay(this.app_,
      {flags: flags});

  // Create a single (separate) instance of the browser for checking status.
  this.browser_ = browser_base.createBrowser(this.app_,
      {flags: flags, task: {}});

  this.client_.onPrepareJob = this.prepareJob_.bind(this);
  this.client_.onStartJobRun = this.startJobRun_.bind(this);
  this.client_.onAbortJob = this.abortJob_.bind(this);
  this.client_.onMakeReady = this.onMakeReady_.bind(this);
  this.client_.onAlive = this.onAlive_.bind(this);
  this.startTime_ = process.hrtime();

  // do the one-time device cleanup at startup
  this.browser_.deviceCleanup();
}
/** Public class. */
exports.Agent = Agent;

/**
 * Runs jobs that it receives from the client.
 */
Agent.prototype.run = function() {
  'use strict';
  this.client_.run(/*forever=*/true);
};

/**
 * @param {string=} description debug title.
 * @param {Function} f the function to schedule.
 * @return {webdriver.promise.Promise} the scheduled promise.
 * @private
 */
Agent.prototype.scheduleNoFault_ = function(description, f) {
  'use strict';
  return process_utils.scheduleNoFault(this.app_, description, f);
};

var deleteFolderRecursive = function(path) {
  try {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file,index){
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  } catch(e) {}
};

/**
 * Starts a child process with the wd_server module.
 * @param {Job} job the job for which we are starting the server process.
 * @private
 */
Agent.prototype.startWdServer_ = function(job) {
  'use strict';
  this.wdServer_ = child_process.fork('./src/wd_server.js',
      [], {env: process.env});
  this.wdServer_.on('message', function(ipcMsg) {
    logger.debug('got IPC: %s', ipcMsg.cmd);
    if ('done' === ipcMsg.cmd || 'error' === ipcMsg.cmd) {
      job.testError = job.testError || ipcMsg.testError;
      job.agentError = job.agentError || ipcMsg.agentError;
      var isRunFinished = (
          job.isFirstViewOnly || job.isCacheWarm ||
          !!job.testError);  // Fail job if first-view fails.
      this.scheduleProcessDone_(ipcMsg, job);
      if (isRunFinished) {
        this.scheduleCleanup_(job, /*isEndOfJob=*/job.runNumber === job.runs);
      }
      // Do this only at the very end, as it starts a new run of the job.
      this.scheduleNoFault_('Job finished',
          job.runFinished.bind(job, isRunFinished));
    }
  }.bind(this));
  this.wdServer_.on('exit', function(code, signal) {
    logger.info('wd_server child process exit code %s signal %s', code, signal);
    this.wdServer_ = undefined;
  }.bind(this));
};

/**
 * Processes job results, including failed jobs.
 *
 * @param {Object} ipcMsg a message from the wpt client.
 * @param {Job} job the job with results.
 * @private
 */
Agent.prototype.scheduleProcessDone_ = function(ipcMsg, job) {
  'use strict';
  this.app_.schedule('Process job results', function() {
    if (ipcMsg.devToolsFile)
      job.zipResultFiles['devtools.json'] = fs.readFileSync(ipcMsg.devToolsFile, "utf8");
    if (ipcMsg.customMetrics)
      job.zipResultFiles['metrics.json'] = JSON.stringify(ipcMsg.customMetrics);
    if (ipcMsg.userTimingMarks)
      job.zipResultFiles['timed_events.json'] = JSON.stringify(ipcMsg.userTimingMarks);
    if (ipcMsg.pageData)
      job.zipResultFiles['page_data.json'] = JSON.stringify(ipcMsg.pageData);
    if (ipcMsg.netlogFile)
      job.zipResultFiles['netlog.txt'] = fs.readFileSync(ipcMsg.netlogFile, "utf8");
    if (ipcMsg.histogramFile) {
      try {
        var buffer = fs.readFileSync(ipcMsg.histogramFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.IMAGE,
              'histograms.json.gz',
              'text/plain',
              buffer));
        }
        fs.unlinkSync(ipcMsg.histogramFile);
      } catch(e) {}
    }
    if (ipcMsg.traceFile) {
      try {
        var buffer = fs.readFileSync(ipcMsg.traceFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.GZIP,
              'trace.json.gz', 'application/x-gzip', buffer));
        }
        fs.unlinkSync(ipcMsg.traceFile);
      } catch(e) {}
    }
    if (ipcMsg.lighthouseFile) {
      try {
        var buffer = fs.readFileSync(ipcMsg.lighthouseFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.GZIP,
              'lighthouse.html.gz', 'application/x-gzip', buffer));
        }
        fs.unlinkSync(ipcMsg.lighthouseFile);
      } catch(e) {}
    }
    if (ipcMsg.userTimingFile) {
      try {
        var buffer = fs.readFileSync(ipcMsg.userTimingFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.GZIP,
              'user_timing.json.gz', 'application/x-gzip', buffer));
        }
        fs.unlinkSync(ipcMsg.userTimingFile);
      } catch(e) {}
    }
    if (ipcMsg.cpuSlicesFile) {
      logger.debug("Processing CPU Slices file: " + ipcMsg.cpuSlicesFile);
      try {
        var buffer = fs.readFileSync(ipcMsg.cpuSlicesFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.GZIP,
              'timeline_cpu.json.gz', 'application/x-gzip', buffer));
        }
        fs.unlinkSync(ipcMsg.cpuSlicesFile);
      } catch(e) {}
    }
    if (ipcMsg.scriptTimingFile) {
      logger.debug("Processing Script Timing file: " + ipcMsg.scriptTimingFile);
      try {
        var buffer = fs.readFileSync(ipcMsg.scriptTimingFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.GZIP,
              'script_timing.json.gz', 'application/x-gzip', buffer));
        }
        fs.unlinkSync(ipcMsg.scriptTimingFile);
      } catch(e) {
        logger.debug("Error Processing Script Timing file: " + ipcMsg.scriptTimingFile);
      }
    }
    if (ipcMsg.pcapSlicesFile) {
      logger.debug("Processing PCAP Slices file: " + ipcMsg.pcapSlicesFile);
      try {
        var buffer = fs.readFileSync(ipcMsg.pcapSlicesFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.GZIP,
              'pcap_slices.json.gz', 'application/x-gzip', buffer));
        }
        fs.unlinkSync(ipcMsg.pcapSlicesFile);
      } catch(e) {}
    }
    if (ipcMsg.featureUsageFile) {
      logger.debug("Processing Feature usage file: " + ipcMsg.featureUsageFile);
      try {
        var buffer = fs.readFileSync(ipcMsg.featureUsageFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.GZIP,
              'feature_usage.json.gz', 'application/x-gzip', buffer));
        }
        fs.unlinkSync(ipcMsg.featureUsageFile);
      } catch(e) {}
    }
    if (ipcMsg.interactiveFile) {
      logger.debug("Processing interactive usage file: " + ipcMsg.interactiveFile);
      try {
        var buffer = fs.readFileSync(ipcMsg.interactiveFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.GZIP,
              'interactive.json.gz', 'application/x-gzip', buffer));
        }
        fs.unlinkSync(ipcMsg.interactiveFile);
      } catch(e) {}
    }
    if (ipcMsg.v8File) {
      logger.debug("Processing v8 stats file: " + ipcMsg.v8File);
      try {
        var buffer = fs.readFileSync(ipcMsg.v8File);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.GZIP,
              'v8stats.json.gz', 'application/x-gzip', buffer));
        }
        fs.unlinkSync(ipcMsg.v8File);
      } catch(e) {}
    }
    if (ipcMsg.screenshots && ipcMsg.screenshots.length > 0) {
      var imageDescriptors = [];
      ipcMsg.screenshots.forEach(function(screenshot) {
        try {
          logger.debug('Adding screenshot %s', screenshot.fileName);
          var buffer = fs.readFileSync(screenshot.diskPath);
          if (buffer) {
            job.resultFiles.push(new wpt_client.ResultFile(
                wpt_client.ResultFile.ResultType.IMAGE,
                screenshot.fileName,
                screenshot.contentType,
                buffer));
            if (screenshot.description) {
              imageDescriptors.push({
                filename: screenshot.fileName,
                description: screenshot.description
              });
            }
          }
          fs.unlinkSync(screenshot.fileName);
        } catch(e) {}
      }.bind(this));
      if (imageDescriptors.length > 0) {
        job.zipResultFiles['images.json'] = JSON.stringify(imageDescriptors);
      }
    }
    if (ipcMsg.videoFile) {
      try {
        var buffer = fs.readFileSync(ipcMsg.videoFile);
        if (buffer) {
          var ext = path.extname(ipcMsg.videoFile);
          var mimeType = ('.mp4' === ext) ? 'video/mp4' : 'video/avi';
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.IMAGE,
              'video' + ext, mimeType, buffer));
        }
        fs.unlinkSync(ipcMsg.videoFile);
      } catch(e) {}
    }
    if (ipcMsg.videoFrames) {
      ipcMsg.videoFrames.forEach(function(videoFrame) {
        try {
          logger.debug('Adding video frame %s', videoFrame.fileName);
          var buffer = fs.readFileSync(videoFrame.diskPath);
          if (buffer) {
            job.resultFiles.push(new wpt_client.ResultFile(
                wpt_client.ResultFile.ResultType.IMAGE,
                videoFrame.fileName,
                'image/jpeg',
                buffer));
          }
          fs.unlinkSync(videoFrame.diskPath);
        } catch(e) {}
      }.bind(this));
    }
    if (ipcMsg.pcapFile) {
      try {
        var buffer = fs.readFileSync(ipcMsg.pcapFile);
        if (buffer) {
          job.resultFiles.push(new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.PCAP,
              '.cap', 'application/vnd.tcpdump.pcap', buffer));
        }
        fs.unlinkSync(ipcMsg.pcapFile);
      } catch(e) {}
    }
    this.stopTrafficShaper_();
    if (job.isReplay) {
      this.webPageReplay_.scheduleGetErrorLog().then(function(log) {
        if (log) {
          job.zipResultFiles['replay.log'] = log;
        }
      }.bind(this));
    }
  }.bind(this)).addErrback(function(e) {
    logger.error('Unable to collect results: ' + e.message);
    job.agentError = job.agentError || e.message;
  });
};

/**
 * Do any pre-job preparation
 *
 * @param {Job} job the job to prepare.
 * @private
 */
Agent.prototype.prepareJob_ = function(job) {
  var done = new webdriver.promise.Deferred();
  process_utils.scheduleNoFault(this.app_, 'Stop WPR', function() {
    this.webPageReplay_.scheduleStop();
  }.bind(this));
  if (job.task.customBrowserUrl && job.task.customBrowserMD5) {
    var browserName = path.basename(job.task.customBrowserUrl);
    logger.debug("Custom Browser: " + browserName);
    this.scheduleCreateDirectory_(this.app_, this.workDir_).then(
        function() {
      this.scheduleCreateDirectory_(this.app_,
          path.join(this.workDir_, 'browsers')).then(function() {
        job.customBrowser = path.join(this.workDir_, 'browsers',
            job.task.customBrowserMD5 + '-' + browserName);
        process_utils.scheduleFunction(this.app_,
            'Check if browser exists', fs.exists, job.customBrowser).then(
            function(exists) {
          if (!exists) {
            // TODO(pmeenan): Implement a cleanup that deletes custom browsers
            // that haven't been used in a while
            logger.debug("Custom Browser not available, downloading from " +
                job.task.customBrowserUrl);
            var tempFile = job.customBrowser + '.tmp';
            try {fs.unlinkSync(tempFile);} catch(e) {}
            var active = true;
            var md5 = crypto.createHash('md5');
            var file = fs.createWriteStream(tempFile);
            var onError = function(e) {
              if (active) {
                active = false;
                file.end();
                try {fs.unlinkSync(tempFile);} catch(e) {}
                e.message = 'Custom browser download failure from ' +
                    job.task.customBrowserUrl + ': ' + e.message;
                logger.warn(e.message);
                done.reject(e);
              }
            }.bind(this);
            var onDone = function() {
              if (active) {
                active = false;
                file.end();
                var md5hex = md5.digest('hex').toUpperCase();
                logger.debug('Finished download - md5: ' + md5hex);
                if (md5hex == job.task.customBrowserMD5.toUpperCase()) {
                  process_utils.scheduleFunction(this.app_,
                          'Rename successful browser download',
                          fs.rename, tempFile, job.customBrowser).then(
                      function() {
                    done.fulfill();
                  }.bind(this), function() {
                    done.reject(new Error(
                        'Failed to rename custom browser file'));
                  }.bind(this));
                } else {
                  process_utils.scheduleUnlinkIfExists(this.app_,
                      tempFile).then(function() {
                    done.reject(new Error(
                        'Failed to download custom browser from ' +
                        job.task.customBrowserUrl));
                  }.bind(this));
                }
              }
            }.bind(this);
            var request = http.get(job.task.customBrowserUrl,
                function(response) {
              response.pipe(file);
              response.on('data', function(chunk) {
                md5.update(chunk);
              }.bind(this));
              response.on('error', onError);
              response.on('end', onDone);
              response.on('close', onDone);
            }.bind(this));
            request.on('error', onError);
            request.end();
          } else {
            logger.debug("Custom Browser already available");
            done.fulfill();
          }
        }.bind(this));
      }.bind(this));
    }.bind(this));
  } else {
    done.fulfill();
  }
  return done.promise;
};

/**
 * Performs one run of a job in a wd_server module that runs as a child process.
 *
 * Must call job.runFinished() no matter how the run ended.
 *
 * @param {Job} job the job to run.
 * @private
 */
Agent.prototype.startJobRun_ = function(job) {
  'use strict';
  this.app_.schedule('Start run', function() {
    this.runTempDir_ = this.runTempRoot_ + "/" + job.id + "." + job.runNumber;
    if (job.isCacheWarm)
        this.runTempDir_ += ".rv";
    // Validate job
    var script = job.task.script;
    var url = job.task.url;
    try {
      if (script && !/new\s+(\S+\.)?Builder\s*\(/.test(script)) {
        // Nuke any non-webdriver scripts for now.  Regular WPT
        // scripts would have been pre-processed when the task was
        // initially parsed.
        script = undefined;
      }
      url = url.trim();
      if (!((/^https?:\/\//i).test(url))) {
        url = 'http://' + url;
      }
    } catch (e) {
      job.testError = e.message;
      this.abortJob_(job);
      return;
    }

    logger.info('%s run %d%s/%d of job %s',
        (job.retryError ? 'Retrying' : 'Starting'), job.runNumber,
        (job.isFirstViewOnly ? '' : (job.isCacheWarm ? 'b' : 'a')),
        job.runs, job.id);

    if (this.wdServer_ && !job.isCacheWarm) {
      if (!job.retryError) {
        throw new Error('Internal error: unclean non-retry first view');
      }
      logger.debug('Cleaning before repeat first-view');
      this.scheduleCleanup_(job, /*isEndOfJob=*/false);
    }
    this.scheduleCleanRunTempDir_();

    if (this.isTrafficShaping_(job)) {
      this.startTrafficShaper_(job);  // Start shaping.
    } else {
      this.stopTrafficShaper_();  // clear any traffic shaping.
    }

    if (!job.isCacheWarm) {
      if (job.isReplay) {
        if (job.runNumber === 0) {
          this.webPageReplay_.scheduleStop();  // Force-stop WPR before record..
          this.webPageReplay_.scheduleRecord();
        } else if (job.runNumber === 1) {
          this.webPageReplay_.scheduleReplay();  // Start replay on first run.
        }
      } else if (job.runNumber === 1) {  // WPR not requested, so force-stop it.
        process_utils.scheduleNoFault(
            this.app_, 'Stop WPR just in case, ignore failures', function() {
          this.webPageReplay_.scheduleStop();
        }.bind(this));
      }

      this.app_.schedule('Start WD Server',
          this.startWdServer_.bind(this, job));
    }
    this.app_.schedule('Send IPC "run"', function() {
      // Copy our flags and task
      var flags = {};
      Object.getOwnPropertyNames(this.flags_).forEach(function(flagName) {
        flags[flagName] = this.flags_[flagName];
      }.bind(this));
      var task = {};
      Object.getOwnPropertyNames(job.task).forEach(function(key) {
        task[key] = job.task[key];
      }.bind(this));
      // Override some task fields:
      if (!!script) {
        task.script = script;
      } else {
        delete task.script;
      }
      if (!!url) {
        task.url = url;
      }
      var message = {
          cmd: 'run',
          runNumber: job.runNumber,
          isCacheWarm: job.isCacheWarm,
          exitWhenDone: job.isFirstViewOnly || job.isCacheWarm,
          timeout: job.timeout,
          customBrowser: job.customBrowser,
          runTempDir: this.runTempDir_,
          workDir: this.workDir_,
          flags: flags,
          task: task
        };
      this.wdServer_.send(message);
    }.bind(this));
  }.bind(this)).addErrback(function(e) {
    logger.error('Unable to start job: ' + e.message);
    job.agentError = job.agentError || e.message;
    this.abortJob_(job);
  }.bind(this));
};

 /**
 * Create the requested directory if it doesn't already exist.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param dir
 * @return {webdriver.promise.Promise} fulfill({Object}):
 */
Agent.prototype.scheduleCreateDirectory_ = function(app, dir) {
  return process_utils.scheduleFunction(app, 'Check if ' + dir + ' exists', fs.exists,
      dir).then(function(exists) {
    if (!exists) {
      return process_utils.scheduleFunctionNoFault(app, 'Create Directory ' + dir,
          fs.mkdir, dir, parseInt('0755', 8));
    }
  }.bind(this));
};

/**
 * Creates the specified directory if it doesn't already exist.
 * @param {string} dir Directory name.
 * @private
 */
Agent.prototype.scheduleMakeDirs_ = function(dir) {
  'use strict';
  process_utils.scheduleFunction(this.app_, 'Make dirs', fs.exists, dir).then(
      function(exists) {
    if (!exists) {
      var sep = dir.lastIndexOf('/');
      if (sep > 0) {
        this.scheduleMakeDirs_(dir.substring(0, sep));  // Recurse.
      }
      process_utils.scheduleFunction(this.app_, 'Make dir', fs.mkdir, dir);
    }
  }.bind(this));
};

/**
 * Makes sure the run temp dir exists and is empty, but ignores deletion errors.
 * Currently supports only flat files, no subdirectories.
 * @private
 */
Agent.prototype.scheduleCleanRunTempDir_ = function() {
  'use strict';
  this.scheduleNoFault_('Clean temp dir', function() {
    deleteFolderRecursive(this.runTempRoot_);
    this.scheduleMakeDirs_(this.runTempDir_);
  }.bind(this));
};

/**
 * Makes sure the work dir exists and is empty, but ignores deletion errors.
 * Currently supports only flat files, no subdirectories.
 * @private
 */
Agent.prototype.scheduleCleanWorkDir_ = function() {
  'use strict';
  this.scheduleNoFault_('Clean work dir', function() {
    deleteFolderRecursive(this.workDir_);
    this.scheduleMakeDirs_(this.workDir_);
  }.bind(this));
};

/**
 * Download the specified file, verifying that the md5 hash matches
 * @private
 */
Agent.prototype.scheduleDownload_ = function() {
  this.app_.schedule('Download', function() {
    var tmpFile = this.cacheDir_ + '/download.tmp';
    try {fs.unlinkSync(tmpFile);} catch(e) {}
    this.app_.wait(function() {
      var downloaded = new webdriver.promise.Deferred();
      var file = fs.createWriteStream(tmpFile);
      var request = http.get(job.customBrowserUrl, function(response) {
        response.pipe(file);
        file.on('finish', function() {
          file.close(function() {
            downloaded.fulfill();
          });
        });
      });
      return downloaded;
    });
  }).bind(this);
};

/**
 * @param {Object} job the job to abort (e.g. due to timeout).
 * @private
 */
Agent.prototype.abortJob_ = function(job) {
  'use strict';
  if (this.wdServer_) {
    this.wdServer_.removeAllListeners('message');
    this.wdServer_.send({cmd: 'abort'});
  }
  this.scheduleCleanup_(job, /*isEndOfJob=*/true);
  this.scheduleNoFault_('Abort job',
      job.runFinished.bind(job, /*isRunFinished=*/true));
};

/**
 * Updates/writes an alive file periodically
 * @private
 */
Agent.prototype.onAlive_ = function() {
  'use strict';
  if (this.aliveFile_) {
    fs.closeSync(fs.openSync(this.aliveFile_, 'w'));
  }
};

/**
 * Kill the wdServer and traffic shaper.
 *
 * @param {Job} job
 * @param {boolean} isEndOfJob whether we are done with the entire job.
 * @private
 */
Agent.prototype.scheduleCleanup_ = function(job, isEndOfJob) {
  'use strict';
  process_utils.scheduleNoFault(this.app_, 'Stop wd_server', function() {
    if (this.wdServer_) {
      this.wdServer_.removeAllListeners('message');
      process_utils.scheduleWait(this.app_, this.wdServer_, 'wd_server',
            WD_SERVER_EXIT_TIMEOUT).then(function() {
        // This assumes a clean exit with no zombies
        this.wdServer_ = undefined;
      }.bind(this), function() {
        process_utils.scheduleKillTree(this.app_, 'Kill wd_server',
            this.wdServer_);
        this.app_.schedule('undef wd_server', function() {
          this.wdServer_ = undefined;
        }.bind(this));
      }.bind(this));
    }
  }.bind(this));
  if (isEndOfJob) {
    if (job.isReplay) {
      process_utils.scheduleNoFault(
          this.app_, 'Stop WPR', function() {
        this.webPageReplay_.scheduleStop();
      }.bind(this));
    }
  }
  if (1 === parseInt(this.flags_.killall || '0', 10)) {
    // Kill all processes for this user, except our own process and parent(s).
    //
    // This assumes that there are no extra login shells for our user,
    // otherwise they'll all be killed!  The expected use is to create a custom
    // user, e.g. "foo", and launch our agent via:
    //    nohup sudo -u foo -H ./wptdriver.sh --killall 1 ... &
    // Ideally we could run agent_main as our normal user and do this "sudo -u"
    // when we fork wd_server, but cross-user IPC apparently doesn't work.
    process_utils.scheduleGetAll(this.app_).then(function(processInfos) {
      var pid = process.pid;
      var pi; // Declare outside the loop, to avoid a jshint warning
      while (pid) {
        pi = undefined;
        for (var i = 0; i < processInfos.length; ++i) {
          if (processInfos[i].pid === pid) {
            pi = processInfos.splice(i, 1)[0];
            logger.debug('Not killing user %s pid=%s: %s %s', process.env.USER,
                pid, pi.command, pi.args.join(' '));
            break;
          }
        }
        pid = (pi ? pi.ppid : undefined);
      }
      if (processInfos.length > 0) {
        logger.info('Killing %s pids owned by user %s: %s', processInfos.length,
            process.env.USER,
            processInfos.map(function(pi) { return pi.pid; }).join(', '));
        process_utils.scheduleKillAll(
            this.app_, 'Kill dangling pids', processInfos);
      }
    }.bind(this), function(e) {
      logger.error('Unable to killall pids: ' + e.message);
    });
  }
};

/**
 * Schedules the browser MakeReady with added agent cleanup.
 *
 * @return {webdriver.promise.Promise} resolve(boolean) isReady.
 * @private
 */
Agent.prototype.onMakeReady_ = function() {
  'use strict';
  // When configured to exit after a given number of tests, also force an exit
  // every hour.
  if (this.flags_.exitTests) {
    var elapsed = process.hrtime(this.startTime_);
    logger.debug('Uptime (seconds): ' + elapsed[0]);
    if (elapsed[0] >= 3600) {
      logger.info('Runtime of 1 hour has been reached (enabled with exitTests), exiting...');
      process.exit(0);
    }
  }

  try {global.gc();} catch (e) {}
  deleteFolderRecursive(this.runTempRoot_);
  return this.browser_.scheduleMakeReady(this.browser_).addBoth(
      function(errOrBool) {
    if (!(errOrBool instanceof Error)) {
      return errOrBool;  // is online.
    }
    var done = new webdriver.promise.Deferred();
    this.app_.schedule('Not ready', function() { done.reject(errOrBool); });
    return done.promise;
  }.bind(this));
};

/**
 * Schedules a traffic shaper command.
 *
 * The "--trafficShaper" script defaults to "./ipfw_config".  If the value
 * contains commas, the comma-separated values are passes as additional
 * command arguments (e.g. "my_ipfw,--x,123").
 *
 * @param {string} command 'set', 'get', or 'clear'.
 * @param {Object.<string>=} opts
 *    #param {string=} down_bw input bandwidth in bits/s (>= 0)
 *    #param {string=} down_delay input delay in ms (>= 0)
 *    #param {string=} down_plr input packet loss rate [0..1].
 *    #param {string=} up_bw output bandwidth in bits/s (>= 0)
 *    #param {string=} up_delay output delay in ms (>= 0)
 *    #param {string=} up_plr output packet loss rate [0..1].
 *    #param {string=} device deviceSerial id (undefined for desktops).
 *    #param {string=} address network address (IP or MAC).
 * @return {webdriver.promise.Promise} The scheduled promise.
 * @private
 */
Agent.prototype.trafficShaper_ =
    function(command, opts) {  // jshint unused:false
  'use strict';
  var cmd = this.flags_.trafficShaper || './ipfw_config';
  var args = [];
  if (0 !== cmd.indexOf(',')) {
    // support 'proxy,--url,http://foo:8084,ipfw_config'
    args = cmd.split(',');  // ignore escaping literal ','s for now
    cmd = args.shift();
  }
  args.push(command);
  Object.keys(opts || {}).forEach(function(key) {
    if (undefined !== opts[key]) {
      args.push('--' + key, opts[key]);
    }
  }.bind(this));
  if (!(opts && 'device' in opts) && this.flags_.deviceSerial) {
    args.push('--device', this.flags_.deviceSerial);
  }
  if (!(opts && 'address' in opts) && this.flags_.deviceAddr) {
    args.push('--address', this.flags_.deviceAddr);
  }
  return process_utils.scheduleExec(this.app_, cmd, args);
};

/**
 * @param {Job} job
 * @return {boolean} true if the job has traffic shaping.
 * @private
 */
Agent.prototype.isTrafficShaping_ = function(job) {
  'use strict';
  return (job.task.bwIn || job.task.bwOut || job.task.latency || job.task.plr);
};

/**
 * Starts the traffic shaper.
 *
 * @param {Job} job
 * @private
 */
Agent.prototype.startTrafficShaper_ = function(job) {
  'use strict';
  var halfDelay = Math.floor(job.task.latency / 2);
  var opts = {
      down_bw: job.task.bwIn && (1000 * job.task.bwIn),
      down_delay: job.task.latency && halfDelay,
      down_plr: job.task.plr && (job.task.plr / 100.0),
      up_bw: job.task.bwOut && (1000 * job.task.bwOut),
      up_delay: job.task.latency && job.task.latency - halfDelay,
      up_plr: job.task.plr && (job.task.plr / 100.0)
    };
  this.trafficShaper_('set', opts).addErrback(function(e) {
    var stderr = (e.stderr || e.message || '').trim();
    job.agentError = job.agentError || stderr;
    throw new Error('Unable to configure traffic shaping:\n' + stderr + '\n' +
      ' To disable traffic shaping, re-run your test with ' +
      '"Advanced Settings > Test Settings > Connection = Native Connection"' +
      ' or add "connectivity=WiFi" to this location\'s WebPagetest config.');
  }.bind(this));
};

/**
 * Stops the traffic shaper.
 * @private
 */
Agent.prototype.stopTrafficShaper_ = function() {
  'use strict';
  this.trafficShaper_('clear').addErrback(function(/*e*/) {
    logger.debug('Ignoring failed trafficShaper clear');
  }.bind(this));
};

/**
 * Node.js is a multiplatform framework, however because we are making native
 * system calls, it becomes platform dependent. To reduce dependencies
 * throughout the code, all native commands are set here and when a command is
 * called through system_commands.get, the correct command for the current
 * platform is returned
 */
exports.setSystemCommands = function() {
  'use strict';
  process_utils.setSystemCommands();

  system_commands.set('run', './$0', 'unix');
  system_commands.set('run', '$0', 'win32');
};

/**
 * main is called automatically if agent_main is the node module called directly
 * which it should be. Main initializes the wpt_client Object with the flags
 * set by the run script and calls run with it
 *
 * @param  {Object} flags command line flags.
 */
exports.main = function(flags) {
  'use strict';
  exports.setSystemCommands();
  delete flags.argv; // Remove nopt dup
  var app = webdriver.promise.controlFlow();
  var client = new wpt_client.Client(app, flags);
  var agent = new Agent(app, client, flags);
  agent.run();
};

if (require.main === module) {
  try {
    exports.main(nopt(knownOpts, {}, process.argv, 2));
  } catch (e) {
    console.error(e);
    process.exit(-1);
  }
}
