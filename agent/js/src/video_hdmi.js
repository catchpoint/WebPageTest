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
var webdriver = require('selenium-webdriver');

/**
 * @param {webdriver.promise.ControlFlow} app the scheduler.
 * @param {string} captureCommand the capture command.
 * @constructor
 */
function VideoHdmi(app, captureCommand) {
  'use strict';
  this.app_ = app;
  this.captureCommand_ = captureCommand;
  this.recordProcess_ = undefined;
  this.isSupported_ = undefined;
}
/** Allow to stub out in tests. */
exports.VideoHdmi = VideoHdmi;

/**
 * @return {webdriver.promise.Promise} fulfill({boolean} isSupported).
 */
VideoHdmi.prototype.scheduleIsSupported = function() {
  'use strict';
  return this.app_.schedule('isSupported', function() {
    var result;
    if (undefined !== this.isSupported_) {
      result = this.isSupported_;
    } else {
      var isSupportedPromise = new webdriver.promise.Deferred();
      fs.exists(this.captureCommand_, function(exists) {
        this.isSupported_ = exists;
        isSupportedPromise.fulfill(exists);
      }.bind(this));
      result = isSupportedPromise.promise;
    }
    return result;
  }.bind(this));
};

/**
 * @param {string} deviceSerial the unique device identifer.
 * @private
 */
VideoHdmi.prototype.scheduleKillRunningCapture_ = function(deviceSerial) {
  'use strict';
  this.scheduleIsSupported().then(function(isSupported) {
    if (!isSupported) {
      throw new Error('!isSupported');
    }
    process_utils.scheduleGetAll(this.app_).then(function(processInfos) {
      processInfos = processInfos.filter(function(pi) {
        return (pi.command === this.captureCommand_ &&
            deviceSerial === (pi.args.indexOf('-s') < 0 ? undefined :
                pi.args[pi.args.indexOf('-s') + 1]));
      }.bind(this));
      process_utils.scheduleKillTrees(this.app_, 'Kill stray', processInfos);
    }.bind(this));
  }.bind(this));
};

/**
 * @param {!string} filename the file to write to.
 * @param {string=} deviceSerial for use by scheduleKillRunningCapture_.
 * @param {string=} deviceType to select the correct screen size and crop.
 * @param {string=} videoCard to select the correct card, if multiple exist.
 * @param {Function=} onExit Function({Error=} err), to listen for the
 *   expected scheduleStopVideoRecording exit or an unexpected exit.
 */
VideoHdmi.prototype.scheduleStartVideoRecording = function(filename,
    deviceSerial, deviceType, videoCard, onExit) {
  'use strict';
  this.scheduleIsSupported().then(function(isSupported) {
    if (!isSupported) {
      throw new Error('!isSupported');
    }
    if (this.recordProcess_) {
      throw new Error('Video recording is already running, will not start');
    }
    var args = ['-f', filename];
    if (deviceSerial) {
      args = args.concat(['-s', deviceSerial]);
    }
    if (deviceType) {
      args = args.concat(['-t', deviceType]);
    }
    if (videoCard) {
      args = args.concat(['-d', videoCard]);
    }
    args = args.concat(['-w']);
    this.scheduleKillRunningCapture_(deviceSerial);
    process_utils.scheduleSpawn(this.app_, this.captureCommand_, args).then(
          function(proc) {
      logger.info('Started video recording to ' + filename);
      this.recordProcess_ = proc;
      proc.on('exit', function(code, signal) {
        var err;
        if (!this.recordProcess_) {
          logger.debug('Normal exit via scheduleStopVideoRecording');
        } else {
          this.recordProcess_ = undefined;
          err = new Error('Unexpected video recording EXIT with code ' + code +
              ' signal ' + signal);
          logger.error(err.message);
        }
        if (onExit) {
          onExit(err);
        }
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

/**
 * Stop video.
 */
VideoHdmi.prototype.scheduleStopVideoRecording = function() {
  'use strict';
  this.app_.schedule('Stop video recording', function() {
    if (!this.recordProcess_) {
      // Either there was an unexpected exit or we never started recording
      logger.debug('Ignoring stop request, video process is not running');
      return;
    }
    logger.info('Stopping video recording');
    var proc = this.recordProcess_;
    this.recordProcess_ = undefined; // Guard against repeat calls.
    process_utils.scheduleKillTree(this.app_, 'Kill video recording', proc);
  }.bind(this));
};
