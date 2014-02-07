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

var logger = require('logger');
var process_utils = require('process_utils');
var util = require('util');

/** Default adb command timeout. */
exports.DEFAULT_TIMEOUT = 60000;

var STORAGE_PATHS_ = ['$EXTERNAL_STORAGE',
    '$SECONDARY_STORAGE',
    '/data/local/tmp'
];

/**
 * Creates an adb runner for a given device serial.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler app.
 * @param {string} serial the device serial.
 * @param {string=} adbCommand the adb command, defaults to 'adb'.
 * @constructor
 */
function Adb(app, serial, adbCommand) {
  'use strict';
  this.app_ = app;
  this.adbCommand = adbCommand || process.env.ANDROID_ADB || 'adb';
  this.serial = serial;
  this.isUserDebug_ = undefined;
  this.storagePath_ = undefined;
}
/** Public class. */
exports.Adb = Adb;

/**
 * Schedules an adb command, resolves with its stdout.
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 * @private
 */
Adb.prototype.command_ = function(args, options, timeout) {
  'use strict';
  return process_utils.scheduleExec(this.app_,
      this.adbCommand, args,
      options,
      timeout || exports.DEFAULT_TIMEOUT);
};

/**
 * Schedules an adb command on the device, resolves with its stdout.
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 */
Adb.prototype.adb = function(args, options, timeout) {
  'use strict';
  return this.command_(['-s', this.serial].concat(args), options, timeout);
};

/**
 * Schedules an adb shell command on the device, resolves with its stdout.
 *
 * The caller should trim/split the returned stdout to remove any trailing '\r's
 * or newlines.  For example, `adb shell echo foo | cat -v` returns "foo^M".
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 */
Adb.prototype.shell = function(args, options, timeout) {
  'use strict';
  return this.adb(['shell'].concat(args), options, timeout);
};

/**
 * Formats "su -c" arguments to match the device-specific shell.
 *
 * The basic formats are:
 *     COMMAND                SuperSu                 userdebug
 *     su -c 'echo x'         x                       su: exec failed...
 *     su 0 sh -c 'echo x'    sh: sh: No such...      x
 * The extra "sh -c" is required for userdebug shell built-ins commands, e.g.:
 *     su 0 echo x            sh: echo: No such..     su: exec failed...
 *     su 0 ls data           sh: ls: No such...      app, ...
 * For completeness, the other interesting cases are:
 *     su -c echo x           Unknown id: x           su: exec failed...
 *     su -c 'ls data'        app, ...                su: exec failed...
 *     su -c ls data          Unknown id: data        app, ...
 *     su 0 sh -c 'ls data'   sh: sh: No such...      app, ...
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Array} shellArgs).
 */
Adb.prototype.formatSuArgs = function(args) {
  'use strict';
  return this.app_.schedule('Check su', function() {
    if (undefined === this.isUserDebug_) {
      // Test an arbitrary command, e.g. 'echo x' or 'date +%s'
      this.shell(['su', '-c', 'echo x']).then(function(stdout) {
        if ('x' === stdout.trim()) {
          this.isUserDebug_ = false;
        } else if (/^su: exec failed/.test(stdout)) {
          this.isUserDebug_ = true;
        } else {
          throw new Error('Unexpected \'su\' output: ' + stdout);
        }
      }.bind(this));
    }
    return this.app_.schedule('Format su', function() {
      return (this.isUserDebug_ ?
          ['su', '0', 'sh', '-c', args.join(' ')] :
          ['su', '-c', args.join(' ')]);
    }.bind(this));
  }.bind(this));
};

/**
 * Schedules an "adb shell su -c" command, resolves with its stdout.
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 */
Adb.prototype.su = function(args, options, timeout) {
  'use strict';
  return this.formatSuArgs(args).then(function(shellArgs) {
    return this.shell(shellArgs, options, timeout);
  }.bind(this));
};

/**
 * Spawns a background process.
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Process} proc).
 * @private
 */
Adb.prototype.spawn_ = function(args) {
  'use strict';
  return process_utils.scheduleSpawn(this.app_, this.adbCommand, args);
};

/**
 * Spawns a background "adb" process.
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Process} proc).
 */
Adb.prototype.spawnAdb = function(args) {
  'use strict';
  return this.spawn_(['-s', this.serial].concat(args));
};

/**
 * Spawns a background "adb shell" process.
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Process} proc).
 */
Adb.prototype.spawnShell = function(args) {
  'use strict';
  return this.spawnAdb(['shell'].concat(args));
};

/**
 * Spawns a background "adb shell su" command.
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Process} proc).
 */
Adb.prototype.spawnSu = function(args) {
  'use strict';
  return this.formatSuArgs(args).then(function(shellArgs) {
    return this.spawnShell(shellArgs);
  }.bind(this));
};

/**
 * Schedules a check if a given path (including wildcards) exists on device.
 *
 * @param {string} path  the path to check.
 * @return {webdriver.promise.Promise}  Resolves to true if exists, or false.
 */
Adb.prototype.exists = function(path) {
  'use strict';
  return this.shell(['ls', path, '>', '/dev/null', '2>&1', ';', 'echo', '$?'])
      .then(function(stdout) {
    return stdout.trim() === '0';
  }.bind(this));
};

/**
 * Gets the device's writable storage path.
 *
 * @return {webdriver.promise.Promise} resolve(String path).
 */
