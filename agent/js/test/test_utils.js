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

var assert = require('assert');
var child_process = require('child_process');
var events = require('events');
var http = require('http');
var logger = require('logger');
var net = require('net');
var should = require('should');
var Stream = require('stream');
var timers = require('timers');
var util = require('util');
var webdriver = require('selenium-webdriver');


/**
 * failTest asserts a failure with a description
 *
 * @param {string} desc is the error message that will be thrown.
 */
exports.failTest = function(desc) {
  'use strict';
  function throwError() {
    throw new Error(desc);
  }
  throwError.should.not.throwError();
};

/**
 * Generic timer function fake for use in fakeTimers.
 * @param {sinon.sandbox} sandbox
 * @param {string} method
 * @param {Array} args
 * @return {Object} a SinonJS stub.
 */
var fakeTimerFunction = function(sandbox, method, args) {
  'use strict';
  logger.extra('%s(%s)', method, Array.prototype.slice.apply(args));
  return sandbox.clock[method].apply(sandbox.clock, args);
};

// Timer functions to fake/unfake
var fakeTimerFunctions = [
  'setTimeout', 'clearTimeout', 'setInverval', 'clearInterval'
];

/**
 * Makes the sandbox use fake timers and replaces them in the 'timers' module.
 *
 * When a well sandboxed module like webdriver calls global timer functions,
 * they are resolved at module import time and cannot be faked out. We use
 * the fact that the default global timer functions invoke the corresponding
 * ones in the 'timers' module -- we substitute fakes into that module.
 * SinonJS (fake_timers) by itself does not do that.
 *
 * In MochaJS tests, call this function from beforeEach, and call unfakeTimers
 * from afterEach. Call sandbox.verifyAndRestore separately in afterEach.
 *
 * @param {!sinon.sandbox} sandbox a SinonJS sandbox used by the test.
 */
exports.fakeTimers = function(sandbox) {
  'use strict';
  if (sandbox.origTimerFunctions) {
    throw new Error('call unfakeTimers() before a repeat call to fakeTimers()');
  }
  logger.extra('Faking timer functions %j', fakeTimerFunctions);
  sandbox.origTimerFunctions = {};
  sandbox.useFakeTimers();
  fakeTimerFunctions.forEach(function(method) {
    sandbox.origTimerFunctions[method] = timers[method];
    timers[method] = function() {
      return fakeTimerFunction(sandbox, method, arguments);
    };
  });
  // For some reason the faked functions don't actually get called without this:
  timers.setInterval = function() {
    return fakeTimerFunction(sandbox, 'setInterval', arguments);
  };
};

/**
 * Restores functions in the 'timers' module and clears them in the sandbox.
 *
 * @param {!sinon.sandbox} sandbox a SinonJS sandbox used by the test.
 */
exports.unfakeTimers = function(sandbox) {
  'use strict';
  if (sandbox.origTimerFunctions) {
    logger.extra('Unfaking timer functions');
    fakeTimerFunctions.forEach(function(method) {
      timers[method] = sandbox.origTimerFunctions[method];
    });
    delete sandbox.origTimerFunctions;
    // The Sinon fake_timers add it, and it trips Mocha global leak detection.
    delete global.timeouts;
  }
};

/**
 * Ticks the fake timer until the app is IDLE.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {!sinon.sandbox} sandbox a SinonJS sandbox used by the test.
 * @param {number=} maxSteps maximum number of steps to advance until we
 *   throw an error, defaults to 100 steps.
 * @param {number=} ticksPerStep number of ticks to advance per step,
 *   defaults to {webdriver.promise.ControlFlow.EVENT_LOOP_FREQUENCY} ticks.
 */
exports.tickUntilIdle = function(app, sandbox, maxSteps, ticksPerStep) {
  'use strict';
  if ('[]' === app.getSchedule()) {
    return; // Already idle
  }
  maxSteps = (undefined !== maxSteps ? maxSteps : 100);
  ticksPerStep = (undefined !== ticksPerStep ? ticksPerStep :
      webdriver.promise.ControlFlow.EVENT_LOOP_FREQUENCY);
  var isIdle = false;
  function onIdle() { isIdle = true; }
  app.on(webdriver.promise.ControlFlow.EventType.IDLE, onIdle);
  var steps = 0;
  while (!isIdle && steps++ < maxSteps) {
    sandbox.clock.tick(ticksPerStep);
  }
  app.removeListener(webdriver.promise.ControlFlow.EventType.IDLE, onIdle);
  should.ok(steps < maxSteps, 'ControlFlow still active after ' + steps + '*' +
      ticksPerStep + ' ticks: \n' + app.getSchedule());
  should.equal('[]', app.getSchedule());
};

