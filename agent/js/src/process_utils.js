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
var logger = require('logger');
var net = require('net');
var system_commands = require('system_commands');
var webdriver = require('webdriver');


/**
 * Represents a process, as parsed from ps command output.
 *
 * @param {string} psLine a line in the format: "<ppid> <pid> <command...>".
 *   See setSystemCommands for explanation why this specific order.
 * @constructor
 */
function ProcessInfo(psLine) {
  'use strict';
  var splitLine = psLine.trim().split(/\s+/);
  this.ppid = splitLine.shift();
  this.pid = splitLine.shift();
  this.command = splitLine.join(' ');
}
/** Allow test access. */
exports.ProcessInfo = ProcessInfo;

function newProcessInfo(psLine) {
  'use strict';
  return new exports.ProcessInfo(psLine);
}

/**
 * @param {Process} process the process to signal.
 * @param {string=} processName name for debugging.
 */
exports.signalKill = function(process, processName) {
  // TODO replace with scheduleKill w/ signal
  'use strict';
  logger.debug('Killing %s', processName);
  var killSignal;
  try {
    killSignal = system_commands.get('kill signal');
  } catch (e) {
    killSignal = undefined;
  }
  try {
    process.kill(killSignal);
  } catch (killException) {
    logger.error('%s kill failed: %s', processName, killException);
  }
};

/**
 * @param {ProcessInfo} processInfo from getProcessInfo_.
 * @param {Function} callback Function({Error=} err, {string=} stdout).
 */
exports.killProcess = function(processInfo, callback) {
  'use strict';
  logger.warn(
      'Killing PID %s Command: %s', processInfo.pid, processInfo.command);
  var command = system_commands.get('kill', [processInfo.pid]);
  child_process.exec(command, callback);
};

/**
 * Kills given processes.
 *
 * @param {ProcessInfo[]} processInfos an array of process info's to be killed.
 * @param {Function=} callback Function({Error=} err).
 */
exports.killProcesses = function(processInfos, callback) {
  'use strict';
  var queue = processInfos.slice();  // Copy, don't modify original.
  logger.debug('killProcesses: %j', queue);

  function processQueue() {
    var processInfo = queue.pop();
    if (processInfo) {
      exports.killProcess(processInfo, processQueue);
    } else {  // Done
      if (callback) {
        callback();
      }
    }
  }
  processQueue();
};

/**
 * Kill all processes with commands that match the given RegExp.
 *
 * @param {Object} regex command pattern, e.g. /^\S+capture\s.*12345/.
 * @param {Function=} callback Function({Error=} err).
 */
function killAll(regex, callback) {
  'use strict';
  logger.debug('killAll %s', regex);
  var command = system_commands.get('get all');

  var queue;
  function processQueue() {
    var processInfo;
    while (true) {
      processInfo = queue.pop();
      if (!processInfo || regex.test(processInfo.command)) {
        break;
      }
    }
    if (processInfo) {
      exports.killProcess(processInfo, processQueue);
    } else if (callback) {
      callback();
    }
  }
  child_process.exec(command, function(error, stdout) {
      queue = stdout.trim().split('\n').map(newProcessInfo);
      processQueue();
    });
}

/**
 * @param {webdriver.promise.Application=} app the scheduler.
 * @param {string=} description debug title.
 * @param {RegExp} regex command pattern.
 */
exports.scheduleKillAll = function(app, description, regex) {
  'use strict';
  exports.scheduleFunction(app, (description || 'killAll ' + regex),
      killAll, regex);
};

/**
 * @param {number} pid process id.
 * @param {Function=} callback Function({Error=} err, {ProcessInfo} p).
 * @private
 */
exports.getProcessInfo_ = function(pid, callback) {
  'use strict';
  var command = system_commands.get('get info', [pid]);
  child_process.exec(command, function(error, stdout, stderr) {
    var processInfo;
    if (error && '' !== stderr) {
      logger.error(
          'Command "%s" failed: %s, stderr: %s', command, error, stderr);
    } else if ('' !== stdout) {
      processInfo = newProcessInfo(stdout.trim().split('\n')[0]);
    } else {
      logger.debug('Process %s not found', pid);
    }
    if (callback) {
      callback(undefined, processInfo);
    }
  });
};

