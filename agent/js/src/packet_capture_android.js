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

var adb = require('adb');
var fs = require('fs');
var logger = require('logger');
var process_utils = require('process_utils');


// Exit timeout for 'adb shell tcpdump' after 'adb shell kill <tcpdump-pid>'.
var EXIT_TIMEOUT = 5000;

// Timeout for tcpdump "listening on IFACE," output.
var LISTENING_ON_TIMEOUT = 5000;

/**
 * @param {webdriver.promise.ControlFlow=} app the scheduler.
 * @param {Object} args options:
 #   #param {Object} flags:
 *     #param {string} deviceSerial  the device to run tcpdump on.
 *     #param {string=} tcpdumpBinary  device-architecture tcpdump binary.
 *         If undefined, try to use tcpdump preinstalled on device.
 * @constructor
 */
function PacketCaptureAndroid(app, args) {
  'use strict';
  this.app_ = app;
  this.deviceSerial_ = args.flags['deviceSerial'];
  this.localTcpdumpBinary_ = args.flags.tcpdumpBinary;
  this.localPcapFile_ = undefined;
  this.deviceTcpdumpCommand_ = undefined;
  this.devicePcapFile_ = undefined;
  this.adb_ = new adb.Adb(this.app_, this.deviceSerial_);
  this.tcpdumpAdbProcess_ = undefined;
}
/** Export class. */
exports.PacketCaptureAndroid = PacketCaptureAndroid;

/**
 * @private
 */
PacketCaptureAndroid.prototype.schedulePrepare_ = function() {
  'use strict';
  this.app_.schedule('isSupported', function() {
    if (this.localTcpdumpBinary_ !== undefined) {
      process_utils.scheduleFunction(this.app_, 'Check local tcpdump',
          fs.exists, this.localTcpdumpBinary_).then(function(exists) {
        if (exists) {
          this.deviceTcpdumpCommand_ = '/data/local/tmp/tcpdump474';
        } else {
          this.localTcpdumpBinary_ = undefined;  // Triggers /system/xbin below.
        }
      }.bind(this));
    }
    this.app_.schedule('Check device tcpdump if needed', function() {
      if (this.localTcpdumpBinary_ === undefined) {
        // See if tcpdump is pre-installed in /system/bin or /system/xbin.
        this.adb_.exists('/system/*bin/tcpdump').then(function(exists) {
          if (exists) {
            this.deviceTcpdumpCommand_ = 'tcpdump';  // In $PATH on device.
          } else {
            throw new Error('Packet capture requested, but tcpdump not found');
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
};

/**
 * Pushes tcpdump to device if 1) local tcpdump specified, 2) not already there.
 * @private
 */
PacketCaptureAndroid.prototype.schedulePushTcpdumpIfNeeded_ = function() {
  'use strict';
  this.app_.schedule('Push tcpdump if needed', function() {
    // Only check localTcpdumpBinary_ in a scheduled function, because
    // shedulePrepare_ may reset it to undefined if it doesn't exist.
    if (this.localTcpdumpBinary_ !== undefined) {
      this.adb_.exists(this.deviceTcpdumpCommand_).then(function(exists) {
        if (!exists) {
          this.adb_.adb(['push',
              this.localTcpdumpBinary_, this.deviceTcpdumpCommand_]);
          // /data/local/tmp needs no su, but chown root and sticky bit do.
          this.adb_.su(['chown', 'root', this.deviceTcpdumpCommand_]);
          this.adb_.su(['chmod', '6755', this.deviceTcpdumpCommand_]);
        }
      }.bind(this));
    }
  }.bind(this));
};

/**
 * Starts packet capture.
 *
 * @param {string} localPcapFile  local file where to copy the pcap result.
 */
PacketCaptureAndroid.prototype.scheduleStart = function(localPcapFile) {
  'use strict';
  this.localPcapFile_ = localPcapFile;
  this.adb_.getStoragePath().then(function(path) {
    this.devicePcapFile_ = path + '/webpagetest.pcap';
  }.bind(this));
  this.schedulePrepare_();
  this.scheduleStop();  // Cleanup possible leftovers.
  this.schedulePushTcpdumpIfNeeded_();
  this.app_.schedule('Start tcpdump', function() {
    logger.debug('Starting tcpdump to %s', this.devicePcapFile_);
    // -p = don't put into promiscuous mode.
    // -s 0 = capture entire packets.
    this.adb_.spawnSu([this.deviceTcpdumpCommand_, '-i', 'any', '-p',
         '-s', '0', '-w', this.devicePcapFile_]).then(function(proc) {
      this.tcpdumpAdbProcess_ = proc;
      var listenBuffer = ''; // Defined until we get our "listening on" line
      var listenRegex = new RegExp('\\n?listening on ');
      proc.stdout.on('data', function(data) {
        logger.info('%s STDOUT: %s', this.deviceTcpdumpCommand_, data);
        if (undefined !== listenBuffer) {
          listenBuffer += data;
          listenBuffer = (listenRegex.test(listenBuffer) ?
              undefined : // Got our "listening on" ack
              listenBuffer.slice(listenBuffer.lastIndexOf('\n') +
                  1)); // We only need to keep the pending line, if any
        }
      }.bind(this));
      proc.on('exit', function(code) {
        if (this.tcpdumpAdbProcess_) {  // We didn't kill it ourselves
          logger.error('Unexpected tcpdump exited, code: ' + code);
          this.tcpdumpAdbProcess_ = undefined;
        }
      }.bind(this));
      return this.app_.wait(function() {
        return (undefined === listenBuffer);
      }, LISTENING_ON_TIMEOUT, 'Waiting for tcpdump');
    }.bind(this));
  }.bind(this));
};

/**
 * Stops packet capture and copies the result to a local file.
 */
PacketCaptureAndroid.prototype.scheduleStop = function() {
  'use strict';
  this.app_.schedule('Stop and clean up tcpdump on device', function() {
    if (this.tcpdumpAdbProcess_) {
      var proc = this.tcpdumpAdbProcess_;
      this.tcpdumpAdbProcess_ = undefined;  // See 'exit' in scheduleStart.
      // Soft-kill all tcpdumps running on device. Presumably just one.
      this.adb_.scheduleKill('tcpdump', 'INT');
      // Read the pcap file only after tcpdump exits: avoid incomplete data.
      process_utils.scheduleWait(this.app_, proc, 'tcpdump', EXIT_TIMEOUT);
      this.adb_.su(['chmod', '777', this.devicePcapFile_]);
      this.adb_.adb(['pull', this.devicePcapFile_, this.localPcapFile_]);
      this.adb_.su(['rm', this.devicePcapFile_]);
    } else {
      // Hard-kill any possible leftover tcpdumps.
      this.adb_.scheduleKill('tcpdump', 'KILL');
    }
  }.bind(this));
};