/**
 * Stubs out logger.log for all isMatch calls to log 'stubLog.E(msg...)'.
 *
 * @param {Object} sandbox Sinon.JS sandbox object.
 * @param {Function} isMatch called before every logger.log call that passes the
 *   LOG_TO_CONSOLE and MAX_LOG_LEVEL tests, return true to supress the
 *   standard logger.
 * @return {Object} a SinonJS stub.
 */
exports.stubLog = function(sandbox, isMatch) {
  'use strict';
  var originalLog = logger.log;
  return sandbox.stub(logger, 'log', function() {
    if (isMatch.apply(undefined, arguments)) {
      var args = Array.prototype.slice.call(arguments);
      var msg = (args[4] || '').split('\n')[0].slice(0, 12) + '...';
      originalLog.apply(undefined, [args[0], '', '',
          '    stubLog.' + args[1] + '(' + msg + ')', '']);
    } else {
      originalLog.apply(undefined, arguments);
    }
  });
};

/**
 * Stubs out http.get() to verify the URL and return specific content.
 *
 * @param {Object} sandbox Sinon.JS sandbox object.
 * @param {RegExp=} urlRegExp what the URL should be, or undefined.
 * @param {string} data the content to return.
 * @return {Object} a SinonJS stub.
 */
exports.stubHttpGet = function(sandbox, urlRegExp, data) {
  'use strict';
  return sandbox.stub(http, 'get', function(url, responseCb) {
    logger.debug('Stub http.get(%s)', url.href);
    if (urlRegExp) {
      url.href.should.match(urlRegExp);
    }
    var response = new Stream();
    response.setEncoding = function() {};
    responseCb(response);
    response.emit('data', data);
    response.emit('end');
    return response;
  });
};

/**
 * Asserts that the expected array matches the actual array.
 * @param {Array} expected can contain strings and/or RegExp's.
 * @param {Array} actual only contains strings.
 */
exports.assertStringsMatch = function(expected, actual) {
  'use strict';
  if (!actual || expected.length !== actual.length) {
    assert.fail(actual, expected,
        util.format('%j does not match %j', actual, expected));
  } else {
    expected.forEach(function(expValue, i) {
      var matches = expValue instanceof RegExp ?
          expValue.test(actual[i]) :
          expValue === actual[i];
      if (!matches) {
        assert.fail(actual[i], expValue,
            util.format('element #%d of %j does not match %j',
                i, actual, expected));
      }
    });
  }
};

/**
 * A generalized assertStringsMatch that adds support for non-Array "expected"
 * values.
 *
 * @param {Object} expected can contain strings and/or RegExp's.
 *   If expected is an Array, we call assertStringsMatch.
 *   If expected is a function, we apply it with actual.  The function is
 *     responsible for asserting the actual items.
 *   If expected is an object, we assert the items at the key indices, where
 *     negative keys are relative to actual.length, e.g.:
 *     {0:'ssh', '-1':/ls$/}.
 * @param {Array} actual only contains strings, e.g.:
 *   ['ssh', 'foo.com', 'ls'].
 * @see assertStringsMatch
 */
exports.assertMatch = function(expected, actual) {
  'use strict';
  if (!expected || (expected instanceof Array)) {
    exports.assertStringsMatch(expected, actual);
  } else if ('function' === typeof expected) {
    expected.apply(expected, actual);
  } else {
    Object.getOwnPropertyNames(expected).forEach(function(name) {
      var expValue = expected[name];
      var index = name;
      if (index < 0) {
        index = actual.length + parseInt(index, 10);
      }
      var actValue =
          (index >= 0 && index < actual.length ? actual[index] : undefined);
      var matches = expValue instanceof RegExp ?
          expValue.test(actValue) :
          expValue === actValue;
      if (!matches) {
        assert.fail(actValue, expValue,
            util.format('element #%d of [%s] does not match [%s]',
                name, actual, expected));
      }
    });
  }
};

