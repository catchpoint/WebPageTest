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

var adb = require('adb');
var logger = require('logger');
var video_hdmi = require('video_hdmi');

var DEVTOOLS_SOCKET = 'localabstract:chrome_devtools_remote';


/**
 * Represents Chrome Mobile on Android.
 *
 * @param {webdriver.promise.Application} app the Application for scheduling.
 * @param {Number} runNumber test run number. Install helpers on run 1.
 * @param {String} deviceSerial the device to drive.
 * @param {String} [chromedriver] chromedriver binary, or none.
 * @param {String} [chrome] Chrome.apk to install, or none.
 * @param {String} [videoRecordCommand] Command to get HDMI video of the device.
 * @constructor
 */
function BrowserAndroidChrome(app, runNumber, deviceSerial,
    chromedriver, chrome, videoRecordCommand) {
  'use strict';
  logger.info('BrowserAndroidChrome(%s, %s, %s)',
      chromedriver, chrome, deviceSerial);
  this.app_ = app;
  this.runNumber_ = runNumber;
  this.adb_ = new adb.Adb(this.app_, deviceSerial);
  this.chromedriver_ = chromedriver;
  this.chrome_ = chrome;  // Chrome.apk.
  this.chromePackage_ = 'com.google.android.apps.chrome_dev';
  this.chromeActivity_ = 'com.google.android.apps.chrome';
  this.devToolsPort_ = 1234;
  this.devToolsUrl_ = undefined;
  this.video_ = new video_hdmi.VideoHdmi(this.app_, videoRecordCommand);
}
exports.BrowserAndroidChrome = BrowserAndroidChrome;

BrowserAndroidChrome.prototype.startWdServer = function(/*browserCaps*/) {
  'use strict';
  throw new Error('Soon: ' +
      'http://madteam.co/forum/avatars/Android/android-80-domokun.png');
};

BrowserAndroidChrome.prototype.startBrowser = function() {
  'use strict';
  if (this.chrome_ && 1 === this.runNumber_) {
    // Explicitly uninstall, as "install -r" fails if the installed package
    // was signed with different keys than the new apk being installed.
    this.adb_.do(['uninstall', this.chromePackage_]).addErrback(function() {
      logger.debug('Ignoring failed uninstall');
    }.bind(this));
    // Chrome install on an emulator takes a looong time.
    this.adb_.do(['install', '-r', this.chrome_], /*timeout=*/120000);
  }
  var activity = this.chromePackage_ + '/' + this.chromeActivity_ + '.Main';
  this.adb_.shell(['am', 'start', '-n', activity]);
  this.adb_.do(['forward', 'tcp:' + this.devToolsPort_, DEVTOOLS_SOCKET]);
  this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
};

BrowserAndroidChrome.prototype.kill = function() {
  'use strict';
  this.serverUrl_ = undefined;
  this.devToolsUrl_ = undefined;
  this.adb_.shell(['am', 'force-stop', this.chromePackage_]);
};

BrowserAndroidChrome.prototype.isRunning = function() {
  'use strict';
  return undefined !== this.devToolsUrl_;
};

BrowserAndroidChrome.prototype.getServerUrl = function() {
  'use strict';
  return undefined;
};

BrowserAndroidChrome.prototype.getDevToolsUrl = function() {
  'use strict';
  return this.devToolsUrl_;
};

BrowserAndroidChrome.prototype.scheduleGetCapabilities = function() {
  'use strict';
  return this.video_.scheduleIsSupported().then(function(isSupported) {
    return {
        'wkrdp.Page.captureScreenshot': false,  // TODO(klm): check for 26+.
        'wkrdp.Network.clearBrowserCache': true,
        'wkrdp.Network.clearBrowserCookies': true,
        videoRecording: isSupported};
  }.bind(this));
};

BrowserAndroidChrome.prototype.scheduleStartVideoRecording = function(file) {
  'use strict';
  // The video record command needs to know device type for cropping etc.
  return this.adb_.shell(['getprop', 'ro.product.device'])
      .then(function(stdout) {
    this.video_.scheduleStartVideoRecording(file, stdout.trim());
  }.bind(this));
};

BrowserAndroidChrome.prototype.stopVideoRecording = function() {
  'use strict';
  this.video_.stopVideoRecording();
};