/**
 * @param {number} pid process id.
 * @param {Function=} callback Function({Error=} err).
 */
exports.kill = function(pid, callback) {
  'use strict';
  var stack = [];
  function processStack() {
    var processInfo = stack.pop();
    if (!processInfo) {
      // Stack is empty, we are done
      if (callback) {
        callback();
      }
      return;
    }
    try {
      // Find children
      var command = system_commands.get('find children', [processInfo.pid]);
      child_process.exec(command, function(error, stdout, stderr) {
        if (error && '' !== stderr) {
          logger.error(
              'Command "%s" failed: %s, stderr: %s', command, error, stderr);
        } else if ('' !== stdout) {
          var childProcessInfos = stdout.trim().split('\n').map(newProcessInfo);
          stack.push.apply(stack, childProcessInfos);  // Push all
        } else {
          logger.debug('Process %s has no children', processInfo.pid);
        }
        // Kill parent
        exports.killProcess(processInfo, processStack);
      });
    } catch (e) {
      // We get an Error on Windows because there is no 'find children',
      // see setSystemCommands(). Just keep going through the top ones.
      exports.killProcess(processInfo, processStack);
    }
  }
  exports.getProcessInfo_(pid, function(err, processInfo) {
    logger.warn('Killing process and all children of ' + pid + ' = ' +
        processInfo);
    if (processInfo) {
      stack.push(processInfo);
      processStack();
    } else {
      // No such process
      if (callback) {
        callback();
      }
    }
  });
};

/**
 * Kill a process and all child proceses (by PID).
 *
 * @param {webdriver.promise.Application=} app the app under which to schedule.
 * @param {string=} description debug title.
 * @param {Process} process the process to kill.
 */
exports.scheduleKill = function(app, description, process) {
  'use strict';
  var pid = process.pid;
  if (pid) {
    exports.scheduleFunction(app,
        (description || 'Kill ' + pid + ' and children'), exports.kill, pid);
  } else {
    app.schedule('Kill non-pid', process.kill); // Unit test?
  }
};

/**
 * Wait for process to exit.
 *
 * @param {Process} proc the process.
 * @param {string} name the process name for logging.
 * @param {number} timeout how many milliseconds to wait.
 * @return {webdriver.promise.Promise} resolve() if the process has already
 *   exited or exits before the timeout.
 */
exports.scheduleWait = function(proc, name, timeout) {
  'use strict';
  var exited = new webdriver.promise.Deferred();
  var exitTimerId;
  var onExit = function(/*code, signal*/) {
    global.clearTimeout(exitTimerId);
    exited.resolve();
  };
  exitTimerId = global.setTimeout(function() {
    proc.removeListener('exit', onExit);
    exited.reject();
  }, timeout);
  proc.on('exit', onExit);
  var app = webdriver.promise.Application.getInstance();
  return app.schedule('Wait for ' + name + ' exit', function() {
    return exited.promise;
  });
};

/**
 * @param {string} command e.g. 'x'.
 * @param {Array} args e.g. ['a', 'b c', 'd'].
 * @return {string} e.g. 'x a \'b c\' d'.
 */
function formatForMessage(command, args) {
  'use strict';
  var ret = [];
  var i;
  for (i = -1; i < args.length; i++) {
    var s = (i < 0 ? command : args[i]);
    s = (/^[-_a-zA-Z0-9\.\\\/:]+$/.test(s) ? s : '\'' + s + '\'');
    ret.push(s);
  }
  return ret.join(' ');
}

/**
 * Schedules a command execution, kills it after a timeout.
 *
 * @param {webdriver.promise.Application} app the app under which to schedule.
 * @param {string} command the command to run, as in process.spawn.
 * @param {Array=} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.  Use
 *   options.encoding === 'binary' for a binary stdout Buffer.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to 100000.
 * @return {webdriver.promise.Promise} resolve({string|Buffer} stdout) if the
 *   process exits within the timeout, with code zero, and signal 0,
 *   otherwise reject(Error) with the stderr/code/signal attached to the Error.
 */
