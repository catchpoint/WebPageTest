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
var logger = require('logger');
var system_commands = require('system_commands');


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
    if (error && stderr) {  // An error with no stderr means we found nothing
      logger.error(
          'Command "%s" failed: %s, stderr: %s', command, error, stderr);
    } else {
      if (stdout !== '') {
        var processInfos =
            stdout.trim().split('\n').map(exports.processInfoFromPsLine);
        processInfos.forEach(function(processInfo) {
          logger.warn('Dangling process: %s command: %s',
              processInfo.pid, processInfo.command);
          exports.killChildTree(processInfo);
        });
      } else {
        logger.debug('No dangling processes found');
      }
    }
  });
};

/**
 * Hard-kills children of pid recursively and then pid itself.
 * First it traverses the process tree and builds a list of children
 * Then it goes through the tree and kills every process in it
 *
 * @param {Object} processInfo object with fields pid, command.
 */
exports.killChildTree = function(processInfo) {
  'use strict';
  var numCalls = 0;
  var traversedProcessInfos = [];
  function killChildTreeRecursive(processInfo) {
    logger.debug('killChildTreeRecursive: %j', processInfo);
    numCalls += 1;
    traversedProcessInfos.unshift(processInfo);
    var command = system_commands.get('find children', [processInfo.pid]);
    child_process.exec(command, function(error, stdout, stderr) {
      if (error && stderr !== '') {
        logger.error(
            'Command "%s" failed: %s, stderr: %s', command, error, stderr);
      } else {
        if (stdout !== '') {
          var processInfos =
              stdout.trim().split('\n').map(exports.processInfoFromPsLine);
          logger.debug('killChildTreeRecursive children: %j', processInfos);
          processInfos.forEach(function(processInfo) {
            killChildTreeRecursive(processInfo);
          });
        } else {
          logger.debug('Process %s has no children', processInfo.pid);
        }
      }
    });
  }

  killChildTreeRecursive(processInfo, [], 0);
  if (traversedProcessInfos.length === numCalls) {
    exports.killPids(traversedProcessInfos);
  } else {
    throw new Error(
        'Internal error: traversedProcessInfos.length (' +
        traversedProcessInfos.length + ') !== numCalls (' + numCalls + ')');
  }
};

/**
 * killPids will iterate through a list of processInfos and kill the pid in each
 * one. The processInfo object is that returned by processInfoFromPsLine which
 * has properties pid and command
 *
 * @param {Object[]} processInfos an array of process info's to be killed.
 */
exports.killPids = function(processInfos) {
  'use strict';
  processInfos.forEach(function(processInfo) {
    logger.warn(
        'Killing PID %s Command: %s', processInfo.pid, processInfo.command);
    var command = system_commands.get('kill', [processInfo.pid]);
    child_process.exec(command);
  });
};

/**
 * Parses the process list command output and returns process info objects.
 *
 * @param  {String} psLine a line of stdout from a ps or tasklist call.
 * @return {Object} an object with the parsed ps information that has the
 *                  properties pid, ppid, and command.
 */
exports.processInfoFromPsLine = function(psLine) {
  'use strict';
  var splitLine = psLine.trim().split(/\s+/);
  logger.info('processInfoFromPsLine splitLine=%j', splitLine);
  return {
      pid: splitLine.shift(),
      ppid: splitLine.shift(),
      command: splitLine.join(' ')
  };
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
  system_commands.set(
      'dangling pids',
      'ps ax -o pid,ppid,command ' +
      '| egrep "chromedriver|selenium|wd_server" ' +
      '| egrep -v "agent_main|egrep"',
      'unix');
  system_commands.set(
      'dangling pids',
      'tasklist | find "selenium"',
      'win32');

  system_commands.set(
      'find children',
      'ps -o pid,ppid,command | grep "^ *[0-9][0-9]* *$0 "',
      'unix');
  // Windows doesn't need 'find children' because "taskkill /T" kills
  // the entire process tree.

  system_commands.set('kill', 'kill -9 $0', 'unix');
  system_commands.set('kill', 'taskkill /F /PID $0 /T', 'win32');
};

