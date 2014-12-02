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

var util = require('util');

/** Object of levelName to [level, printer, levelId]. */
exports.LEVELS = {
    alert: [0, console.error, 'A'],
    critical: [1, console.error, 'C'],
    error: [2, console.error, 'E'],
    warn: [3, console.warn, 'W'],
    info: [4, console.info, 'I'],
    debug: [5, console.log, 'D'],
    extra: [6, console.log, 'F']
  };

/**
 * Print a single char for repeat log messages, to reduce log clutter.
 *
 * For example, if our HISTORY_LIMIT is 3 and we're asked to log:
 *   [A, B, C, C, B, C, D, B]
 # then we'll print:
 *   [A, B, C, ., 1, ., D, 2]
 * where '.' is shorthand for 0.
 * To disable, set the HISTORY_LIMIT to <= 0.
 */
exports.HISTORY_LIMIT = 3;
/** The history char printer, which defaults to stdout. */
exports.DOT_WRITER = process.stdout;
var history = [];
var dotCount = 0;  // how many '.'s we've printed in a row

function getMaxLogLevel() {
  'use strict';
  var env = process.env.WPT_MAX_LOGLEVEL;
  if (undefined !== env) {
    var num = parseInt(env, /*radix=*/10);
    if (!isNaN(num)) {
      return num;
    }
    var level = exports.LEVELS[env.toLowerCase()];
    if (undefined !== level) {
      return level[0];
    }
  }
  return exports.LEVELS.info[0];
}

/** Log threshold from $WPT__MAX_LOGLEVEL, defaults to 'info'. */
exports.MAX_LOG_LEVEL = getMaxLogLevel();
/** Also log to stdout, set by $WPT_VERBOSE, defaults to 'true'. */
exports.LOG_TO_CONSOLE = ('true' === (process.env.WPT_VERBOSE || 'true'));

/**
 * Lets the caller verify if the given log level is active.
 *
 * @param {string} levelName log name, e.g. 'info'.
 * @return {boolean}
 */
exports.isLogging = function(levelName) {
  'use strict';
  var levelAndPrinter = exports.LEVELS[levelName];
  if (undefined === levelAndPrinter) {
    throw new Error('Unknown levelName: ' + levelName);
  }
  return levelAndPrinter[0] <= exports.MAX_LOG_LEVEL;
};

/**
 * Parses a stack trace line like this:
 * " at [qualified.function.<name> (]/source/file.js:123<...>"
 * The regex strips "Object." and "exports." qualifications
 * (yes there is sometimes "Object.exports."), strips file path,
 * and matches positional groups 1:function 2:file 3:line.
 *
 * @private
 */
var STACK_LINE_RE_ = new RegExp(
    // Either "at <function> (" or just "at " if the function is unknown.
    (/^ +at +(?:(?:(?:Object\.)?(?:exports\.))?([\S \[\]]+) +\()?/).source +
    // /path/file:line
    (/(?:\S+\/)?(\S+?):(\d+)[\s\S]*/).source);

/**
 * Returns a debug string indicating who called the caller of this function.
 *
 * @param {int=} level the caller level: 1 by default, 0 = myself.
 * @return {string} debug annotation.
 */
exports.whoIsMyCaller = function(level) {
  'use strict';
  if (level === undefined) {
    level = 1;
  }
  var callerStackLine = new Error().stack.split('\n', 3 + level)[2 + level];
  var matches = callerStackLine.match(STACK_LINE_RE_);
  var functionName = matches[1] || 'unknown';
  return matches[2] + ':' + matches[3] + ' ' + functionName;
};

/**
 * Logs a util.format message if the level is <= our MAX_LOG_LEVEL.
 *
 * @param {Array} levelProperties [<level>, <stream>, <abbreviation>].
 * @param {Object} var_args util.format arguments, e.g. '%s is %d', 'foo', 7.
*/
function maybeLog(levelProperties, var_args) {  // jshint unused:false
  'use strict';
  var level = levelProperties[0];
  if (level <= exports.MAX_LOG_LEVEL) {
    var stamp = new Date();  // Take timestamp early for better precision
    var stream = levelProperties[1];
    var levelName = levelProperties[2];
    var sourceAnnotation = exports.whoIsMyCaller(2);
    var message = util.format.apply(
        undefined, Array.prototype.slice.call(arguments, 1)).trim();
    if (exports.LOG_TO_CONSOLE) {
      if (exports.HISTORY_LIMIT > 0) {
        var i = 0;
        for (; i < history.length && (
            level !== history[i][0] || message !== history[i][1]); i++) {
        }
        if (i < history.length) {  // Matches recent history
          dotCount += 1;
          if (exports.DOT_WRITER) {
            if (0 === (dotCount % 80)) {  // Line wrap after 80 chars
              exports.DOT_WRITER.write('\n');
              exports.log(stream, levelName, stamp, '', '');
            }
            var dotChar = (0 === i ? '.' : ('' + i));
            exports.DOT_WRITER.write(dotChar);
          }
          return;
        } else {
          if (dotCount > 1) {
            dotCount = 1;
            if (exports.DOT_WRITER) {
              exports.DOT_WRITER.write('\n');
            }
            // We could clear the history here, e.g.:
            //   info("foo") --> T1 info: foo
            //   info("bar") --> T2 info: bar
            //   info("foo") --> 1   (flush if you'd prefer "T3 info: foo")
          }
          if (history.length >= exports.HISTORY_LIMIT) {
            history.pop();
          }
          history.unshift([level, message]);
        }
      }
      exports.log(stream, levelName, stamp, sourceAnnotation, message);
    }
  }
}

// Months in locale format
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec'];

/**
 * Log to text stream.
 *
 * @param {Function} levelPrinter log stream.
 * @param {string} levelName log name, e.g. 'info'.
 * @param {Date=} stamp log timestamp.
 * @param {string} source caller stack's function name and line.
 * @param {string} message text to log.
 */
exports.log = function(levelPrinter, levelName, stamp, source, message) {
  'use strict';
  var date = stamp;
  if (undefined === date) {
    date = new Date();
  }
  if (date instanceof Date) {
    // e.g. 1391808049123 --> "Feb_07_13:20:49.123" (local timezone is PST).
    date = new Date(date.getTime() - 60000 * date.getTimezoneOffset());
    date = MONTHS[date.getMonth()] + '_' +
        date.toISOString().slice(7, -1).replace('T', '_').replace('-', '');
  }
  levelPrinter(levelName + ' ' + date + ' ' + source + ' ' +
      (message ? (': ' + message) : ''));
};

// Generate level-named functions -- info, debug, etc.
Object.keys(exports.LEVELS).forEach(function(levelName) {
  'use strict';
  var boundLog = maybeLog.bind(undefined, exports.LEVELS[levelName]);
  // We cannot simply assign boundLog, because SinonJS somehow doesn't like it,
  // and the stubs on the logging functions break.
  // This is also why whoIsMyCaller needs an arg to return indirect callers.
  exports[levelName] = function() {
    boundLog.apply(undefined, arguments);
  };
});