/**
 * An EventEmitter that buffers "emit" requests until a listener is added.
 *
 * This class allows stubbed spawn callbacks to use:
 *   proc.stdout.emit('data', 'foo');
 * instead of:
 *   global.setTimeout(function() {
 *     proc.stdout.emit('data', 'foo');
 *   }, 1);
 * The latter was required because SinonJS calls the stub before the scheduled
 * process_util can attach its stdout/stderr listeners.
 *
 * @constructor
 */
function BufferedEventEmitter() {
  'use strict';
  var origEmit = this.emit;
  var origAddListener = this.addListener;
  var buffer = [];
  this.emit = function() {
    if (this.emit === origEmit) {
      // addListener sets this.emit = origEmit, but we can still get callbacks
      // from a saved pointer, e.g.:
      //   var stdout = proc.stdout.emit.bind(proc.stdout, 'data');
      //   global.setTimeout(...  stdout('foo'); ...);
      origEmit.apply(this, arguments);
    } else {
      buffer.push(arguments);
    }
  };
  this.addListener = function() {
    this.emit = origEmit;
    this.addListener = origAddListener;
    this.on = this.addListener;
    this.addListener.apply(this, arguments);
    buffer.forEach(function(args) {
      this.emit.apply(this, args);
    }.bind(this));
    buffer = [];
  };
  this.on = this.addListener;
}
util.inherits(BufferedEventEmitter, events.EventEmitter);

/**
 * Stubs out child_process.spawn, allows a callback to inject behavior and
 * tests to assert expected calls.
 *
 * The returned stub's "callback" property can be set to control child process
 * stdout and close/exit.  The API is:
 *   #param {Process} proc the fake process.
 *   #param {String} command
 *   #param {Array} args
 *   #return {boolean} false (the default) to emit a 'close' and 'exit' after
 *     5 (fake) milliseconds.  If true then callback is responsible for emitting
 *     these events.
 *
 * The returned stub supports "assertCall":
 *   Asserts the expected next call and increments the callNum.
 *   #param {Object} var_args expected args for assertMatch, e.g.:
 *     assertCall('foo', /x$/);
 *     assertCall({'-1':'bar'});
 * If the var_args is empty then the stub asserts that there are no more calls,
 * otherwise assertMatch is used to compare the actual vs expected args.
 *
 * To assert a list of calls, use "assertCalls":
 *   Asserts the expected next N calls and increments the callNum by N.
 *   #param {Object} zero or more assertCall args, e.g.:
 *     assertCalls(['foo', /x$/], {'-1':'bar']);
 *
 * @param {Object} sandbox a SinonJS sandbox object.
 * @return {Object} a SinonJS stub.
 */
exports.stubOutProcessSpawn = function(sandbox) {
  'use strict';
  var stub = sandbox.stub(child_process, 'spawn', function() {
    var fakeProcess = new events.EventEmitter();
    fakeProcess.stdout = new BufferedEventEmitter();
    fakeProcess.stderr = new BufferedEventEmitter();
    fakeProcess.kill = sandbox.spy();
    var args = Array.prototype.slice.call(arguments);
    var keepAlive = false;
    if (stub.callback) {
      args.unshift(fakeProcess);
      keepAlive = stub.callback.apply(undefined, args);
    }
    if (!keepAlive) {
      global.setTimeout(function() {
        ['exit', 'close'].forEach(function(evt) {
          fakeProcess.emit(evt, /*code=*/0, /*signal=*/undefined);
        });
      }, 5);
    }
    return fakeProcess;
  });
  stub.callback = undefined;

  stub.callNum = 0;
  stub.assertCall = function() {
    var argv;
    var expected = Array.prototype.slice.call(arguments);
    if (0 === expected.length) {  // Called with no args: assert no more calls.
      if (this.callNum < this.callCount) {
        argv = this.getCall(this.callNum).args;
        assert.fail(undefined, expected, this.printf(
            'Unexpected actual call #%1 to %n(): %2',
            this.callNum, [argv[0]].concat(argv[1])));
      } else {
        should.equal(this.callNum, this.callCount);
      }
      return;
    }
    if (1 === expected.length && !(expected[0] instanceof Array)) {
      expected = expected[0];
    }
    if (this.callNum >= this.callCount) {
      assert.fail(undefined, expected, this.printf(
          'Missing expected call #%1 to %n(): %2',
          this.callCount + 1, JSON.stringify(expected)));
    }
    argv = this.getCall(this.callNum).args;
    this.callNum += 1;
    exports.assertMatch(expected, [argv[0]].concat(argv[1]));
  };

  stub.assertCalls = function() {
    var i;
    for (i = 0; i < arguments.length; i += 1) {
      var expected = arguments[i];
      if (!(expected instanceof Array)) {
        expected = [expected];
      }
      this.assertCall.apply(this, expected);
    }
  };

  return stub;
};