exports.scheduleExec = function(app, command, args, options, timeout) {
  'use strict';
  app = app || webdriver.promise.Application.getInstance();
  timeout = timeout || 10000;
  var cmd = formatForMessage(command, args);
  return app.schedule(cmd, function() {
    logger.debug('Exec with timeout(%d): %s', timeout, cmd);

    // Create output buffers
    var stdout = '';
    var stderr = '';
    var binout = ((options && options.encoding === 'binary') && new Buffer(0));
    function newMsg(desc, code, signal) {
      function crop(s, n) {
        return (s.length <= n ? s : s.substring(0, n - 3) + '...');
      }
      var ret = [desc, code && 'code ' + code, signal && 'signal ' + signal,
          binout && 'binout[' + binout.length + '] ...',
          stdout && 'stdout[' + stdout.length + '] ' + crop(stdout, 80),
          stderr && 'stderr[' + stderr.length + '] ' + crop(stderr, 80)];
      return ret.filter(function(v) { return v; }).join(', ');
    }
    function newError(desc, code, signal) {
      var ret = new Error(newMsg(desc, code, signal));
      // Attach the stdout/stderr/etc to the Error
      ret.stdout = stdout;
      ret.stderr = stderr;
      ret.binout = binout;
      ret.code = code;
      ret.signal = signal;
      return ret;
    }

    // Spawn
    var done = new webdriver.promise.Deferred();
    var proc = child_process.spawn(command, args, options);

    // Start timer
    var timerId = global.setTimeout(function() {
      timerId = undefined;  // Reset it before the close listener gets called.
      try {
        proc.kill();
      } catch (e) {
        logger.error('Error killing %s: %s', cmd, e);
      }
      // The kill() call normally triggers the close listener, but we reject
      // the promise here instead of the close listener, because we don't really
      // know if and when it's going to be killed at OS level.
      // In the future we may want to restart the adb server here as a recovery
      // for wedged adb connections, or use a relay board for device recovery.
      var e = newError(cmd + ' timeout after ' + (timeout / 1000) + ' seconds');
      done.reject(e);
    }, timeout);

    // Listen for stdout/err
    proc.stdout.on('data', function(data) {
      if (binout) {
        // This "concat" doesn't seem to be a performance problem, but we could
        // easily replace it with an array of Buffers that we concat on demand.
        binout = Buffer.concat([binout, data]);
      } else {
        stdout += data;
      }
    });
    proc.stderr.on('data', function(data) {
      stderr += data;
    });

    // Listen for 'close' not 'exit', otherwise we might miss some output.
    proc.on('close', function(code, signal) {
      if (timerId) {
        // Our timer is still ticking, so we didn't timeout.
        global.clearTimeout(timerId);
        if (code || signal) {
          var e = newError(cmd + ' failed', code, signal);
          done.reject(e);
        } else {
          logger.debug(newMsg());
          // TODO webdriver's resolve only saves the first argument, so we can
          // only return the stdout.  For now our clients only need the stdout.
          done.resolve(binout || stdout);//, stderr, code, signal);
        }
      } else {
        // The timer has expired, which means that we're already killed our
        // process and rejected our promise.
        logger.debug('%s close on timeout kill', cmd);
      }
    });
    return done.promise;
  });
};

/**
 * Spawns a command, logs output.
 *
 * @param {webdriver.promise.Application} app the app under which to schedule.
 * @param {string} command the command to run, as in process.spawn.
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options spawn options, as in process.spawn.
 * @param {Function=} logStdoutFunc function to log stdout, or logger.info.
 * @param {Function=} logStderrFunc function to log stderr, or logger.error.
 * @return {webdriver.promise.Promise} resolve({Process} proc).
 */
exports.scheduleSpawn = function(app, command, args, options,
    logStdoutFunc, logStderrFunc) {
  'use strict';
  var cmd = formatForMessage(command, args);
  return app.schedule(cmd, function() {
    logger.info('Spawning: %s', cmd);
    var proc = child_process.spawn(command, args, options);
    proc.stdout.on('data', function(data) {
      (logStdoutFunc || logger.info)('%s STDOUT: %s', command, data);
    });
    proc.stderr.on('data', function(data) {
      (logStderrFunc || logger.error)('%s STDERR: %s', command, data);
    });
    return proc;
  });
};

