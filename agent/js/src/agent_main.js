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
var fs = require('fs');
var nopt = require('nopt');
var devtools2har = require('devtools2har');
var system_commands = require('system_commands');
var logger = require('logger');
var webdriver = require('webdriver');
var wd_utils = require('wd_utils.js');
var wpt_client = require('./wpt_client');

var flagDefs = {
  knownOpts: {
    wpt_server: [String, null],
    location: [String, null],
    java: [String, null],
    selenium_jar: [String, null],
    chromedriver: [String, null],
    devtools2har_jar: [String, null],
    job_timeout: [Number, null],
    api_key: [String, null]
  },
  shortHands: {}
};

var HAR_FILE_ = './results.har';
var DEVTOOLS_EVENTS_FILE_ = './devtools_events.json';
var IPFW_FLUSH_FILE_ = './ipfw_flush.sh';

var javaCommand, selenium_jar, chromedriver;
exports.selenium_jar = selenium_jar;
exports.chromedriver = chromedriver;
var wdServer_;

exports.killCallPidCommands = [];
exports.killCallsCompleted = 0;


/**
 * Deletes temporary files used during a test
 */
function deleteHarTempFiles() {
  'use strict';
  var paths = [DEVTOOLS_EVENTS_FILE_, HAR_FILE_];
  for (var i in paths) {
    try {
      fs.unlinkSync(paths[i]);
    } catch (e) {
      // Ignore exception if the file does not exist
    }
  }
}

/**
 * Takes devtools messages and creates an appropriate file body that it passes
 * to harCallback
 *
 * @param {Object[]} devToolsMessages an array of the developer tools messages.
 * @param {Function(String)} harCallback will be called with a stringified
 *                                       version of devToolsMessages.
 */
function convertDevToolsToHar(devToolsMessages, harCallback) {
  'use strict';
  deleteHarTempFiles();
  fs.writeFileSync(
      DEVTOOLS_EVENTS_FILE_, JSON.stringify(devToolsMessages), 'UTF-8');
  devtools2har.devToolsToHar(DEVTOOLS_EVENTS_FILE_, HAR_FILE_, function() {
    try {
      var harContent = fs.readFileSync(HAR_FILE_, 'UTF-8');
    } catch (e) {
      logger.log('error', 'Error reading results.har');
      return;
    }
    deleteHarTempFiles();
    harCallback(harContent);
  });
}

/**
 * run listens for wpt_client to start a job. Once it receives the job message
 * it initializes the webdriver server and wait for it to be done or error out
 *
 * @param  {Object} client webpagetest client object.
 */
exports.run = function(client) {
  'use strict';
  client.on('job', function(job) {
    logger.log('alert', 'Running job: ' + job.id);
    if ('script' in job.task) {
      logger.log('info', 'Starting traffic shaping');
      startTrafficShaping(job.task.bwIn, job.task.bwOut, job.task.latency);
      logger.log('info', 'Running script: ' + job.task.script);
      wdServer_ = child_process.fork('./src/wd_server.js',
        [], {env: process.env});
      // is setting up the message listener after the fork a race condition?
      // I don't see a way to set up the listener before wdServer_ inherits from
      // eventemitter though.
      wdServer_.on('message', function(m) {
        if (m.cmd === 'done') {
          if (m.devToolsTimelineMessages) {
            var timelineResult = new wpt_client.ResultFile(
                wpt_client.ResultFile.ResultType.TIMELINE,
                job.id + '_timeline.json',
                'application/json',
                JSON.stringify(m.devToolsTimelineMessages));
            job.resultFiles.push(timelineResult);
          }
          if (m.devToolsMessages) {
            convertDevToolsToHar(m.devToolsMessages, function(harContent) {
              var harResult = new wpt_client.ResultFile(
                  wpt_client.ResultFile.ResultType.HAR,
                  'results.har',
                  'application/json',
                  harContent);
              job.resultFiles.push(harResult);
              job.done();
            });
          } else {
              job.done();
            }
        } else if (m.cmd === 'error') {
          job.error = m.e;
          job.done();
        } else if (m.cmd === 'exit') {
          exports.cleanupJob();
        }
      });
      wdServer_.send({
          cmd: 'init',
          options: {browserName: job.task.browser},
          script: job.task.script,
          selenium_jar: exports.selenium_jar,
          chromedriver: exports.chromedriver,
          javaCommand: javaCommand
      });
      wdServer_.send({cmd: 'connect'});
    }
  });

  client.on('timeout', function(job) {
    logger.log('critical', 'Stopping WD server for timed out job: ' + job.id);
    exports.cleanupJob();
  });
  client.run(/*forever=*/true);
};