/**
 * Creates a spawnStub.callback that can handle basic 'ps' and 'kill' requests.
 *
 * @return {Object} a callback with 'callback(proc, command, args)' and
 *    'addKeepAlive(proc)' functions.
 */
exports.stubShell = function() {
  'use strict';
  var ret = {};
  var pidToProc = [];
  var nextPid = 2;
  ret.addKeepAlive = function(proc) {
    should.equal(undefined, proc.pid);
    var pid = nextPid++;
    proc.pid = pid;
    pidToProc[pid] = proc;
    proc.on('exit', function() {
      delete pidToProc[pid];
    });
    return pid;
  };
  ret.ps_ = function(args) {
    exports.assertMatch(['-u', /^\d+$/, '-o', 'ppid=', '-o', 'pid=', '-o',
        'command='], args);
    return Object.keys(pidToProc).map(function(pid) {
          return '1 ' + pid + ' cmd';
        }).join('\n');
  };
  ret.kill_ = function(args) {
    exports.assertMatch(['-9', /^\d+$/], args);
    var pid = args[args.length - 1];
    var proc = pidToProc[pid];
    if (undefined !== proc) {
      delete pidToProc[pid];
      proc.kill();
    }
  };
  ret.callback = function(proc, command, args) {
    if ('ps' === command) {
      var stdout = ret.ps_(args);
      if (!!stdout) {
        global.setTimeout(function() {
          proc.stdout.emit('data', stdout);
        }, 1);
      }
    } else if ('kill' === command) {
      ret.kill_(args);
    } else {
      throw new Error(util.format('Unexpected command: %s %j', command, args));
    }
    return false;
  };
  return ret;
};

/**
 * Stubs out Math.random with a fixed seed.
 *
 * @param {Object} sandbox a SinonJS sandbox object.
 * @param {Object=} seed optional seed, defaults to 0.1234.
 * @return {Object} a SinonJS stub.
 */
exports.stubRandom = function(sandbox, seed) {
  'use strict';
  var nextRandom = (seed || 0.1234);
  return sandbox.stub(Math, 'random', function() {
    var ret = nextRandom;
    nextRandom = (31 * ret) % 1;
    return ret;
  });
};

/**
 * Stubs out net.createServer, fakes a listener socket that can bind any port
 * but never accepts clients.
 *
 * @param {Object} sandbox a SinonJS sandbox object.
 * @param {Object=} mod require'd module, e.g. net or http.  Defaults to net.
 * @return {Object} a SinonJS stub.
 * @see stubRandom process_utils.scheduleAllocatePort uses Math.random().
 */
exports.stubCreateServer = function(sandbox, mod) {
  'use strict';
  var stub = sandbox.stub(mod || net, 'createServer', function() {
    var fakeServer = new events.EventEmitter();
    fakeServer.port = undefined;
    fakeServer.listen = function(port, callback) {
      assert(!this.port, 'port already set');
      if (1 === stub.ports[port]) {
        this.emit('error', new Error('port in use'));
        return;
      }
      this.port = port;
      stub.ports[port] = 1;
      if (callback) {
        callback();
      }
    };
    fakeServer.close = function(callback) {
      var port = this.port;
      assert(port, 'port not set');
      assert(1 === stub.ports[port], 'port not in use');
      this.port = undefined;
      stub.ports[port] = -1;
      if (callback) {
        callback();
      }
    };
    return fakeServer;
  });
  stub.ports = {};
  return stub;
};
