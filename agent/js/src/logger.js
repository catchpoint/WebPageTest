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

var jog = require('jog');
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
 * Print "."s instead of repeat console messages, up to (DOT_LIMIT-1) dots.
 * To disable, set the DOT_LIMIT to undefined or <= 0.
 */
exports.DOT_LIMIT = 80;
/** Dot printer. */
exports.DOT_WRITER = process.stdout;
var prevCount = 0;
var prevLevel;
var prevMessage;

var jsonFileLogger = jog(new jog.FileStore('./debug.log'));

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
 * maybeLog is a wrapper for the visionmedia jog module that will:
 * a) automatically wrap strings in an object to get maximum info.
 * b) use jog.info because it stores the most information.
 * c) check for a WPT_VERBOSE environment variable and mirror logs to the
 *    console if it is true.
 * d) check for a WPT_MAX_LOGLEVEL environment variable and only log messages
 *    greater than or equal to the maximum log level.
 *
 * @param {string} levelName the log level.
 * @param {Array} levelProperties [<level>, <stream>, <abbreviation>].
 * @param {Object|string} data an object or string
 *    (which will be converted to an object for jog) that will be logged.
*/
function maybeLog(levelName, levelProperties, data) {
  'use strict';
  var level = levelProperties[0];
  if (level <= exports.MAX_LOG_LEVEL) {
    var stamp = new Date();  // Take timestamp early for better precision
    var callerStackLine = new Error().stack.split('\n', 3)[2];
    var matches = callerStackLine.match(STACK_LINE_RE_);
    var functionName = matches[1] || 'unknown';
    var sourceAnnotation = matches[2] + ':' + matches[3] + ' ' + functionName;
    var message;
    var logData = data;
    if (typeof data === 'string') {
      message = util.format.apply(
          /*this=*/undefined, Array.prototype.slice.call(arguments, 2)).trim();
      logData = { message: message, source: sourceAnnotation };
    } else {
      logData = data.slice();  // Don't modify the original
      data.source = sourceAnnotation;
    }
    if (exports.LOG_TO_CONSOLE) {
      if (!message) {
        message = JSON.stringify(data);
      }
      if (level === prevLevel && message === prevMessage &&
            exports.DOT_LIMIT >= prevCount) {
        prevCount += 1;
        if (exports.DOT_WRITER) {
          exports.DOT_WRITER.write('.');
        }
      } else {
        if (prevCount > 1 && exports.DOT_WRITER) {
          exports.DOT_WRITER.write('\n');
        }
        prevCount = 1;
        prevLevel = level;
        prevMessage = message;
        exports.log(levelProperties[1], levelProperties[2], stamp,
            sourceAnnotation, message);
      }
    }

    jsonFileLogger.info(levelName, logData);
  }
}

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
    date = date.toISOString().slice(5, -1).replace('T', 'Z').replace('-', '');
  }
  levelPrinter(levelName + ' ' + date + ' ' + source + ' ' +
      (message ? (': ' + message) : ''));
};

// Generate level-named functions -- info, debug, etc.
Object.keys(exports.LEVELS).forEach(function(levelName) {
  'use strict';
  exports[levelName] = maybeLog.bind(
      /*this=*/undefined, levelName, exports.LEVELS[levelName]);
});
