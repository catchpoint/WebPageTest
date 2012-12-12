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
var sinon = require('sinon');
var timers = require('timers');


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
  logger.info('%s(%s)', method, Array.prototype.slice.apply(args));
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
