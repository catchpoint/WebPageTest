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
var util = require('util');


// Exit timeout for 'adb shell tcpdump' after 'adb shell kill <tcpdump-pid>'.
var EXIT_TIMEOUT = 5000;


/**
 * @param {webdriver.promise.Application=} app the scheduler.
 * @param {Object.<string>} args options with string values:
 *   #param {string} deviceSerial  the device to run tcpdump on.
 *   #param {string=} tcpdumpBinary  device-architecture tcpdump binary.
 *       If undefined, try to use tcpdump preinstalled on device.
 * @constructor
 */
function PacketCaptureAndroid(app, args) {
  'use strict';
  this.app_ = app;
  this.deviceSerial_ = args.deviceSerial;
  this.localTcpdumpBinary_ = args.tcpdumpBinary;
  this.localPcapFile_ = undefined;
  this.deviceTcpdumpCommand_ = undefined;
  this.devicePcapFile_ = '/sdcard/webpagetest.pcap';
  this.adb_ = new adb.Adb(this.app_, this.deviceSerial_);
  this.tcpdumpAdbProcess_ = undefined;
}
/** Export class. */
exports.PacketCaptureAndroid = PacketCaptureAndroid;

/**
 * @return {webdriver.promise.Promise} resolve({boolean} isSupported).
 */
PacketCaptureAndroid.prototype.schedulePrepare_ = function() {
  'use strict';
  return this.app_.schedule('isSupported', function() {
    if (this.localTcpdumpBinary_ !== undefined) {
      process_utils.scheduleFunction(this.app_, 'Check local tcpdump',
          fs.exists, this.localTcpdumpBinary_).then(function(exists) {
        if (exists) {
          this.deviceTcpdumpCommand_ = '/data/local/tmp/tcpdump';
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

PacketCaptureAndroid.prototype.schedulePushTcpdumpIfNeeded_ = function() {
  'use strict';
  this.app_.schedule('Push tcpdump if needed', function() {
    // Only check localTcpdumpBinary_ in a scheduled function, because
    // shedulePrepare_ may reset it to undefined if it doesn't exist.
    if (this.localTcpdumpBinary_ !== undefined) {
      this.adb_.exists(this.deviceTcpdumpCommand_).then(function(exists) {
        if (!exists) {
          this.adb_.adb([
              'push', this.localTcpdumpBinary_, this.deviceTcpdumpCommand_]);
          // /data/local/tmp needs no su, but chown root and sticky bit do.
          this.adb_.shell(['su', '-c',
              'chown root ' + this.deviceTcpdumpCommand_]);
          this.adb_.shell(['su', '-c',
              'chmod 6755 ' + this.deviceTcpdumpCommand_]);
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
  this.schedulePrepare_();
  this.scheduleStop();  // Cleanup possible leftovers.
  this.schedulePushTcpdumpIfNeeded_();
  this.scheduleDetectConnectedInterface_().then(function(iface) {
    // -p = don't put into promiscuous mode.
    // -s 0 = capture entire packets.
    var args = ['-s', this.deviceSerial_, 'shell', 'su', '-c',
      this.deviceTcpdumpCommand_ + ' -i ' + iface + ' -p -s 0 -w ' +
      this.devicePcapFile_];
    logger.debug('Starting tcpdump on device: adb ' + args);
    process_utils.scheduleSpawn(this.app_, this.adb_.adbCommand, args)
        .then(function(proc) {
      this.tcpdumpAdbProcess_ = proc;
      proc.on('exit', function(code) {
        if (this.tcpdumpAdbProcess_) {  // We didn't kill it ourselves
          logger.error('Unexpected tcpdump exited, code: ' + code);
          this.tcpdumpAdbProcess_ = undefined;
        }
      }.bind(this));
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
      this.scheduleKillTcpdumps_('INT');
      // Read the pcap file only after tcpdump exits: avoid incomplete data.
      process_utils.scheduleWait(proc, 'tcpdump', EXIT_TIMEOUT);
      this.adb_.adb(['pull', this.devicePcapFile_, this.localPcapFile_]);
    } else {
      // Hard-kill any possible leftover tcpdumps.
      this.scheduleKillTcpdumps_('KILL');
    }
  }.bind(this));
};

PacketCaptureAndroid.prototype.scheduleKillTcpdumps_ = function(signal) {
  'use strict';
  // Soft-kill all tcpdumps running on device.
  this.adb_.getPidsOfProcess('tcpdump').then(function(pids) {
    pids.forEach(function(pid) {
      this.adb_.shell(['su', '-c', 'kill -' + signal + ' ' + pid]);
    }.bind(this));
  }.bind(this));
};

/**
 * Returns the name of the single currently connected interface, or undefined.
 *
 * Output format:
 * Up to Honeycomb:
 *
 * usb0 UP 192.168.1.67 255.255.255.192 0x00001043
 *
 * IceCreamSandwich+:
 *
 * usb0 UP 192.168.1.68/28 0x00001002 02:00:00:00:00:01
 */
PacketCaptureAndroid.prototype.scheduleDetectConnectedInterface_ = function() {
  'use strict';
  return this.adb_.shell(['netcfg']).then(function(stdout) {
    var connectedInterfaces = [];
    stdout.split(/\r?\n/).forEach(function(line) {
      var fields = line.split(/\s+/);
      if (fields.length !== 5) {
        throw new Error(util.format('netcfg output not recognized: %j', line));
      }
      if (fields[0] !== 'lo' && fields[1] === 'UP' &&
          0 !== fields[2].indexOf('0.0.0.0')) {
        connectedInterfaces.push(fields[0]);
      }
    }.bind(this));
    if (connectedInterfaces.length === 1) {
      return connectedInterfaces[0];
    }
    if (connectedInterfaces.length === 0) {
      throw new Error(util.format(
          'Cannot find a connected interface, netcfg output: %j', stdout));
    }
    throw new Error(util.format(
        'More than one connected interface detected: %j, netcfg output: %j',
        connectedInterfaces, stdout));
  }.bind(this));
};
