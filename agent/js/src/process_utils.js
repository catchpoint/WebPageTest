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
var net = require('net');
var system_commands = require('system_commands');
var webdriver = require('selenium-webdriver');


/**
 * Represents a process, as parsed from ps command output.
 *
 * @param {string} psLine a line in the format: "<ppid> <pid> <command...>".
 *   See setSystemCommands for explanation why this specific order.
 * @constructor
 */
function ProcessInfo(psLine) {
  'use strict';
  if (!/^\s*\d+\s+\d+\s+\S.*$/.test(psLine)) {
    throw new Error('Expected "PPID PID CMD", not "' + psLine + '"');
  }
  var splitLine = psLine.trim().split(/\s+/);
  this.ppid = parseInt(splitLine.shift(), 10);
  this.pid = parseInt(splitLine.shift(), 10);
  this.command = splitLine.shift();
  this.args = splitLine;
}
/** Allow test access. */
exports.ProcessInfo = ProcessInfo;

/**
 * @param {Process} proc the process to signal.
 * @param {string=} processName name for debugging.
 */
exports.signalKill = function(proc, processName) {
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
    proc.kill(killSignal);
  } catch (killException) {
    logger.error('%s kill failed: %s', processName, killException);
  }
};

/**
 * Kills the given process.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {string} description debug title.
 * @param {(Process|ProcessInfo)} proc process to be killed.
 */
exports.scheduleKill = function(app, description, proc) {
  'use strict';
  app.schedule(description, function() {
    logger.debug('Killing %s: %s', proc.pid, formatForMessage(
        proc.command, proc.args));
    var cmd = system_commands.get('kill', [proc.pid]).split(/\s+/);
    exports.scheduleExec(app, cmd.shift(), cmd).addErrback(function() { });
  });
};

/**
 * Kills the given processes.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {string} description debug title.
 * @param {(Array.<Process>|Array.<ProcessInfo>)} procs processes to kill.
 */
exports.scheduleKillAll = function(app, description, procs) {
  'use strict';
  procs.forEach(function(proc) {
    exports.scheduleKill(app, 'kill', proc);
  });
};

/**
 * Gets info for all processes owned by this user.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @return {webdriver.promise.Promise} fulfill({Array.<ProcessInfo>}).
 */
exports.scheduleGetAll = function(app) {
  'use strict';
  // Only do this for platforms that support getuid (posix - i.e. not Windows)
  if (process.getuid) {
    var cmd = system_commands.get('get all', [process.getuid()]).split(/\s+/);
    return exports.scheduleExec(app, cmd.shift(), cmd).then(function(psOut) {
      psOut = psOut.trim();
      return (!psOut ? [] : psOut.split('\n').map(function(psLine) {
          return new exports.ProcessInfo(psLine);
        }));
    });
  } else {
    return app.schedule('Return empty user process list', function() {
      return [];
    });
  }
};

/**
 * Gets a process and all child processes (by PID).
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {string=} description debug title.
 * @param {number} rootPid process id.
 * @return {webdriver.promise.Promise} fulfill({Array.<ProcessInfo>}).
 */
exports.scheduleGetTree = function(app, description, rootPid) {
  'use strict';
  return exports.scheduleGetAll(app).then(function(processInfos) {
    function getProcessInfo(pid) {
      return processInfos.filter(
          function(pi) { return pi.pid === pid; });
    }
    function getChildPids(pid) {
      return processInfos.filter(
          function(pi) { return pi.ppid === pid; }).map(
          function(pi) { return pi.pid; });
    }
    var ret = [];
    var stack = [rootPid];
    while (stack.length > 0) {
      var pid = stack.pop();
      // Array of 0 or 1 elements -- ProcessInfo for pid.
      Array.prototype.push.apply(ret, getProcessInfo(pid));
      // Array of pid's children.
      Array.prototype.push.apply(stack, getChildPids(pid));
    }
    return ret;
  });
};

/**
 * Kills a process and all child processes.
 *
 * @param {webdriver.promise.ControlFlow} app the app under which to schedule.
 * @param {string=} description debug title.
 * @param {(Process|ProcessInfo)} proc the process to getTree then killAll.
 */