/**
 * startTrafficShaping tell startIpfw to start traffic shaping if it can.
 *
 * @param {Number} bwIn input bandwidth throttling.
 * @param {Number} bwOut output bandwidth throttling.
 * @param {Number} latency induces fixed round trip latency.
 */
function startTrafficShaping(bwIn, bwOut, latency) {
  wd_utils.commandExists('ipfw', startIpfw, function() { });
}

/**
 * Actually makes the system calls to start traffic shaping.
 *
 * @param {Number} bwIn input bandwidth throttling.
 * @param {Number} bwOut output bandwidth throttling.
 * @param {Number} latency induces fixed round trip latency.
 */
function startIpfw(bwIn, bwOut, latency) {
  var latency1, latency2;
  if (typeof bwIn === 'undefined')
    bwIn = 0;
  if (typeof bwOut === 'undefined')
    bwOut = 0;
  if (typeof latency === 'undefined')
    latency1 = latency2 = 'noerror';
  else {
    latency1 = latency2 = Math.floor(latency / 2);
    // if the latency is odd, add 1 to latency 2
    if (latency % 2)
      latency2++;
  }
  var pipe1command = 'ipfw pipe 1 config bw ' + bwIn +
      'Kbit/s delay ' + bwOut + 'ms ' + latency1;
  var pipe2command = 'ipfw pipe 2 config bw ' + bwIn +
      'Kbit/s delay ' + bwOut + 'ms ' + latency2;

  var mainWdApp = webdriver.promise.Application.getInstance();
  mainWdApp.schedule('Start ipfw traffic shaping', function() {
    flushIpfw();
  }).then(function() {
    child_process.exec(pipe1command);
  }).then(function() {
    child_process.exec(pipe2command);
  });
}

/** flusIpfw runs the flush script used when setting or resetting ipfw */
function flushIpfw() {
  child_process.exec(system_commands.get('run', [IPFW_FLUSH_FILE_]));
}

/**
 * cleanupJob will try to kill the webdriver server if it has been started and
 * will call killDanglingProcesses to kill anything left over from a job
 */
exports.cleanupJob = function() {
  'use strict';
  logger.log('info', 'Cleaning up child processes');
  if (typeof wdServer_ != 'undefined')
    wdServer_.kill();
  wd_utils.commandExists('ipfw', flushIpfw, function() { });
  exports.killCallsCompleted = 0;
  exports.killCallPidCommands = [];
  exports.killDanglingProcesses();
};

/**
 * killDanglingProcesses will search for any processes of type selenium,
 * chromedriver, or wd_server and will call killChildTree on it to kill the
 * entire process tree before killing itself.
 */
exports.killDanglingProcesses = function() {
  'use strict';
  // Find PIDs of any *orphaned* Java WD server and chromedriver processes
  var command = system_commands.get('dangling pids');
  child_process.exec(command, function(error, stdout, stderr) {
    if (error && stderr !== '') {
      logger.log('error', stderr);
    } else {
      if (stdout === '')
        return;
      var pidCommands = stdout.trim().split('\n')
                                     .map(exports.pidCommandFromPsLine);
      for (var i in pidCommands) {
        if (pidCommands[i] !== '') {
          logger.log('warn', pidCommands[i].pid + ' is a dangling process');
          exports.killChildTree(pidCommands[i]);
        }
      }
    }
  });
};