Adb.prototype.getStoragePath = function() {
  'use strict';
  var tryRemainingPaths = (function(pathsToTry) {  // Modifies pathsToTry
    return this.app_.schedule('getStoragePath', function() {
      if (this.storagePath_) {
        return this.storagePath_;
      }
      var path = pathsToTry.shift();
      if (!path) {
        throw new Error('Unable to find storage path');
      }
      return this.shell(['[[ -w "' + path + '" ]] && (' +
          'touch "' + path + '/adb_test" && rm "' + path + '/adb_test"' +
          ') &>/dev/null && echo "' + path + '"']).then(
          function(stdout) {
        var resolvedPath = stdout.trim(); // remove newline.
        if (!resolvedPath) {
          return tryRemainingPaths(pathsToTry);
        }
        logger.debug('Found storage path %s --> %s', path, resolvedPath);
        // Return the resolved path (e.g. '/sdcard' not '$EXTERNAL_STORAGE'),
        // so the caller can `adb push/pull` files to the absolute path.
        this.storagePath_ = resolvedPath;
        return resolvedPath;
      }.bind(this));
    }.bind(this));
  }.bind(this));
  return tryRemainingPaths(STORAGE_PATHS_.slice());
};

/**
 * Schedules a promise resolved with pid's of process(es) with a given name.
 *
 * So far only supports non-package binary names, e.g. 'tcpdump'.
 *
 * @param {string} name  the process name to check.
 * @return {webdriver.promise.Promise} Resolves to Array of pid's as strings.
 */
Adb.prototype.getPidsOfProcess = function(name) {
  'use strict';
  return this.shell(['ps', name]).then(function(stdout) {
    var pids = [];
    var lines = stdout.split(/[\r\n]+/);
    if (lines.length === 0 || lines[0].indexOf('USER ') !== 0) {  // Heading.
      throw new Error(util.format('ps command failed, output: %j', stdout));
    }
    lines.forEach(function(line, iLine) {
      if (line.length === 0) {
        return;  // Skip empty lines (last line in particular).
      }
      var fields = line.split(/\s+/);
      if (iLine === 0) {  // Skip the header
        return;
      }
      if (fields.length !== 9) {
        throw new Error(util.format('Failed to parse ps output line %d: %j',
            iLine, stdout));
      }
      pids.push(fields[1]);
    }.bind(this));
    return pids;
  }.bind(this));
};

/**
 * Kills any running processes with a given name, using a given signal.
 *
 * Requires root.
 *
 * @param {string} processName  the process name to kill.
 * @param {string} signal  the signal name for the kill, 'INT' by default.
 */
Adb.prototype.scheduleKill = function(processName, signal) {
  'use strict';
  this.getPidsOfProcess(processName).then(function(pids) {
    pids.forEach(function(pid) {
      this.su(['kill', '-' + (signal || 'SIGINT'), pid]);
    }.bind(this));
  }.bind(this));
};

/**
 * Schedules a promise resolved with matching process names.
 *
 * More precisely, matches ps output lines starting with the process name.
 *
 * @param {string} nameRegex  the regular expression to match for.
 * @return {webdriver.promise.Promise} Resolves to Array of strings.
 */
Adb.prototype.getMatchingProcessNames = function(nameRegex) {
  'use strict';
  return this.shell(['ps']).then(function(stdout) {
    var processNames = [];
    var lines = stdout.split(/\r?\n/);
    if (lines.length === 0 || lines[0].indexOf('USER ') !== 0) {  // Heading.
      throw new Error(util.format('ps command failed, output: %j', stdout));
    }
    lines.forEach(function(line) {
      // Extract the 9th element of the ps output line, if it has no spaces.
      var match = line.match(/(?:\s*\S+\s+){8}(\S+)$/);
      if (match && nameRegex.test(match[1])) {
        processNames.push(match[1]);
      }
    }.bind(this));
    return processNames;
  }.bind(this));
};

/**
 * Runs adb force-stop for all running packages mathcing the given regex.
 *
 * @param {string} nameRegex
 */
Adb.prototype.scheduleForceStopMatchingPackages = function(nameRegex) {
  'use strict';
  this.getMatchingProcessNames(nameRegex).then(function(packageNames) {
    packageNames.forEach(function(packageName) {
      this.shell(['am', 'force-stop', packageName.trim()]);
    }.bind(this));
  }.bind(this));
};

/**
 * Returns the name of the single currently connected interface, or undefined.
 *
 * Output format:
 * Up to Honeycomb:
 *
 * usb0 UP 192.168.1.67 255.255.255.192 0x00001043
 *
 * IceCreamSandwich+:
 *
 * usb0 UP 192.168.1.68/28 0x00001002 02:00:00:00:00:01
 *
 * @return {webdriver.promise.Promise} Resolves to the interface name.
 */
Adb.prototype.scheduleDetectConnectedInterface = function() {
  'use strict';
  return this.shell(['netcfg']).then(function(stdout) {
    var connectedInterfaces = [];
    stdout.split(/[\r\n]+/).forEach(function(line, lineNumber) {
      if (!line) {
        return;  // Skip empty lines.
      }
      var fields = line.split(/\s+/);
      if (fields.length !== 5) {
        throw new Error(util.format('netcfg output unrecognized at line %d: %j',
            lineNumber, stdout));
      }
      if (fields[0] !== 'lo' && fields[1] === 'UP' &&
          0 !== fields[2].indexOf('0.0.0.0')) {
        connectedInterfaces.push(fields[0]);
      }
    }.bind(this));
    if (connectedInterfaces.length !== 1) {
      throw new Error(util.format(
          '%s connected interfaces detected: %j, netcfg output: %j',
          (connectedInterfaces.length === 0 ? 'Zero' : 'More than one'),
          connectedInterfaces, stdout));
    }
    return connectedInterfaces[0];
  }.bind(this));
};