exports.scheduleKillTree = function(app, description, proc) {
  'use strict';
  try {
    exports.scheduleGetTree(app, 'getTree ' + description, proc.pid).then(
        function (processInfos) {
      exports.scheduleKillAll(app, 'killAll ' + description, processInfos);
    });
  } catch (e) {
  }
};

/**
 * Calls scheduleKillTree for each process in an array.
 *
 * @param {webdriver.promise.ControlFlow} app the app under which to schedule.
 * @param {string=} description debug title.
 * @param {(Array.<Process>|Array.<ProcessInfo>)} procs processes to
 *   killTree.
 */
exports.scheduleKillTrees = function(app, description, procs) {
  'use strict';
  procs.forEach(function(proc) {
    exports.scheduleKillTree(app, 'killTree', proc);
  });
};

/**
 * Wait for process to exit.
 *
 * @param {webdriver.promise.ControlFlow} app the app under which to schedule.
 * @param {Process} proc the process.
 * @param {string} name the process name for logging.
 * @param {number} timeout how many milliseconds to wait.
 * @return {webdriver.promise.Promise} fulfill() if the process has already
 *   exited or exits before the timeout.
 */
exports.scheduleWait = function(app, proc, name, timeout) {
  'use strict';
  var exited = new webdriver.promise.Deferred();
  var exitTimerId;
  var onExit = function(/*code, signal*/) {
    global.clearTimeout(exitTimerId);
    exited.fulfill();
  };
  exitTimerId = global.setTimeout(function() {
    proc.removeListener('exit', onExit);
    exited.reject();
  }, timeout);
  proc.on('exit', onExit);
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
  for (i = -1; i < (args ? args.length : 0); i++) {
    var s = (i < 0 ? command : args[i]);
    s = (/^[\-_a-zA-Z0-9\.\\\/:]+$/.test(s) ? s : '\'' + s + '\'');
    ret.push(s);
  }
  return ret.join(' ');
}

/**
 * Schedules a command execution, kills it after a timeout.
 *
 * @param {webdriver.promise.ControlFlow} app the app under which to schedule.
 * @param {string} command the command to run, as in process.spawn.
 * @param {Array=} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to 100000.
 * @return {webdriver.promise.Promise} fulfill({string} stdout) if the
 *   process exits within the timeout, with code zero, and signal 0,
 *   otherwise reject(Error) with the stderr/code/signal attached to the Error.
 */
exports.scheduleExec = function(app, command, args, options, timeout) {
  'use strict';
  timeout = timeout || 10000;
  var cmd = formatForMessage(command, args);
  return app.schedule(cmd, function() {
    logger.debug('Exec with timeout(%d): %s', timeout, cmd);

    // Create output buffers
    var stdout = '';
    var stderr = '';
    function newMsg(desc, code, signal) {
      function crop(s, n) {
        return (s.length <= n ? s : s.substring(0, n - 3) + '...');
      }
      var ret = [desc, code && 'code ' + code, signal && 'signal ' + signal,
          stdout && 'stdout[' + stdout.length + '] ' + crop(stdout, 1024),
          stderr && 'stderr[' + stderr.length + '] ' + crop(stderr, 1024)];
      // Comma-separated elements of ret, except the undefined ones.
      return ret.filter(function(v) { return !!v; }).join(', ');
    }
    function newError(desc, code, signal) {
      var ret = new Error(newMsg(desc, code, signal));
      // Attach the stdout/stderr/etc to the Error
      ret.stdout = stdout;
      ret.stderr = stderr;
      ret.code = code;
      ret.signal = signal;
      return ret;
    }

    // Spawn
    var proc = child_process.spawn(command, args, options);
    var done = new webdriver.promise.Deferred();

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
      done.reject(
          newError(cmd + ' timeout after ' + (timeout / 1000) + ' seconds'));
    }, timeout);

    // Listen for stdout/err
    proc.stdout.on('data', function(data) {
      stdout += data;
    });
    proc.stderr.on('data', function(data) {
      logger.debug('stderr: ' + data);
      stderr += data;
    });

    // Listen for 'close' not 'exit', otherwise we might miss some output.
    proc.on('close', function(code, signal, e) {
      if (timerId) {
        // Our timer is still ticking, so we didn't timeout.
        global.clearTimeout(timerId);
        if (e) {
          done.reject(e);
        } else if (code || signal) {
          done.reject(newError(cmd + ' failed', code, signal));
        } else {
          logger.debug(newMsg());
          // TODO webdriver's fulfill only saves the first argument, so we can
          // only return the stdout.  For now our clients only need the stdout.
          done.fulfill(stdout);//, stderr, code, signal);
        }
      } else {
        // The timer has expired, which means that we're already killed our
        // process and rejected our promise.
        logger.debug('%s close on timeout kill', cmd);
      }
    });
    // Somehow, I can't figure out how, if I don't set an 'error' handler on the
    // process, any spawn error throws an uncaught exception and never calls
    // the 'close' handler (or at least before it calls the 'close' handler),
    // which in turn preempts my civilized promise logic in the 'close' handler.
    proc.on('error', function(e) {
      logger.error('%s failed with exception: %s', cmd, e.message);
    });
    return done.promise;
  });
};

