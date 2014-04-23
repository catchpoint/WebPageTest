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

var fs = require('fs');
var logger = require('logger');
var process_utils = require('process_utils');
var should = require('should');
var sinon = require('sinon');
var test_utils = require('./test_utils.js');
var webdriver = require('selenium-webdriver');

describe('process_utils small', function() {
  'use strict';

  var app = webdriver.promise.controlFlow();
  process_utils.injectWdAppLogging('WD app', app);

  var sandbox;

  before(function() {
    process_utils.setSystemCommands();
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    test_utils.fakeTimers(sandbox);
    app.reset();
  });

  afterEach(function() {
    test_utils.unfakeTimers(sandbox);
    sandbox.verifyAndRestore();
  });

  it('should use webdriver promise workaround', function() {
    // Verify that webdriver's promise only returns a single callback arg.
    // We workaround this by passing an array for multiple args, but ideally
    // we'll simply our code when webdriver is fixed.
    var a, b;
    app.schedule('x', function() {
      var done = new webdriver.promise.Deferred();
      done.fulfill('a', 'b');
      return done;
    }).then(function(a2, b2) {
      a = a2;
      b = b2;
    });
    test_utils.tickUntilIdle(app, sandbox);
    should.equal('a', a);
    should.equal(undefined, b); // webdriver bug?!
  });

  /**
   * Test scheduleFunction.
   * @param {number} delay in seconds.
   * @param {Error=} err
   * @param {Object=} v1
   * @param {Object=} v2
   */
  function testAsync(delay, err, v1, v2) {
    function f(ferr, fv1, fv2, cb) {
      if (delay > 0) {
        global.setTimeout(function() {
          cb(ferr, fv1, fv2);
        }, delay);
      } else {
        cb(ferr, fv1, fv2);
      }
    }
    var rn = 0;
    var re, rv1, rv2;
    process_utils.scheduleFunction(app, 'x', f, err, v1, v2).then(
        function(cv1, cv2) {
      rn += 1;
      rv1 = cv1;
      rv2 = cv2;
    }, function(ce) {
      rn += 1;
      re = ce;
    });
    should.equal(0, rn);
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(1, rn);
    should.equal(err, re);
    should.equal(v1, rv1);
    should.equal(v2, rv2);
  }

  it('should support async functions', function() {
    testAsync(0, undefined, 7);
    testAsync(3, undefined, 7);
    testAsync(0, new Error('x'));
    testAsync(3, new Error('x'));
    testAsync(0, undefined, ['x', 'y']);
  });

  it('should support async fs.exists', function() {
    // fs.exists invokes cb(exists) instead of cb(err, exists),
    // so this is special-cased in process_utils
    sandbox.stub(fs, 'exists', function(path, cb) {
      global.setTimeout(function() {
        cb(path === 'y');
      }, 1);
    });

    var exists;
    process_utils.scheduleFunction(app, 'x', fs.exists, 'y').then(function(v) {
      exists = v;
    });
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(true, exists);

    exists = undefined;
    process_utils.scheduleFunction(app, 'x', fs.exists, 'n').then(function(v) {
      exists = v;
    });
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(false, exists);
  });

  it('should create a ProcessInfo', function() {
    var processInfo = new process_utils.ProcessInfo('123 456 abc def');
    should.equal('123', processInfo.ppid);
    should.equal('456', processInfo.pid);
    should.equal('abc', processInfo.command);
    should.equal('def', processInfo.args.join(' '));

    // Moar whitespaces plz!
    processInfo = new process_utils.ProcessInfo('  123   456    abc   def');
    should.equal('123', processInfo.ppid);
    should.equal('456', processInfo.pid);
    should.equal('abc', processInfo.command);
    should.equal('def', processInfo.args.join(' '));
  });

  it('should kill all process in killProcesses', function() {
    var processInfos = [
        new process_utils.ProcessInfo('0 1 a'),
        new process_utils.ProcessInfo('0 2 b'),
        new process_utils.ProcessInfo('0 3 c'),
        new process_utils.ProcessInfo('0 4 d'),
        new process_utils.ProcessInfo('0 5 e')
      ];
    var numKilled = 0;
    var spawnStub = test_utils.stubOutProcessSpawn(sandbox);
    spawnStub.callback = function(proc, command) {
      logger.info('Stub spawn: %s', command);
      if ('kill' === command) {
        numKilled += 1;
      }
      return false;
    };

    process_utils.scheduleKillAll(app, 'killAll', processInfos);
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(5, numKilled);
  });

  function testKillTree(pid, psOutput, expectedPidsToKill) {
    var actualPidsToKill = [];
    var spawnStub = test_utils.stubOutProcessSpawn(sandbox);
    spawnStub.callback = function(proc, command, args) {
      var stdout = '';
      if ('kill' === command && /^\d+$/.test(args[args.length - 1])) {
        var pid = args[args.length - 1]; // kill pid
        actualPidsToKill.push(parseInt(pid, 10));
      } else if ('ps' === command) {
        stdout = psOutput;
      } else {
        throw new Error('Unexpected command: ' + command);
      }
      proc.stdout.emit('data', stdout);
      return false;
    };

    process_utils.scheduleKillTree(app, 'killTree', {'pid': pid});
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(actualPidsToKill.toString(), expectedPidsToKill.toString());
  }

  it('should kill process and children', function() {
    testKillTree(7,
      (' 1    7  r0\n' +
       ' 7   12  r0/c0\n' +
       ' 1    3  r1\n' +
       '12  999  r0/c0/g0\n' +
       ' 7   34  r0/c1'),
      [7, 34, 12, 999]);
  });

  function testAllocPort(expectedPorts, usedPorts, randomSeed) {
    test_utils.stubRandom(sandbox, randomSeed);
    var serverStub = test_utils.stubCreateServer(sandbox);
    serverStub.ports = (usedPorts || {});
    process_utils.scheduleAllocatePort(app, 'alloc port');
    test_utils.tickUntilIdle(app, sandbox);
    should.equal(JSON.stringify(serverStub.ports),
       JSON.stringify(expectedPorts));
  }

  it('should allocate a port', function() {
    testAllocPort({4940: -1, 4941: 1});
  });

  it('should allocate a port (with retry)', function() {
    testAllocPort({4941: 1, 27225: 1, 27224: -1}, {4941: 1});
  });

  it('should iterate over JSON objects', function() {
    var props = [];
    var d = {a: 1, b: 2};
    process_utils.forEachRecursive(d, function(key, obj) {
      should.equal(d, obj);
      props.push(key);
    });
    test_utils.assertStringsMatch(['a', 'b'], props);

    props = [];
    d = {a: 1, b: {c: 2}};
    process_utils.forEachRecursive(d, function(key, obj) {
      if ('c' === key) {
        should.equal(d.b, obj);
      } else {
        should.equal(d, obj);
      }
      props.push(key);
    });
    test_utils.assertStringsMatch(['a', 'b', 'c'], props);

    // Empty map never calls the callback.
    process_utils.forEachRecursive({}, function() {
      throw new Error('Not supposed to be here');
    });

    // Non-map never calls the callback.
    process_utils.forEachRecursive('gaga', function() {
      throw new Error('Not supposed to be here');
    });
  });
});
