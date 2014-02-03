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

/**
 * Controls WebPageReplay for this particular browser via an command script.
 * The script, usually named 'wpr', must accept the following commands:
 *
 * wpr record <IP or MAC>  -- Start recording all HTTP from the IP/MAC.
 * wpr replay <IP or MAC>  -- Start replaying recorded HTTP from the IP/MAC.
 * wpr getlog <IP or MAC>  -- Print replay error log for the IP/MAC to stdout.
 * wpr end <IP or MAC>  -- Stop record/replay for the IP/MAC.
 *
 * @param {webdriver.promise.ControlFlow=} app the scheduler.
 * @param {Object.<string>} args options with string values:
 *   #param {string=} deviceAddr IP or MAC address, defaults to 'any'.
 *   #param {string=} wprCommand wpr command, defaults to 'wpr'.
 * @constructor
 */
function WebPageReplay(app, args) {
  'use strict';
  this.app_ = app;
  this.deviceAddr_ = (args.deviceAddr || 'any');
  this.wprCommand_ = (args.wprCommand || 'wpr');
}
/** Export class. */
exports.WebPageReplay = WebPageReplay;

/**
 * @return {webdriver.promise.Promise} resolve({boolean} isSupported).
 * @private
 */
WebPageReplay.prototype.scheduleIsSupported_ = function() {
  'use strict';
  return this.app_.schedule('isSupported', function() {
    if (undefined !== this.isSupported_) {
      return this.isSupported_;
    }
    var commandExists = true;
    // Only test if the command exists if it has a '/' path.
    var testIfExists = (-1 !== this.wprCommand_.indexOf('/'));
    if (testIfExists) {
      process_utils.scheduleFunction(this.app_, 'Test if exists', fs.exists,
          this.wprCommand_).then(function(exists) {
        commandExists = exists;
      });
    }
    return this.app_.schedule('Test wpr status', function() {
      // If testIfExists, we get here only after the fs.exists() callback fired.
      if (commandExists) {
        return process_utils.scheduleExec(this.app_, this.wprCommand_,
                ['status']).then(function() {
          this.isSupported_ = true;
          return true;
        }.bind(this), function(e) {
          logger.warn("%s status command failed: %s", this.wprCommand_, e);
          this.isSupported_ = false;
          return false;
        }.bind(this));
      } else {
        this.isSupported_ = false;
        return false;
      }
    }.bind(this));
  }.bind(this));
};

/**
 * Apply replay options.
 *
 * @param {Object} args WebPageReplay arguments:
 *   #param {string=} command, one of: 'record', 'replay', 'geterrorlog', 'end.
 *   #param {string} source IP or MAC of the browser, for all commands.
 * @return {webdriver.promise.Promise} resolve({string} commandOutput).
 * @private
 */
WebPageReplay.prototype.scheduleWprCommand_ = function(args) {
  'use strict';
  this.scheduleIsSupported_().then(function(isSupported) {
    if (!isSupported) {
      throw new Error(this.wprCommand_ + ' not found.' +
        ' Please rerun without WebPageReplay.');
    }
  }.bind(this));
  return process_utils.scheduleExec(this.app_, this.wprCommand_, args).then(
      function(stdout) {
    return stdout.trim();
  });
};

/**
 * Starts recording.
 *
 * @return {webdriver.promise.Promise} resolve({string} webPageReplayIpAddress).
 */
WebPageReplay.prototype.scheduleRecord = function() {
  'use strict';
  return this.scheduleWprCommand_(['record', this.deviceAddr_]);
};

/**
 * Starts replaying.
 *
 * @return {webdriver.promise.Promise} resolve({string} webPageReplayIpAddress).
 */
WebPageReplay.prototype.scheduleReplay = function() {
  'use strict';
  // Cleanup
  return this.scheduleWprCommand_(['replay', this.deviceAddr_]);
};

/**
 * Fetches a replay error log.
 *
 * @return {webdriver.promise.Promise} resolve({string} errorLog).
 */
WebPageReplay.prototype.scheduleGetErrorLog = function() {
  'use strict';
  return this.scheduleWprCommand_(['getlog', this.deviceAddr_]);
};

/**
 * Stops WebPageReplay for the given source.
 */
WebPageReplay.prototype.scheduleStop = function() {
  'use strict';

  this.scheduleIsSupported_().then(function(isSupported) {
    if (!isSupported) {
      return;
    }
    this.scheduleWprCommand_(['end', this.deviceAddr_]);
  }.bind(this));
};
