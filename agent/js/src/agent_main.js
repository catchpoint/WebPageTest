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
  this.runTempDir_ = 'runtmp/' + (runTempSuffix || '_wpt');
  this.wdServer_ = undefined;  // The wd_server child process.
  this.webPageReplay_ = new web_page_replay.WebPageReplay(this.app_,
      {flags: flags});

  // Create a single (separate) instance of the browser for checking status.
  this.browser_ = browser_base.createBrowser(this.app_,
      {flags: flags, task: {}});

  this.client_.onStartJobRun = this.startJobRun_.bind(this);
  this.client_.onAbortJob = this.abortJob_.bind(this);
  this.client_.onMakeReady =
      this.browser_.scheduleMakeReady.bind(this.browser_);
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
    if (ipcMsg.devToolsMessages) {
      job.zipResultFiles['devtools.json'] =
          JSON.stringify(ipcMsg.devToolsMessages);
    }
    if (ipcMsg.traceFile) {
      process_utils.scheduleFunctionNoFault(this.app_, 'Read trace file',
          fs.readFile, ipcMsg.traceFile).then(function(buffer) {
        job.zipResultFiles['trace.json'] = buffer.toString();
      });
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
      process_utils.scheduleFunction(this.app_, 'Read video file',
          fs.readFile, ipcMsg.videoFile).then(function(buffer) {
        var ext = path.extname(ipcMsg.videoFile);
        var mimeType = ('.mp4' === ext) ? 'video/mp4' : 'video/avi';
        job.resultFiles.push(new wpt_client.ResultFile(
            wpt_client.ResultFile.ResultType.IMAGE,
            'video' + ext, mimeType, buffer));
      }, function(e) {
        logger.error('Unable to read video file: ' + e.message);
        job.agentError = job.agentError || e.message;
      });
    }
    if (ipcMsg.pcapFile) {
      process_utils.scheduleFunction(this.app_, 'Read pcap file',
              fs.readFile, ipcMsg.pcapFile).then(function(buffer) {
        job.resultFiles.push(new wpt_client.ResultFile(
            wpt_client.ResultFile.ResultType.PCAP,
            '.cap', 'application/vnd.tcpdump.pcap', buffer));
      }, function(e) {
        logger.error('Unable to read pcap file: ' + e.message);
        job.agentError = job.agentError || e.message;
      });
      process_utils.scheduleFunctionNoFault(this.app_, 'Delete pcap file',
          fs.unlink, ipcMsg.pcapFile);
    }
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
    // Validate job
    var script = job.task.script;
    var url = job.task.url;
    var pac;
    try {
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

      if (job.isReplay && job.runNumber === 0) {
        this.stopTrafficShaper_();  // Don't shape the recording.
      } else if (job.runNumber === 1) {
        if (this.isTrafficShaping_(job)) {
          this.startTrafficShaper_(job);  // Start shaping.
        } else if (!job.isReplay) {
          this.stopTrafficShaper_();  // Force-stop the shaper.
        }
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
      if (!!pac) {
        task.pac = pac;
      }
      var message = {
          cmd: 'run',
          runNumber: job.runNumber,
          isCacheWarm: job.isCacheWarm,
          exitWhenDone: job.isFirstViewOnly || job.isCacheWarm,
          timeout: this.client_.jobTimeout,
          runTempDir: this.runTempDir_,
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
  this.scheduleMakeDirs_(this.runTempDir_);
  process_utils.scheduleFunction(this.app_, 'Tmp read',
      fs.readdir, this.runTempDir_).then(function(files) {
    files.forEach(function(fileName) {
      var filePath = path.join(this.runTempDir_, fileName);
      process_utils.scheduleFunctionNoFault(this.app_, 'Delete ' + filePath,
          fs.unlink, filePath);
    }.bind(this));
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
    this.wdServer_.removeAllListeners('message');
    this.wdServer_.send({cmd: 'abort'});
  }
  this.scheduleCleanup_(job, /*isEndOfJob=*/true);
  this.scheduleNoFault_('Abort job',
      job.runFinished.bind(job, /*isRunFinished=*/true));
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
    if (this.isTrafficShaping_(job)) {
      this.stopTrafficShaper_();
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
  this.scheduleCleanRunTempDir_();
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
      down_plr: job.task.plr && 0,
      up_bw: job.task.bwOut && (1000 * job.task.bwOut),
      up_delay: job.task.latency && job.task.latency - halfDelay,
      up_plr: job.task.plr && job.task.plr  // All loss on out.
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