/**
 * Adds "logger.extra" level logging to all process scheduler tasks.
 *
 * @param {string=} appName log message prefix.
 * @param {webdriver.promise.Application} app The app to inject logging into.
 */
function injectWdAppLogging(appName, app) {
  'use strict';
  if (!app.isLoggingInjected) {
    var realGetNextTask = app.getNextTask_;
    app.getNextTask_ = function() {
      var task = realGetNextTask.apply(app, arguments);
      if (task) {
        logger.extra('%s: %s', appName, task.getDescription());
      } else {
        logger.extra('%s: no next task', appName);
      }
      return task;
    };

    var realSchedule = app.schedule;
    app.schedule = function(description) {
      logger.extra('%s: %s', appName, description);
      return realSchedule.apply(app, arguments);
    };

    app.isLoggingInjected = true;
  }
}
/** Allow test access. */
exports.injectWdAppLogging = injectWdAppLogging;

/**
 * Schedules an action, catches and logs any exceptions instead of propagating.
 *
 * @param {webdriver.promise.Application} app the scheduler.
 * @param {string=} description debug title.
 * @param {Function} f Function to schedule.
 * @return {webdriver.promise.Promise} will log instead of reject(Error).
 */
exports.scheduleNoFault = function(app, description, f) {
  'use strict';
  return app.schedule(description, f).addErrback(function(e) {
    logger.error('Exception from "%s": %s', description, e);
    logger.debug('%s', e.stack);
  });
};

/**
 * Schedules a fs-style asynchronous completion function.
 *
 * The function must expect a callback as its last argument, and the
 * callback must accept an error as the first argument.
 *
 * Examples:
 *  fs.stat(path, callback) --> callback(err, stats)
 *  ==>
 *  scheduleFunction(app, 'x', fs.stat, path).then(function(stats) {...});
 *
 *  foo(a, b, callback) --> callback(err, c, d)
 *  ==>
 *  scheduleFunction(app, 'x', foo, a, b).then(
 *      function(c, d) {...}, function(err) {...});
 *
 * @param {webdriver.promise.Application=} app the scheduler.
 * @param {string=} description debug title.
 * @param {Function} f Function({Function} callback, {Function=} errback).
 * @param {string} var_args arguments.
 * @return {webdriver.promise.Promise} the scheduled promise.
 */
exports.scheduleFunction = function(app, description, f,
     var_args) { // jshint unused:false
  'use strict';
  app = app || webdriver.promise.Application.getInstance();
  var done = new webdriver.promise.Deferred();
  function cb() {
    var i;
    var err = arguments[0];
    if (err === undefined || err === null) {
      i = 1;
    } else if (err instanceof Error) {
      logger.debug('Errback for %s', description);
      done.reject(err);
      return;
    } else {
      // Annoying special case:
      //   fs.exists(path, callback) --> callback(bool)
      i = 0;
    }
    logger.debug('Callback for %s', description);
    var ok = Array.prototype.slice.apply(arguments).slice(i);
    done.resolve.apply(undefined, ok);
  }
  var args = Array.prototype.slice.apply(arguments).slice(3).concat([cb]);
  return app.schedule(description, function() {
    logger.debug('Calling %s', description);
    f.apply(undefined, args);
    return done.promise;
  });
};

/**
 * Find and reserve a randomly-selected port in the given port range.
 *
 * We randomly select two consecutive ports:
 *
 * 1) An even-numbered "port" that we'll return in our resolved promise.
 *    We briefly test-bind and unbind this port to make sure it's available.
 *
 * 2) An odd-numbered "lockPort" (=== port+1) which we bind and keep bound
 *    until the caller invokes our returned promise-resolved "release"
 *    function.  The lockPort ensures that another process doesn't
 *    test-bind/unbind and take our "port" from us, especially if the caller
 *    doesn't actually bind the returned port (e.g. they're only using the
 *    portId as a unique number, not a socket).
 *
 * Multiple NodeJS agents on the same host will use the same logic, so
 * they will correctly lock ports.  Other non-agent applications are only
 * compatible if they use the above logic.
 *
 * @param {webdriver.promise.Application=} app the scheduler.
 * @param {string=} description debug title.
 * @param {number=} minPort min port, defaults to 1k.
 * @param {number=} maxPort max port, defaults to 32k.
 * @return {webdriver.promise.Promise} resolve({Object}):
 *    #param {string} port
 *    #param {function} release must be called to release the port.
 */
