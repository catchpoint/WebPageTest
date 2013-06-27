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

var child_process = require('child_process');
var fs = require('fs');
var logger = require('logger');
var nopt = require('nopt');
var process_utils = require('process_utils');
var system_commands = require('system_commands');
var traffic_shaper = require('traffic_shaper');
var webdriver = require('webdriver');
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
  location: [String, null],
  deviceAddr: [String, null],
  deviceSerial: [String, null],
  jobTimeout: [Number, null],
  apiKey: [String, null]
};

var WD_SERVER_EXIT_TIMEOUT = 5000;  // Wait for 5 seconds before force-killing

/**
 * @param {wpt_client.Client} client the WebPagetest client.
 * @param {Object} flags from knownOpts.
 * @constructor
 */
function Agent(client, flags) {
  'use strict';
  this.client_ = client;
  this.flags_ = flags;
  this.app_ = webdriver.promise.Application.getInstance();
  process_utils.injectWdAppLogging('main app', this.app_);
  this.wdServer_ = undefined;  // The wd_server child process.
  this.trafficShaper_ = new traffic_shaper.TrafficShaper(this.app_, flags);

  this.client_.onStartJobRun = this.startJobRun_.bind(this);
  this.client_.onJobTimeout = this.jobTimeout_.bind(this);
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

/**
 * Starts a child process with the wd_server module.
 *
 * @private
 */
Agent.prototype.startWdServer_ = function() {
  'use strict';
  this.wdServer_ = child_process.fork('./src/wd_server.js',
      [], {env: process.env});
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
  this.scheduleNoFault_('Process job results', function() {
    if (ipcMsg.devToolsMessages) {
      job.zipResultFiles['devtools.json'] =
          JSON.stringify(ipcMsg.devToolsMessages);
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
      });
      if (imageDescriptors.length > 0) {
        job.zipResultFiles['images.json'] = JSON.stringify(imageDescriptors);
      }
    }
    if (ipcMsg.videoFile) {
      process_utils.scheduleFunction(this.app_, 'Read video file',
          fs.readFile, ipcMsg.videoFile).then(function(buffer) {
        job.resultFiles.push(new wpt_client.ResultFile(
            wpt_client.ResultFile.ResultType.IMAGE,
            'video.avi', 'video/avi', buffer));
      }, function() { // ignore errors?
      });
      process_utils.scheduleFunction(this.app_, 'Delete video file',
          fs.unlink, ipcMsg.videoFile);
    }
  }.bind(this));
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
  job.isCacheWarm = !!this.wdServer_;
  logger.info('Running job %s run %d/%d cacheWarm=%s',
      job.id, job.runNumber, job.runs, job.isCacheWarm);
  if (!this.wdServer_) {
    this.trafficShaper_.scheduleStart(
        job.task.bwIn, job.task.bwOut, job.task.latency, job.task.plr);
    this.startWdServer_();
    this.wdServer_.on('message', function(ipcMsg) {
      logger.debug('got IPC: %s', ipcMsg.cmd);
      if ('done' === ipcMsg.cmd || 'error' === ipcMsg.cmd) {
        var isRunFinished = job.isFirstViewOnly || job.isCacheWarm;
        if ('error' === ipcMsg.cmd) {
          job.error = ipcMsg.e;
          // Error in a first-view run: can't do a repeat run.
          isRunFinished = true;
        }
        this.scheduleProcessDone_(ipcMsg, job);
        if (isRunFinished) {
          this.scheduleCleanup_();
        }
        // Do this only at the very end, as it starts a new run of the job.
        this.scheduleNoFault_('Job finished',
            job.runFinished.bind(job, isRunFinished));
      }
    }.bind(this));
  }
  var script = job.task.script;
  var url = job.task.url;
  var pac;
  if (script && !/new\s+(\S+\.)?Builder\s*\(/.test(script)) {
    var urlAndPac = this.decodeUrlAndPacFromScript_(script);
    url = urlAndPac.url;
    pac = urlAndPac.pac;
  }
  url = url.trim();
  if (!((/^https?:\/\//i).test(url))) {
    url = 'http://' + url;
  }
  this.scheduleNoFault_('Send IPC "run"', function() {
    var message = {
        cmd: 'run',
        options: {browserName: job.task.browser},
        runNumber: job.runNumber,
        exitWhenDone: job.isFirstViewOnly || job.isCacheWarm,
        captureVideo: job.captureVideo,
        script: script,
        url: url,
        pac: pac,
        timeout: this.client_.jobTimeout - 15000  // 15 seconds to stop+submit.
      };
    var key;
    for (key in this.flags_) {
      if (!message[key]) {
        message[key] = this.flags_[key];
      }
    }
    this.wdServer_.send(message);
  }.bind(this));
};

/**
 * @param {string} message the error message.
 * @constructor
 * @see decodeUrlAndPacFromScript_
 */
function ScriptError(message) {
  'use strict';
  this.message = message;
  this.stack = (new Error(message)).stack;
}
ScriptError.prototype = new Error();

/**
 * Extract the URL and PAC from a simple WPT script.
 *
 * We don't support general WPT scripts.  Instead, we only support the minimal
 * subset that's required to express a PAC proxy configuration script.
 * Here are a couple examples of supported scripts:
 *
 *    1)
 *    setDnsName foo.com bar.com
 *    navigate qux.com
 *
 *    2)
 *    setDnsName foo.com ignored.com
 *    overrideHost foo.com bar.com
 *    navigate qux.com
 *
 * Blank lines and lines starting with "//" are ignored.  Lines starting with
 * "if", "endif", and "addHeader" are also ignored for now, but this feature is
 * deprecated and these commands will be rejected in a future.  Any other input
 * will throw a ScriptError.
 *
 * @param {string} script e.g.:
 *   setDnsName fromHost toHost
 *   navigate url.
 * @return {Object} a URL and PAC object, e.g.:
 *   {url:'http://x.com', pac:'function Find...'}.
 * @private
 */
Agent.prototype.decodeUrlAndPacFromScript_ = function(script) {
  'use strict';
  var fromHost, toHost, proxy, url;
  script.split('\n').forEach(function(line, lineNumber) {
    line = line.trim();
    if (!line || 0 === line.indexOf('//')) {
      return;
    }
    if (line.match(/^(if|endif|addHeader)\s/i)) {
      return;
    }
    var m = line.match(/^setDnsName\s+(\S+)\s+(\S+)$/i);
    if (m && !fromHost && !url) {
      fromHost = m[1];
      toHost = m[2];
      return;
    }
    m = line.match(/^overrideHost\s+(\S+)\s+(\S+)$/i);
    if (m && fromHost && m[1] === fromHost && !proxy && !url) {
      proxy = m[2];
      return;
    }
    m = line.match(/^navigate\s+(\S+)$/i);
    if (m && fromHost && !url) {
      url = m[1];
      return;
    }
    throw new ScriptError('WPT script contains unsupported line[' +
        lineNumber + ']: ' + line);
  });
  if (!fromHost || !url) {
    throw new ScriptError('WPT script lacks ' +
        (fromHost ? 'navigate' : 'setDnsName'));
  }
  logger.debug('Script is a simple PAC from=%s to=%s url=%s',
      fromHost, (proxy ? proxy : toHost), url);
  return {url: url, pac: 'function FindProxyForURL(url, host) {\n' +
      '  if ("' + fromHost + '" === host) {\n' +
      '    return "PROXY ' + (proxy ? proxy : toHost) + '";\n' +
      '  }\n' +
      '  return "DIRECT";\n}\n'};
};

/**
 * @param {Object} job the timed-out job to abort.
 * @private
 */
Agent.prototype.jobTimeout_ = function(job) {
  'use strict';
  if (this.wdServer_) {
    this.scheduleNoFault_('Send IPC "abort"', function() {
      this.wdServer_.send({cmd: 'abort'});
    }.bind(this));
  }
  this.scheduleCleanup_();
  this.scheduleNoFault_('Timed out job finished',
      job.runFinished.bind(job, /*isRunFinished=*/true));
};

/**
 * Kill the wdServer and traffic shaper.
 *
 * @private
 */
Agent.prototype.scheduleCleanup_ = function() {
  'use strict';
  if (this.wdServer_) {
    process_utils.scheduleWait(this.wdServer_, 'wd_server',
          WD_SERVER_EXIT_TIMEOUT).then(function() {
      // This assumes a clean exit with no zombies
      this.wdServer = undefined;
    }.bind(this), function() {
      process_utils.scheduleKill(this.app_, 'Kill wd_server',
          this.wdServer_);
      this.app_.schedule('undef wd_server', function() {
        this.wdServer_ = undefined;
      }.bind(this));
    }.bind(this));
  }
  this.trafficShaper_.scheduleStop();
  // TODO kill dangling child processes
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
  if (!((/^v\d\.([^0]\d|[89])/).test(process.version))) {
    throw new Error('node version must be >0.8, not ' + process.version);
  }
  exports.setSystemCommands();
  delete flags.argv; // Remove nopt dup
  var client = new wpt_client.Client(flags);
  var agent = new Agent(client, flags);
  agent.run();
};

if (require.main === module) {
  try {
    exports.main(nopt(knownOpts, {}, process.argv, 2));
  } catch (e) {
    console.log(e);
    process.exit(-1);
  }
}
