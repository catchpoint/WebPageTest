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
var sinon = require('sinon');
var Stream = require('stream');
var timers = require('timers');
var util = require('util');


/**
 * failTest asserts a failure with a description
 *
 * @param {String} desc is the error message that will be thrown.
 */
exports.failTest = function(desc) {
  'use strict';
  function throwError () {
    throw new Error(desc);
  }
  throwError.should.not.throw();
};

/**
 * Generic timer function fake for use in fakeTimers.
 */
var fakeTimerFunction = function(sandbox, method, args) {
  'use strict';
  logger.extra('%s(%s)', method, Array.prototype.slice.apply(args));
  return sandbox.clock[method].apply(sandbox.clock, args);
};

// Timer functions to fake/unfake
var fakeTimerFunctions = [
  'setTimeout', 'clearTimeout', 'setInverval', 'clearInterval'];

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
    timers[method] = function () {
      return fakeTimerFunction(sandbox, method, arguments);
    };
  });
  // For some reason the faked functions don't actually get called without this:
  timers.setInterval = function () {
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
 * Stubs out http.get() to verify the URL and return specific content.
 *
 * @param {Object} sandbox Sinon.JS sandbox object.
 * @param {RegExp} [urlRegExp] what the URL should be, or undefined.
 * @param {String} data the content to return.
 */
exports.stubHttpGet = function(sandbox, urlRegExp, data) {
  'use strict';
  var response = new Stream();
  response.setEncoding = function() {};
  return sandbox.stub(http, 'get', function(url, responseCb) {
    logger.debug('Stub http.get(%s)', url.href);
    if (urlRegExp) {
      url.href.should.match(urlRegExp);
    }
    responseCb(response);
    response.emit('data', data);
    response.emit('end');
    return response;
  });
};

/**
 * Validates an array of strings against expected strings and/or RegEx'es.
 */
exports.assertStringsMatch = function(expected, actual) {
  'use strict';
  if (!actual || expected.length !== actual.length) {
    assert.fail(actual, expected,
        util.format('[%s] does not match [%s]', actual, expected));
  } else {
    expected.forEach(function(expValue, i) {
      if (!(expValue instanceof RegExp && expValue.test(actual[i])) &&
          expValue !== actual[i]) {
        assert.fail(actual[i], expected,
            util.format('element #%d of [%s] does not match [%s]',
                i, actual, expected));
      }
    });
  }
};

/**
 * Stubs out child_process.spawn, allows a callback to inject behavior.
 *
 * On the returned stub object, optionally set the property "callback",
 * with the function that takes the fake process object, command, args.
 * The callback should return a "keep running" value:
 * false (default with no explicit return) for the stub to emit 'exit'
 * after 5 (fake) milliseconds, true to suppress emitting 'exit', in which case
 * the caller is responsible for emitting 'exit' as it wishes.
 *
 * @param {Object} sandbox a SinonJS sandbox object.
 * @returns {Object} a SinonJS stub.
 */
exports.stubOutProcessSpawn = function(sandbox) {
  'use strict';

  var stub = sandbox.stub(child_process, 'spawn', function() {
    var fakeProcess = new events.EventEmitter();
    fakeProcess.stdout = new events.EventEmitter();
    fakeProcess.stderr = new events.EventEmitter();
    fakeProcess.kill = sandbox.spy();
    var keepRunning = false;
    var args = Array.prototype.slice.call(arguments);
    if (stub.callback) {
      args.unshift(fakeProcess);
      keepRunning = stub.callback.apply(undefined, args);  // undefined: no
    }
    if (!keepRunning) {
      global.setTimeout(function() {
        fakeProcess.emit('exit', /*code=*/0, /*signal=*/undefined);
      }, 5);
    }
    return fakeProcess;
  });
  stub.callback = undefined;
  return stub;
};