exports.scheduleAllocatePort = function(app, description, minPort, maxPort) {
  'use strict';
  if (!minPort) {
    minPort = (1 << 10);
  }
  if (!maxPort) {
    maxPort = (1 << 15) - 1;
  }
  // We'll return an even port and use "port+1" as the "lock".
  if (minPort % 2) {
    minPort += 1;
  }
  if (maxPort % 2) {
    maxPort -= 1;
  }
  if (minPort > maxPort) {
    throw new Error('Invalid range');
  }
  var done = new webdriver.promise.Deferred();
  var remainingRetries = 10;
  function maybeRetry(e) {
    // e.code === 'EADDRINUSE' ?
    logger.debug('bind failed: ' + e);
    if (remainingRetries > 0) {
      remainingRetries -= 1;
      findPort();
    } else {
      done.reject(new Error('Unable to find a port'));
    }
  }
  function findPort() {
    // Try to bind a random "lock" port, which must be odd and >minPort
    var lockServer = net.createServer();
    var lockPort = Math.floor(minPort +
        Math.random() * (maxPort - minPort + 1));
    if (0 === (lockPort % 2)) {
      lockPort = (lockPort < maxPort ? lockPort + 1 : minPort + 1);
    }
    lockServer.on('error', maybeRetry);
    lockServer.listen(lockPort, function() {
      // Try to bind "lock-1"
      var retPort = lockPort - 1;
      var retServer = net.createServer();
      retServer.on('error', function(e) {
        lockServer.close();
        maybeRetry(e);
      });
      retServer.listen(retPort, function() {
        // Great, release the retPort for our caller's use, but keep the lock.
        // The caller can call "release()" as soon as they bind retPort, or
        // when they're done with retPort.
        retServer.close();
        logger.debug('Allocated port ' + retPort);
        done.resolve({port: retPort, release: function() {
          lockServer.close();
        }});
      });
    });
  }
  app.schedule((description || 'Allocate port'), findPort);
  return done.promise;
};

/**
 * Iterate over object properties recursively, depth first, pre-order.
 *
 * @param {Object} obj the object to iterate.
 * @param {Function} callback Function({string} key, {Object} obj) the callback
 *   to call on a property, where "key" is the property name and "obj" is the
 *   object that has the property.
 * @param {Array=} keyPath optional path to the current object.
 */
exports.forEachRecursive = function(obj, callback, keyPath) {
  'use strict';
  if ('object' === typeof obj) {
    if (!keyPath) {
      keyPath = [];
    }
    Object.keys(obj).forEach(function(key) {
      if (!callback(key, obj, keyPath)) {
        exports.forEachRecursive(obj[key], callback, keyPath.concat(key));
      }
    });
  }
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
      'get all',
      'ps -o ppid= -o pid= -o command=',
      'unix');

  system_commands.set(
      'get info',
      'ps -p $0 -o ppid= -o pid= -o command=',
      'unix');
  system_commands.set(
      'get info',
      'tasklist | find "$0"', // TODO
      'win32');

  system_commands.set(
      'find children',
      // Ordered ppid,pid for the same format as 'dangling pids' output.
      'ps -o ppid,pid,command | grep "^ *$0 "',
      'unix');
  // Windows doesn't need 'find children' because "taskkill /T" kills
  // the entire process tree.

  system_commands.set('kill', 'kill -9 $0', 'unix');
  system_commands.set('kill', 'taskkill /F /PID $0 /T', 'win32');

  system_commands.set('kill signal', 'SIGHUP', 'unix');
};