/**
 * Hard-kills children of pid recursively and then pid itself.
 * First it traverses the process tree and builds a list of children
 * Then it goes through the tree and kills every process in it
 *
 * @param {string} pidCommand a single line of ps info terminal/console output.
 */
exports.killChildTree = function(pidCommand) {
  'use strict';
  exports.killCallPidCommands.unshift(pidCommand);
  var command = system_commands.get('find children', [pidCommand.pid]);
  child_process.exec(command, function(error, stdout, stderr) {
    exports.killCallsCompleted++;
    if (error && stderr !== '') {
      logger.log('error', stderr);
    } else {
      if (stdout !== '') {
        var pidCommands = stdout.trim().split('\n')
                                       .map(exports.pidCommandFromPsLine);
        for (var i in pidCommands) {
          exports.killChildTree(pidCommands[i]);
        }
      }
    }
    if (exports.killCallPidCommands.length === exports.killCallsCompleted)
      exports.killPids(exports.killCallPidCommands);
  });
};

/**
 * killPids will iterate through a list of pidCommands and kill the pid in each
 * one. The pidCommand object is that returned by pidCommandFromPsLine which
 * has properties pid and command
 *
 * @param  {Object[]} pidCommands an array of Objects representing the processes
 *                                that should be killed. Each Object should have
 *                                the properties pid and command.
 */
exports.killPids = function(pidCommands) {
  'use strict';
  for (var i in pidCommands) {
    logger.log('warn', 'Killing PID ' + pidCommands[i].pid + ' Command: ' +
          pidCommands[i].command);
    var command = system_commands.get('kill', [pidCommands[i].pid]);
    child_process.exec(command);
  }
};

/**
 * pidCommandFromPsLine takes a line of stdout from a ps call, parses it,
 * and creates an Object that has the properties pid and command
 *
 * @param  {String} psLine a line of stdout from a ps or tasklist call.
 *
 * @return {Object} an object with the parsed ps information that has the
 *                  properties pid and command.
 */
exports.pidCommandFromPsLine = function(psLine) {
  'use strict';
  var splitLine = psLine.trim().split(' ');
  return {pid: splitLine.shift(), command: splitLine.join(' ')};
};

/**
 * Node.js is a multiplatform framework, however because we are making native
 * system calls, it becomes platform dependent. To reduce dependencies
 * throughout the code, all native commands are set here and when a command is
 * called through system_commands.get, the correct command for the current
 * platform is returned
 */
exports.setSystemCommands = function() {
  system_commands.set('dangling pids',
    'ps -o pid,command --no-headers --ppid 1 | ' +
    "egrep 'chromedriver|selenium|wd_server'",
    'linux');
  system_commands.set('dangling pids',
    'jps -l | find "selenium"',
    'win32');

  system_commands.set('find children',
    'ps -o pid,command --no-headers --ppid $0',
    'linux');
  // windows doesn't need 'find children' because the taskkill /T killes
  // the entire process tree

  system_commands.set('kill', 'kill -9 $0', 'linux');
  system_commands.set('kill', 'taskkill /F /PID $0 /T', 'win32');

  system_commands.set('kill signal', 'SIGHUP', 'linux');
  // windows should send the default kill signal
  // system_commands.set('kill signal', '', 'win32');

  system_commands.set('run', './$0', 'linux');
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
  if (flags.java) {
    javaCommand = flags.java;
  }
  if (flags.selenium_jar) {
    exports.selenium_jar = flags.selenium_jar;
  } else {
    throw new Error('Flag --selenium_jar is required');
  }
  if (flags.chromedriver) {
    exports.chromedriver = flags.chromedriver;
  }
  if (flags.devtools2har_jar) {
    devtools2har.setDevToolsToHarJar(flags.devtools2har_jar);
  } else {
    throw new Error('Flag --devtools2har_jar is required');
  }
  var client = new wpt_client.Client(flags.wpt_server, flags.location,
    flags.api_key, flags.job_timeout);
  exports.run(client);
};

if (require.main === module) {
  exports.main(nopt(flagDefs.knownOpts, flagDefs.shortHands, process.argv, 2));
}
