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
/*jslint nomen:false */

var logger = require('logger');
var process_utils = require('process_utils');

exports.DEFAULT_TIMEOUT = 60000;


exports.getLoggingErrback = function(description) {
  'use strict';
  return function(e, stdout, stderr) {
    logger.error('%s filed: %s, stdout "%s", stderr "%s"',
        description, e, stdout, stderr);
  };
};

/**
 * Creates an adb runner for a given device serial.
 * @param {String} serial the device serial.
 * @param {String} [adbCommand] the adb command, defaults to 'adb'.
 * @constructor
 */
function Adb(app, serial, adbCommand) {
  'use strict';
  this.app_ = app;
  this.adbCommand_ = adbCommand || process.env.ANDROID_ADB || 'adb';
  this.serial = serial;
}
exports.Adb = Adb;

Adb.prototype.command_ = function(args, timeout) {
  'use strict';
  return process_utils.scheduleExecWithTimeout(this.app_,
      this.adbCommand_, args, timeout || exports.DEFAULT_TIMEOUT).then(
      function(stdout, stderr) {
    logger.debug('succeeded%s',
        process_utils.stdoutStderrMessage(stdout, stderr));
  }, function(e) {
    logger.error('failed: %s', e);
    throw e;
  });
};

Adb.prototype.do = function(args, timeout) {
  'use strict';
  return this.command_(['-s', this.serial].concat(args), timeout);
};

Adb.prototype.shell = function(args, timeout) {
  'use strict';
  return this.do(['shell'].concat(args), timeout);
};
