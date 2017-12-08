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
var should = require('should');

describe('logger small', function() {
  'use strict';

  var logToConsole, maxLogLevel, restoreCalls;

  before(function() {
    logToConsole = logger.LOG_TO_CONSOLE;
    maxLogLevel = logger.MAX_LOG_LEVEL;
    restoreCalls = [];
  });

  afterEach(function() {
    logger.LOG_TO_CONSOLE = logToConsole;
    logger.MAX_LOG_LEVEL = maxLogLevel;
    restoreCalls.forEach(function(restoreCall) {
      restoreCall();
    });
  });

  it('should output to the error, warn, info, and honor max logging level',
      function() {
    var buffer = '';
    Object.keys(logger.LEVELS).forEach(function(levelName) {
      var originalLogger = logger.LEVELS[levelName][1];
      restoreCalls.push(function() {
        logger.LEVELS[levelName][1] = originalLogger;
      });
      logger.LEVELS[levelName][1] = function(message) {
        buffer += message + '\n';
      };
    });
    var originalDotWriter = logger.DOT_WRITER;
    restoreCalls.push(function() {
      logger.DOT_WRITER = originalDotWriter;
    });
    logger.DOT_WRITER = {write: function(message) {
      buffer += message;
    }};
    logger.LOG_TO_CONSOLE = true;

    logger.MAX_LOG_LEVEL = 99;
    logger.error('error message');
    logger.warn('warning message');
    logger.info('info message');
    logger.extra('log message');
    logger.MAX_LOG_LEVEL = -1;
    logger.extra('log message');
    logger.MAX_LOG_LEVEL = logger.LEVELS.extra[0];
    logger.extra('log message');
    logger.MAX_LOG_LEVEL = logger.LEVELS.alert[0];
    logger.extra('log message');
    logger.MAX_LOG_LEVEL = logger.LEVELS.info[0];
    logger.info('info message');

    var lines = buffer.split('\n');
    should.equal(5, lines.length);
    lines[0].should.match(/^E \S+ logger_tests_small.*: error message$/);
    should.ok(/^W .*: warning message$/.test(lines[1]));
    should.ok(/^I .*: info message$/.test(lines[2]));
    should.ok(/^F .*: log message$/.test(lines[3]));
    should.equal('.1', lines[4]);
  });
});
