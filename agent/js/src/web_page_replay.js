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
 *     Before the recording, delete any leftover recordings for the IP/MAC.
 *     Set up any DNS spoofing, if applicable, start WPR in recording mode.
 *     Save the recording, so that "wpr replay" would pick it up.
 * wpr replay <IP or MAC>  -- Start replaying recorded HTTP from the IP/MAC.
 *     Start WPR in replay mode, with a recording from "wpr record".
 * wpr getlog <IP or MAC>  -- Print replay error log for the IP/MAC to stdout.
 *     Any errors in the log induce a run failure. Therefore if you want to
 *     tolerate request pass-throughs, those must be warnings, not errors.
 *     Reset the log, so that the next "wpr getlog" for this IP/MAC would only
 *     return the log from this point on.
 * wpr stop <IP or MAC>  -- Stop record/replay for the IP/MAC.
 *     Delete the recording, if any, and undo any DNS spoofing, if any.
 *     Must tolerate
 * At the job level, record/replay works as follows, when the job specifies it:
 *
 * 1. Run #0 for recording:
 * 1.1. Command "wpr record <IP or MAC>".
 * 1.2. Unconditionally NO traffic shaping, NO video capture, even if the job
 *     specified video capture or traffic shaping.
 * 1.3. Only an uncached run, no cache-warm run even if the job specified it.
 * 1.4. Do NOT submit run #0 results to the WebPageTest server,
 *     unless it's a failure, in which case the whole job fails, go to (3).
 * 1.5. Kill wd_server and kill leftover processes as usual.
 *     This may kill any background children of the wpr script, if launched.
 *
 * At the end of (1), there is a recording available of the run #0.
 *
 * 2. Real runs #1-N, with traffic shaping, video, etc. as specified by the job.
 * 2.1. Command "wpr replay <IP or MAC>".
 * 2.2. The run as usual, with or without cache-warm run, as the job specifies.
 * 2.3. Command "wpr getlog <IP or MAC>".
 * 2.4. Send results to the WebPageTest server.
 * 2.4. Kill wd_server and leftover processes, including any children of wpr.
 *
 * 3. At the very end, with traffic shaping reset, stop WebPageReplay:
 * 3.1. Command "wpr stop <IP or MAC>".
 *
 * (3.1) has a chance to nuke the recording from run #0.
 *
 * If the job does not specify WebPageReplay, we just run the command:
 * "wpr stop <IP or MAC>"
 * in case the previous run somehow failed to do that.
 *
 * @param {webdriver.promise.ControlFlow=} app the scheduler.
 * @param {Object} args options:
 *   #param {Object.<string>} flags:
 *     #param {string=} deviceAddr IP or MAC address, defaults to 'any'.
 *     #param {string=} wprCommand wpr command, defaults to 'wpr'.
 * @constructor
 */
function WebPageReplay(app, args) {
  'use strict';
  this.app_ = app;
  this.deviceAddr_ = (args.flags.deviceAddr || 'any');
  // split to support 'wpr,--url,http://foo:8082', ignore ',' escaping
  this.wprCommand_ = (args.flags.wprcommand || 'wpr').split(',');
  this.isSupported_ = undefined;
}
/** Export class. */
exports.WebPageReplay = WebPageReplay;

/**
 * @return {webdriver.promise.Promise} resolve({boolean} isSupported).
 * @private
 */
WebPageReplay.prototype.scheduleIsSupported_ = function() {
  'use strict';
  return this.app_.schedule('wpr isSupported', function() {
    if (undefined !== this.isSupported_) {
      return this.isSupported_;
    }
    var commandPath = this.wprCommand_[0];
    var commandExists = true;
    // Only test if the command exists if it has a '/' path.
    var testIfExists = (-1 !== commandPath.indexOf('/'));
    if (testIfExists) {
      process_utils.scheduleFunction(this.app_, 'Test if exists', fs.exists,
          commandPath).then(function(exists) {
        commandExists = exists;
      });
    }
    return this.app_.schedule('Test wpr status', function() {
      // If testIfExists, we get here only after the fs.exists() callback fired.
      if (commandExists) {
        return process_utils.scheduleExec(this.app_, commandPath,
                ['status']).then(function() {
          this.isSupported_ = true;
          return true;
        }.bind(this), function(e) {
          logger.warn('%s status command failed: %s', commandPath, e);
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
 *   #param {string=} command one of: 'record', 'replay', 'geterrorlog', 'stop'.
 *   #param {string} source IP or MAC of the browser, for all commands.
 * @return {webdriver.promise.Promise} resolve({string} commandOutput).
 * @private
 */
WebPageReplay.prototype.scheduleWprCommand_ = function(args) {
  'use strict';
  return this.scheduleIsSupported_().then(function(isSupported) {
    if (!isSupported) {
      throw new Error('WebPageReplay not supported.');
    }
    return process_utils.scheduleExec(this.app_, this.wprCommand_[0],
        this.wprCommand_.slice(1).concat(args)).then(function(stdout) {
      return stdout.trim();
    });
  }.bind(this));
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
    this.scheduleWprCommand_(['stop', this.deviceAddr_]);
  }.bind(this));
};
