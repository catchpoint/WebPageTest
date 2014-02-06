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
var fs = require('fs');
var logger = require('logger');
var nopt = require('nopt');
var path = require('path');
var process_utils = require('process_utils');
var system_commands = require('system_commands');
var traffic_shaper = require('traffic_shaper');
var webdriver = require('selenium-webdriver');
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
  if (!/^[a-z0-9]*$/i.test(runTempSuffix)) {
    throw new Error('--deviceSerial may contain only letters and digits');
  }
  this.runTempDir_ = 'runtmp' + (runTempSuffix ? '_' + runTempSuffix : '');
  this.wdServer_ = undefined;  // The wd_server child process.
  this.trafficShaper_ = new traffic_shaper.TrafficShaper(this.app_, flags);

  // Create a single (separate) instance of the browser for checking status.
  this.browser_ = browser_base.createBrowser(this.app_, flags);

  this.client_.onStartJobRun = this.startJobRun_.bind(this);
  this.client_.onAbortJob = this.abortJob_.bind(this);
  this.client_.onIsReady =
      this.browser_.scheduleIsAvailable.bind(this.browser_);
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
        process_utils.scheduleFunctionNoFault(this.app_,
            'Read ' + screenshot.diskPath,
            fs.readFile, screenshot.diskPath).then(function(buffer) {
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
        }.bind(this));
      }.bind(this));
      if (imageDescriptors.length > 0) {
        job.zipResultFiles['images.json'] = JSON.stringify(imageDescriptors);
      }
    }
    if (ipcMsg.videoFile) {
      process_utils.scheduleFunctionNoFault(this.app_, 'Read video file',
          fs.readFile, ipcMsg.videoFile).then(function(buffer) {
        var ext = path.extname(ipcMsg.videoFile);
        var mimeType = ('.mp4' === ext) ? 'video/mp4' : 'video/avi';
        job.resultFiles.push(new wpt_client.ResultFile(
            wpt_client.ResultFile.ResultType.IMAGE,
            'video' + ext, mimeType, buffer));
      }.bind(this));
    }
    if (ipcMsg.pcapFile) {
      process_utils.scheduleFunctionNoFault(this.app_, 'Read pcap file',
              fs.readFile, ipcMsg.pcapFile).then(function(buffer) {
        job.resultFiles.push(new wpt_client.ResultFile(
            wpt_client.ResultFile.ResultType.PCAP,
            '.cap', 'application/vnd.tcpdump.pcap', buffer));
      });
      process_utils.scheduleFunctionNoFault(this.app_, 'Delete pcap file',
          fs.unlink, ipcMsg.pcapFile);
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
  this.scheduleCleanRunTempDir_();
  if (!this.wdServer_) {
    this.trafficShaper_.scheduleStart(
        job.task.bwIn, job.task.bwOut, job.task.latency, job.task.plr);
    this.startWdServer_(job);
  }
  var script = job.task.script;
  var url = job.task.url;
  var pac;
  if (script && !/new\s+(\S+\.)?Builder\s*\(/.test(script)) {
    var urlAndPac = this.decodeUrlAndPacFromScript_(script);
    url = urlAndPac.url;
    pac = urlAndPac.pac;
    script = undefined;
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
        capturePackets: job.capturePackets,
        pngScreenShot: job.task.pngScreenShot,
        imageQuality: job.task.imageQuality,
        captureTimeline: job.task.timeline,
        timelineStackDepth: job.task.timelineStackDepth,
        script: script,
        url: url,
        pac: pac,
        timeout: this.client_.jobTimeout,
        runTempDir: this.runTempDir_
      };
    Object.getOwnPropertyNames(this.flags_).forEach(function(flagName) {
      if (!message[flagName]) {
        message[flagName] = this.flags_[flagName];
      }
    }.bind(this));
    this.wdServer_.send(message);
  }.bind(this));
};

/**
 * Makes sure the run temp dir exists and is empty, but ignores deletion errors.
 * Currently supports only flat files, no subdirectories.
 * @private
 */
Agent.prototype.scheduleCleanRunTempDir_ = function() {
  'use strict';
  process_utils.scheduleFunctionNoFault(this.app_, 'Tmp check',
      fs.exists, this.runTempDir_).then(function(exists) {
    if (exists) {
      process_utils.scheduleFunction(this.app_, 'Tmp read',
          fs.readdir, this.runTempDir_).then(function(files) {
        files.forEach(function(fileName) {
          var filePath = path.join(this.runTempDir_, fileName);
          process_utils.scheduleFunctionNoFault(this.app_, 'Delete ' + filePath,
              fs.unlink, filePath);
        }.bind(this));
      }.bind(this));
    } else {
      process_utils.scheduleFunction(this.app_, 'Tmp create',
          fs.mkdir, this.runTempDir_);
    }
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
  // Assign nulls to appease 'possibly uninitialized' warnings.
  var fromHost = null, toHost = null, proxy = null, url = null;
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
        lineNumber + ']: ' + line + '\n' +
        '--- support is limited to:\n' +
        'setDnsName H1 H2\\n [overrideHost H1 H3]\\n navigate H4');
  });
  if (!fromHost || !url) {
    throw new ScriptError('WPT script lacks ' +
        (fromHost ? 'navigate' : 'setDnsName'));
  }
  logger.debug('Script is a simple PAC from=%s to=%s url=%s',
      fromHost, proxy || toHost, url);
  return {url: url, pac: 'function FindProxyForURL(url, host) {\n' +
      '  if ("' + fromHost + '" === host) {\n' +
      '    return "PROXY ' + (proxy || toHost) + '";\n' +
      '  }\n' +
      '  return "DIRECT";\n}\n'};
};

/**
 * @param {Object} job the job to abort (e.g. due to timeout).
 * @private
 */
Agent.prototype.abortJob_ = function(job) {
  'use strict';
  if (this.wdServer_) {
    this.scheduleNoFault_('Remove message listener',
      this.wdServer_.removeAllListeners.bind(this.wdServer_, 'message'));
    this.scheduleNoFault_('Send IPC "abort"',
        this.wdServer_.send.bind(this.wdServer_, {cmd: 'abort'}));
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
    this.scheduleNoFault_('Remove message listener',
      this.wdServer_.removeAllListeners.bind(this.wdServer_, 'message'));
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
  this.trafficShaper_.scheduleStop();
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
    }.bind(this));
  }
  this.scheduleCleanRunTempDir_();
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
  var versionMatch = /^v(\d+)\.(\d+)(?:\.\d+)?$/.exec(process.version);
  if (!versionMatch) {
    throw new Error('Cannot parse NodeJS version: ' + process.version);
  }
  if (parseInt(versionMatch[1], 10) !== 0 ||
      parseInt(versionMatch[2], 10) < 8) {
    throw new Error('node version must be >=0.8, not ' + process.version);
  }
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
