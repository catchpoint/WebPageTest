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

var fs = require('fs');
var logger = require('logger');
var process_utils = require('process_utils');
var webdriver = require('webdriver');

var DEFAULT_CAPTURE_COMMAND = '/data/hdmi/capture';  // TODO(klm): put under lib

function VideoHdmi(app, captureCommand) {
  'use strict';
  this.app_ = app;
  this.captureCommand_ = captureCommand || DEFAULT_CAPTURE_COMMAND;
  this.recordProcess_ = undefined;
  this.isSupported_ = undefined;
}
exports.VideoHdmi = VideoHdmi;

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
        isSupportedPromise.resolve(exists);
      }.bind(this));
      result = isSupportedPromise.promise;
    }
    return result;
  }.bind(this));
};

VideoHdmi.prototype.scheduleKillRunningCapture_ = function() {
  'use strict';
  return process_utils.scheduleExecWithTimeout(
      this.app_,  'killall', ['raw_capture'], 5000, [0, 1]);
};

VideoHdmi.prototype.scheduleStartVideoRecording = function(file, deviceType) {
  'use strict';
  return this.scheduleIsSupported().then(function(isSupported) {
    if (isSupported) {
      if (!this.recordProcess_) {
        this.scheduleKillRunningCapture_();
        var args = ['-f', file];
        if (deviceType) {
          args = args.concat(['-c', '-d', deviceType]);
        }
        process_utils.scheduleSpawn(this.app_, this.captureCommand_, args)
            .then(function(proc) {
          this.recordProcess_ = proc;
          proc.on('exit', function(code, signal) {
            logger.info('Video recording EXIT code %s signal %s', code, signal);
            this.recordProcess_ = undefined;
          }.bind(this));
        }.bind(this));
      } else {
        logger.error('Video record process already running, will not start');
      }
    } else {
      logger.error('Requesting video recording, but ' + this.captureCommand_ +
          ' does not exist');
    }
  }.bind(this));
};

VideoHdmi.prototype.stopVideoRecording = function() {
  'use strict';
  if (this.recordProcess_) {
    logger.info('Killing video recording');
    var proc = this.recordProcess_;
    this.recordProcess_ = undefined;  // Guard against repeat calls.
    process_utils.scheduleExitWaitOrKill(proc, 'video recording', 10000);
    try {
      proc.kill();
      logger.info('Killed video recording');
    } catch(e) {
      logger.error('Cannot kill video recording: %s', e);
    }
  }
};
