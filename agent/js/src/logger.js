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

exports.LEVELS = {
    alert: [0, console.error, 'A'],
    critical: [1, console.error, 'C'],
    error: [2, console.error, 'E'],
    warn: [3, console.warn, 'W'],
    info: [4, console.info, 'I'],
    debug: [5, console.log, 'D'],
    extra: [6, console.log, 'F']
};

var jsonFileLogger = jog(new jog.FileStore('./debug.log'));

function getMaxLogLevel() {
  'use strict';
  var maxLevel = parseInt(process.env.WPT_MAX_LOGLEVEL, /*radix=*/10);
  if (! isNaN(maxLevel)) {
    return maxLevel;
  }
  maxLevel = exports.LEVELS[process.env.WPT_MAX_LOGLEVEL];
  if (undefined !== maxLevel) {
    return maxLevel[0];
  }
  if ('true' === process.env.WPT_DEBUG) {
    return exports.LEVELS.debug[0];
  }
  return exports.LEVELS.warn[0];
}

exports.MAX_LOG_LEVEL = getMaxLogLevel();
exports.LOG_TO_CONSOLE = ('true' === process.env.WPT_VERBOSE);

/**
 * Lets the caller verify if the given log level is active.
 */
exports.isLogging = function(level) {
  'use strict';
  var levelAndPrinter = exports.LEVELS[level];
  if (undefined === levelAndPrinter) {
    levelAndPrinter = exports.LEVELS.debug;
  }

  return levelAndPrinter[0] <= exports.MAX_LOG_LEVEL;
};

/**
 * Parses a stack trace line like this:
 * " at qualified.function.<name> (/source/file.js:123:456)"
 * The regex strips "Object." and "exports." prefixes, strips file path,
 * and matches positional groups 1:function 2:file 3:line.
 */
var STACK_LINE_RE_ = new RegExp(
    // Function name
    /^ +at +(?:Object\.)?(?:exports\.)?([\S \[\]]+) +/.source +
    // file:line
    /\((?:\S+\/)?(\S+?):(\d+)[\s\S]*/.source);

/**
 * log is a wrapper for the visionmedia jog module that will:
 * a) automatically wrap strings in an object to get maximum info.
 * b) use jog.info because it stores the most information.
 * c) check for a WPT_VERBOSE environment variable and mirror logs to the
 *    console if it is true.
 * d) check for a WPT_MAX_LOGLEVEL environment variable and only log messages
 *    greater than or equal to the maximum log level.
 *
 * @param  {String} levelName the log level.
 * @param  {Object|String} data an object or string
 *    (which will be converted to an object for jog) that will be logged.
*/
function log(levelName, levelProperties, data) {
  'use strict';
  if (levelProperties[0] <= exports.MAX_LOG_LEVEL) {
    var stamp = new Date();  // Take timestamp early for better precision
    var sourceAnnotation = new Error().stack.split('\n', 3)[2].replace(
        STACK_LINE_RE_, '$2:$3 $1');
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
      levelProperties[1](levelProperties[2] + ' ' +
          stamp.toISOString().slice(5,-1).replace('T', 'Z').replace('-', '') +
          ' ' + sourceAnnotation + ': ' + message);
    }

    jsonFileLogger.info(levelName, logData);
  }
}

// Generate level-named functions -- info, debug, etc.
Object.keys(exports.LEVELS).forEach(function(levelName) {
  'use strict';
  exports[levelName] = log.bind(
      /*this=*/undefined, levelName, exports.LEVELS[levelName]);
});
