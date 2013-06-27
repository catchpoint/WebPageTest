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

var process_utils = require('process_utils');

/** Default adb command timeout. */
exports.DEFAULT_TIMEOUT = 60000;


/**
 * Creates an adb runner for a given device serial.
 *
 * @param {webdriver.promise.Application} app the scheduler app.
 * @param {string} serial the device serial.
 * @param {string=} adbCommand the adb command, defaults to 'adb'.
 * @constructor
 */
function Adb(app, serial, adbCommand) {
  'use strict';
  this.app_ = app;
  this.adbCommand_ = adbCommand || process.env.ANDROID_ADB || 'adb';
  this.serial = serial;
}
/** Public class. */
exports.Adb = Adb;

/**
 * Schedules an adb command, resolves with its stdout.
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 * @private
 */
Adb.prototype.command_ = function(args, options, timeout) {
  'use strict';
  return process_utils.scheduleExec(this.app_,
      this.adbCommand_, args, options, timeout || exports.DEFAULT_TIMEOUT);
};

/**
 * Schedules an adb command on the device, resolves with its stdout.
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 */
Adb.prototype.adb = function(args, options, timeout) {
  'use strict';
  return this.command_(['-s', this.serial].concat(args), options, timeout);
};

/**
 * Schedules an adb shell command on the device, resolves with its stdout.
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 */
Adb.prototype.shell = function(args, options, timeout) {
  'use strict';
  return this.adb(['shell'].concat(args), options, timeout);
};

/**
 * Remove trailing '^M's from adb's output.
 *
 * E.g.
 *   adb shell ls | cat -v
 * returns
 *   acct^M
 *   cache^M
 *   ...
 *
 * @param {string|Buffer} s string or Buffer with '\r\n's.
 * @return {string|Buffer} string or Buffer with '\n's.
 */
Adb.prototype.dos2unix = function(s) {
  'use strict';
  if (!s) {
    return s;
  }
  if (!(s instanceof Buffer)) {
    return s.replace(/\r\n/g, '\n');
  }
  var origBuf = s;
  // Tricky binary buffer case.
  //
  // UTF-8 won't work for PNGs, so we can't do:
  //   return new Buffer(s.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  // Hex is awkward due to character alignment, e.g.:
  //   return new Buffer(s.toString('hex').replace(/0d0a/g, '0a'), 'hex');
  // will mangle '70d0a6'.  Instead, we'll do this the hard way:
  var origPos;
  // Imaginary newline before buffer start, always < origPos - 1.
  var origPosAfterNewline = 0;
  var origLen = origBuf.length;
  var retLen = 0;
  var retBuf = new Buffer(origLen);
  for (origPos = 1; origPos < origLen; ++origPos) {
    if (10 === origBuf[origPos] && 13 === origBuf[origPos - 1]) {
      // At \r\n, copy up to (but omit) this \r\n.
      var copyLen = origPos - origPosAfterNewline - 1;
      if (copyLen > 0) {
        origBuf.copy(
            retBuf,  // targetBuffer
            retLen,  // targetStart
            origPosAfterNewline,  // sourceStart
            origPos - 1); // sourceEnd (exclusive)
        retLen += copyLen;
      }
      // Explicitly add the \n.
      retBuf[retLen++] = 10;
      origPosAfterNewline = origPos + 1;
    }
  }
  var tailLen = origLen - origPosAfterNewline;
  if (tailLen > 0) {
    // origBuf did not end with \r\n.
    origBuf.copy(retBuf, retLen, origPosAfterNewline, origLen);
    retLen += tailLen;
  }
  if (retLen < retBuf.length) {
    // Trim result buffer.
    retBuf = retBuf.slice(0, retLen);
  }
  return retBuf;
};
