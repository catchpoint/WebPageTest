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
/*jslint nomen:false */

var child_process = require('child_process');
var devtools2har = require('devtools2har');
var fs = require('fs');
var logger = require('logger');
var nopt = require('nopt');
var process_utils = require('process_utils');
var system_commands = require('system_commands');
var webdriver = require('webdriver');
var wpt_client = require('wpt_client');
var Zip = require('node-zip');

var flagDefs = {
  knownOpts: {
    wpt_server: [String, null],
    location: [String, null],
    java: [String, null],
    seleniumJar: [String, null],
    chrome: [String, null],
    chromedriver: [String, null],
    devtools2harJar: [String, null],
    job_timeout: [Number, null],
    api_key: [String, null]
  },
  shortHands: {}
};

var WD_SERVER_EXIT_TIMEOUT = 5000;  // Wait for 5 seconds before force-killing
var HAR_FILE_ = './results.har';
var DEVTOOLS_EVENTS_FILE_ = './devtools_events.json';
var IPFW_FLUSH_FILE_ = 'ipfw_flush.sh';

exports.seleniumJar = undefined;
exports.chromedriver = undefined;


/**
 * Deletes temporary files used during a test.
 */
function deleteHarTempFiles(callback) {
  'use strict';
  var files = [DEVTOOLS_EVENTS_FILE_, HAR_FILE_];
  function unlink (prevFile, prevError) {
    if (prevError && !(prevError.code && 'ENOENT' === prevError.code)) {
      // There is an error other than 'file not found'
      logger.error('Unlink error for %s: %s', prevFile, prevError);
    }
    var nextFile = files.pop();
    if (nextFile) {
      fs.unlink(nextFile, unlink.bind(undefined, nextFile));
    } else if (callback) {
      if (prevError && !(prevError.code && 'ENOENT' === prevError.code)) {
        // There is an error other than 'file not found'
        callback(prevError);
      } else {
        callback();
      }
    }
  }
  unlink();
}

/**
 * Takes devtools messages and creates an appropriate file body that it passes
 * to harCallback
 *
 * @param {Object[]} devToolsMessages an array of the developer tools messages.
 * @param {String} [pageId] the page ID string for (the only page) in the HAR.
 * @param {String} [browserName] browser name for the HAR.
 * @param {String} [browserVersion] browser version for the HAR.
 * @param {Function(String)} harCallback the callback to call upon completion:
 *     #param {String} harContent HAR content.
 *     #param {Error} [e] exception, if any.
 */
function convertDevToolsToHar(
    devToolsMessages, pageId, browserName, browserVersion, harCallback) {
  'use strict';
  deleteHarTempFiles(function(e) {
    if (e) {
      harCallback('', e);
    } else {
      fs.writeFile(
          DEVTOOLS_EVENTS_FILE_, JSON.stringify(devToolsMessages), 'UTF-8',
          function(e) {
        if (e) {
          harCallback('', e);
        } else {
          devtools2har.devToolsToHar(
              DEVTOOLS_EVENTS_FILE_, HAR_FILE_,
              pageId, browserName, browserVersion, function(e) {
            if (e) {
              deleteHarTempFiles(harCallback.bind(undefined, '', e));
            } else {
              fs.readFile(HAR_FILE_, 'UTF-8', function(e, data) {
                if (e) {
                  logger.error('Error reading results.har: %s', e);
                  deleteHarTempFiles(harCallback.bind(undefined, data, e));
                } else {
                  deleteHarTempFiles(harCallback.bind(undefined, data));
                }
              });
            }
          });
        }
      });
    }
  });
}

/**
 * Used as an errback for when we want to drop the error without logging.
 *
 * The underlying action has already logged the error, we only want to
 * prevent it from propagating up the promise manager stack.
 */
function swallowError() {
  'use strict';
}

function Agent(client, flags) {
  'use strict';

  this.client_ = client;
  this.flags_ = flags;
  this.app_ = webdriver.promise.Application.getInstance();
  process_utils.injectWdAppLogging('main app', this.app_);
  this.wdServer_ = undefined;  // The wd_server child process.

  this.client_.onStartJobRun = this.startJobRun_.bind(this);
  this.client_.onJobTimeout = this.jobTimeout_.bind(this);
}
exports.Agent = Agent;

/**
 * Runs jobs that it receives from the client.
 */
Agent.prototype.run = function() {
  'use strict';
  this.client_.run(/*forever=*/true);
};