/**
 * Spawns a command, logs output.
 *
 * @param {webdriver.promise.ControlFlow} app the app under which to schedule.
 * @param {string} command the command to run, as in process.spawn.
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options spawn options, as in process.spawn.
 * @param {Function=} logStdoutFunc function to log stdout, or logger.info.
 * @param {Function=} logStderrFunc function to log stderr, or logger.error.
 * @return {webdriver.promise.Promise} fulfill({Process} proc).
 */
exports.scheduleSpawn = function(app, command, args, options,
    logStdoutFunc, logStderrFunc) {
  'use strict';
  var cmd = formatForMessage(command, args);
  return app.schedule(cmd, function() {
    logger.info('Spawning: %s', cmd);
    var proc = child_process.spawn(command, args, options);
    proc.stdout.on('data', function(data) {
      (logStdoutFunc || logger.debug)('%s STDOUT: %s', command, data);
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
 * @param {webdriver.promise.ControlFlow} app The app to inject logging into.
 */
function injectWdAppLogging(appName, app) {
  'use strict';
  if (!app.isLoggingInjected) {
    app.isLoggingInjected = true;

    // TODO(klm): Migrate all code to execute().
    // Monkey-patching the old schedule(desc,fn) API just for gradual migration.
    if (undefined === app.schedule) {
      app.schedule = function(description, fn) {
        return app.execute(fn, description);
      };
    }

    if (logger.isLogging('extra')) {
      var realGetNextTask = app.getNextTask_;
      app.getNextTask_ = function() {
        var task = realGetNextTask.apply(app, arguments);
        if (task) {
          logger.extra('(%s) %s', appName, task.getDescription());
        } else {
          logger.extra('(%s) no next task', appName);
        }
        return task;
      };

      var realExecute = app.execute;
      app.execute = function(fn, opt_description) {
        logger.extra('(%s) %s', logger.whoIsMyCaller(),
            opt_description || 'function ' + fn.name);
        return realExecute.apply(app, arguments);
      };

      var realSchedule = app.schedule;
      app.schedule = function(description) {
        logger.extra('(%s) %s', logger.whoIsMyCaller(), description);
        return realSchedule.apply(app, arguments);
      };
    }
  }
}
/** Allow test access. */
exports.injectWdAppLogging = injectWdAppLogging;

/**
 * Schedules an action, catches and logs any exceptions instead of propagating.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
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
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {string} description debug title.
 * @param {Function} f Function({Function} callback, {Function=} errback).
 * @param {string} var_args arguments.
 * @return {webdriver.promise.Promise} the scheduled promise.
 */
exports.scheduleFunction = function(app, description, f,
     var_args) { // jshint unused:false
  'use strict';
  var done = new webdriver.promise.Deferred();
  function cb(err) {
    var i;
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
    done.fulfill.apply(done, ok);
  }
  var args = Array.prototype.slice.apply(arguments).slice(3).concat([cb]);
  return app.schedule(description, function() {
    logger.debug('Calling %s', description);
    f.apply(undefined, args);
    return done.promise;
  });
};

/**
 * Calls scheduleFunction, catches and logs any exceptions instead of
 * propagating.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {string} description debug title.
 * @param {Function} f Function({Function} callback, {Function=} errback).
 * @param {string} var_args arguments.
 * @return {webdriver.promise.Promise} will log instead of reject(Error).
 */
exports.scheduleFunctionNoFault = function(app, description, f,
     var_args) { // jshint unused:false
  'use strict';
  return exports.scheduleFunction.apply(undefined, arguments).addErrback(
      function(e) {
    logger.debug('Ignoring Exception from "%s": %s', description, e);
    //logger.debug('%s', e.stack);
  });
};

/**
 * Find and reserve a randomly-selected port in the given port range.
 *
 * We randomly select two consecutive ports:
 *
 * 1) An even-numbered "port" that we'll return in our fulfilled promise.
 *    We briefly test-bind and unbind this port to make sure it's available.
 *
 * 2) An odd-numbered "lockPort" (=== port+1) which we bind and keep bound
 *    until the caller invokes our returned promise-fulfilled "release"
 *    function.  The lockPort ensures that another process doesn't
 *    test-bind/unbind and take our "port" from us, especially if the caller
 *    doesn't actually bind the returned port (e.g. they're only using the
 *    portId as a unique number, not a socket).
 *
 * Multiple NodeJS agents on the same host will use the same logic, so
 * they will correctly lock ports.  Other non-agent applications are only
 * compatible if they use the above logic.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {string} description debug title.
 * @param {number=} minPort min port, defaults to 1k.
 * @param {number=} maxPort max port, defaults to 32k.
 * @return {webdriver.promise.Promise} fulfill({Object}):
 *    #param {string} port
 *    #param {function} release must be called to release the port.
 */
exports.scheduleAllocatePort = function(app, description, minPort, maxPort) {
  'use strict';
  if (!minPort) {
    minPort = 1024;
  }
  if (!maxPort) {
    maxPort = 32767;
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
        done.fulfill({port: retPort, release: function() {
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
 * Concatenates a directory path with a file or relative path.
 *
 * @param {string} dir  the base directory. If undefined, path returned as is.
 * @param {string} path  the path under the directory.
 *   If undefined, dir returned as is.
 * @return {string} Concatenated path.
 */
exports.concatPath = function(dir, path) {
  'use strict';
  if (dir === undefined || (path && path[0] === '/')) {
    return path;
  }
  if (dir && dir[dir.length - 1] !== '/') {
    dir += '/';
  }
  return (path ? (dir ? (dir + path) : path) : dir);
};

/**
 * Opens a stream for writing.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {string} path file path.
 * @return {webdriver.promise.Promise} fulfill({fs.Stream} stream).
 */
exports.scheduleOpenStream = function(app, path) {
  'use strict';
  var stream = fs.createWriteStream(path, {encoding: 'utf8'});
  var done = new webdriver.promise.Deferred();
  stream.once('open', function() {
    done.fulfill(stream);
  });
  stream.on('error', function(e) {
    if (done.isPending()) {
      done.reject(new Error('Unable to open ' + path + ': ' + e));
    }
  });
  return done.promise;
};

/**
 * Closes a stream.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {fs.Stream} stream a stream.
 * @param {(string|Buffer)=} data tail data.
 * @return {webdriver.promise.Promise} fulfill() when flushed and closed.
 */
exports.scheduleCloseStream = function(app, stream, data) {
  'use strict';
  // Use an end callback instead of "stream.on('finish', ...)".  This is
  // equivalent and cleaner, but more significantly, for some unknown reason
  // we never get a 'finish' event on some hosts.
  return exports.scheduleFunction(app, 'Close stream', stream.end, data,
      /*encoding*/undefined);  // This ensures that arg[5] is our callback.
};

/** @see objectId */
var __next_obj_id = 1;

/**
 * Gets a unique object identifier, for debugging purposes.
 *
 * @param {Object} obj this function adds a '__obj_id' field.
 * @return {number} unique id.
 */
exports.getObjectId = function(obj) {
  'use strict';
  if (obj === null) {
    return null;
  }
  if (obj.__obj_id === null) {
    obj.__obj_id = __next_obj_id++;
  }
  return obj.__obj_id;
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
      'ps -u $0 -o ppid= -o pid= -o command=',
      'unix');
  system_commands.set(
      'get all',
      'tasklist', // TODO
      'win32');

  system_commands.set('kill', 'kill -9 $0', 'unix');
  system_commands.set('kill', 'taskkill /F /PID $0 /T', 'win32');

  system_commands.set('kill signal', 'SIGHUP', 'unix');
};