Agent.prototype.scheduleNoFault_ = function(description, f) {
  'use strict';
  return process_utils.scheduleNoFault(this.app_, description, f);
};

/** flusIpfw runs the flush script used when setting or resetting ipfw */
Agent.prototype.scheduleIpfwReset_ = function() {
  'use strict';
  return process_utils.scheduleExec(
      system_commands.get('run', [IPFW_FLUSH_FILE_])).addErrback(swallowError);
};

/**
 * Starts traffic shaping.
 *
 * @param {Number} bwIn input bandwidth throttling.
 * @param {Number} bwOut output bandwidth throttling.
 * @param {Number} latency induces fixed round trip latency.
 */
Agent.prototype.scheduleIpfwStart_ = function(bwIn, bwOut, latency) {
  'use strict';
  logger.info('Starting traffic shaping');
  var pipeInArgs = '';
  var pipeOutArgs = '';
  if (bwIn) {
    pipeInArgs += ' bw ' + bwIn + 'Kbit/s';
  }
  if (bwOut) {
    pipeOutArgs += ' bw ' + bwOut + 'Kbit/s';
  }

  if (latency) {
    var latencyIn = Math.floor(latency / 2);
    // if the latency is odd, add 1 to latencyOut to ensure they sum to latency.
    var latencyOut = (0 === latency % 2) ? latencyIn : latencyIn + 1;
    pipeInArgs += ' delay ' + latencyIn  + 'ms';
    pipeOutArgs += ' delay ' + latencyOut  + 'ms';
  }

  this.scheduleIpfwReset_();
  if (pipeInArgs) {
    var pipeInCommand = 'ipfw pipe 1 config ' + pipeInArgs;
    process_utils.scheduleExec(pipeInCommand).addErrback(swallowError);
  }
  if (pipeInArgs) {
    var pipeOutCommand = 'ipfw pipe 2 config ' + pipeOutArgs;
    process_utils.scheduleExec(pipeOutCommand).addErrback(swallowError);
  }
};

Agent.prototype.startWdServer_ = function() {
  'use strict';
  this.wdServer_ = child_process.fork('./src/wd_server.js',
      [], {env: process.env});
  this.wdServer_.on('exit', function() {
    this.wdServer_ = undefined;
  }.bind(this));
};

Agent.prototype.scheduleProcessDone_ = function(ipcMsg, job) {
  'use strict';
  var done = new webdriver.promise.Deferred();
  var zip = new Zip();
  if (ipcMsg.devToolsTimelineMessages) {
    var timelineJson = JSON.stringify(ipcMsg.devToolsTimelineMessages);
    zip.file(job.runNumber + '_timeline.json', timelineJson);
  }
  if (ipcMsg.screenshots && ipcMsg.screenshots.length > 0) {
    var imageDescriptors = [];
    ipcMsg.screenshots.forEach(function(screenshot) {
      logger.debug('Adding screenshot %s', screenshot.fileName);
      var contentBuffer = new Buffer(screenshot.base64, 'base64');
      job.resultFiles.push(new wpt_client.ResultFile(
          wpt_client.ResultFile.ResultType.IMAGE,
          screenshot.fileName,
          screenshot.contentType,
          contentBuffer));
      if (screenshot.description) {
        imageDescriptors.push({
            filename: screenshot.fileName,
            description: screenshot.description
        });
      }
      if (logger.isLogging('debug')) {
        logger.debug('Writing a local copy of %s (%s)',
            screenshot.fileName, screenshot.description);
        // Don't pass a callback, we don't care when it finishes or fails.
        fs.writeFile(screenshot.fileName, contentBuffer);
      }
    });
    if (imageDescriptors.length > 0) {
      zip.file(
          job.runNumber + '_images.json', JSON.stringify(imageDescriptors));
    }
  }
  if (Object.keys(zip.files).length > 0) {
    job.resultFiles.push(new wpt_client.ResultFile(
        wpt_client.ResultFile.ResultType.TIMELINE,
        job.runNumber + '_results.zip',
        'application/zip',
        new Buffer(zip.generate({compression:'DEFLATE'}), 'base64')));
  }
  if (ipcMsg.devToolsMessages) {
    convertDevToolsToHar(
        ipcMsg.devToolsMessages,
        'page_' + job.runNumber + '_0',
        job.task.browser,
        /*browserVersion=*/undefined,
        function(harContent, e) {
      if (e) {
        done.reject(e);
      } else if (harContent) {
        job.resultFiles.push(new wpt_client.ResultFile(
            wpt_client.ResultFile.ResultType.HAR,
            job.runNumber + '_results.har',
            'application/json',
            harContent));
        done.resolve(job);
      } else {
        logger.error('HAR content empty even though devtools2har succeeded');
        done.resolve();
      }
    });
  } else {
    done.resolve();
  }
  this.scheduleNoFault_('Process job results', function() {
    return done.promise;
  });
};

/**
 * Performs one run of a job in a wd_server module that runs as a child process.
 *
 * Must call job.runFinished() no matter how the run ended.
 *
 * @param {Job} job the job to run.
 */
Agent.prototype.startJobRun_ = function(job) {
  'use strict';
  logger.info('Running job: %s', job.id);
  if (job.task.script) {
    this.scheduleIpfwStart_(
        job.task.bwIn, job.task.bwOut, job.task.latency);
    logger.info('Running script: %s', job.task.script);
    this.startWdServer_();
    // is setting up the message listener after the fork a race condition?
    // I don't see a way to set up the listener before wdServer_ inherits from
    // eventemitter though.
    this.wdServer_.on('message', function(ipcMsg) {
      logger.debug('got IPC: %s', ipcMsg.cmd);
      if ('done' === ipcMsg.cmd || 'error' === ipcMsg.cmd) {
        if ('error' === ipcMsg.cmd) {
          job.error = ipcMsg.e;
        }
        this.scheduleProcessDone_(ipcMsg, job);
        this.scheduleCleanup_();
        // Do this only at the very end, as it starts a new run of the job.
        this.scheduleNoFault_('Job finished', job.runFinished.bind(job));
      }
    }.bind(this));
    this.wdServer_.send({
      cmd: 'run',
      options: {browserName: job.task.browser},
      runNumber: job.runNumber,
      captureVideo: job.captureVideo,
      script: job.task.script,
      seleniumJar: this.flags_.selenium_jar,
      chromedriver: this.flags_.chromedriver,
      chrome: this.flags_.chrome,
      javaCommand: this.flags_.java
    });
  } else {
    job.error = 'NodeJS agent currently only supports tasks with a script';
    this.scheduleNoFault_('Job finished', job.runFinished.bind(job));
  }
};

Agent.prototype.jobTimeout_ = function(job) {
  'use strict';
  // Immediately kill wd_server
  if (this.wdServer_) {
    try {
      this.wdServer_.kill();
    } catch (e) {
      logger.error('wd_server kill failed: %s', e);
    }
    this.wdServer_ = undefined;
  }
  this.scheduleCleanup_();
  this.scheduleNoFault_('Timed out job finished', job.runFinished.bind(job));
};

/**
 * cleanupJob will try to kill the webdriver server if it has been started and
 * will call killDanglingProcesses to kill anything left over from a job.
 * The callback is a wpt_client callback, for the wpt_client.Client to continue
 * working after we process the timeout.
 */
Agent.prototype.scheduleCleanup_ = function() {
  'use strict';
  if (this.wdServer_) {
    process_utils.scheduleExitWaitOrKill(this.wdServer_, 'wd_server',
            WD_SERVER_EXIT_TIMEOUT).addBoth(function() {
      this.wdServer_ = undefined;
    }.bind(this));
  }
  this.scheduleNoFault_('Child process cleanup', function() {
    var danglingDone = new webdriver.promise.Deferred();
    logger.info('Cleaning up child processes');
    process_utils.killDanglingProcesses(function() {
      danglingDone.resolve();
    });
    return danglingDone.promise;
  });
  this.scheduleIpfwReset_();
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
  if (flags.devtools2har_jar) {
    devtools2har.setDevToolsToHarJar(flags.devtools2har_jar);
  } else {
    throw new Error('Flag --devtools2har_jar is required');
  }
  if (!flags.selenium_jar && !flags.chromedriver) {
    throw new Error('Either --selenium_jar or --chromedriver is required');
  }
  var client = new wpt_client.Client(flags.wpt_server, flags.location,
      flags.api_key, flags.job_timeout);
  var agent = new Agent(client, flags);
  agent.run();
};

if (require.main === module) {
  exports.main(nopt(flagDefs.knownOpts, flagDefs.shortHands, process.argv, 2));
}
