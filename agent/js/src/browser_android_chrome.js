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
var video_hdmi = require('video_hdmi');

var DEVTOOLS_SOCKET = 'localabstract:chrome_devtools_remote';
var PAC_PORT = 80;

/**
 * Constructs a Chrome Mobile controller for Android.
 *
 * @param {webdriver.promise.Application} app the Application for scheduling.
 * @param {Object.<string>} args browser options with string values:
 *     runNumber test run number. Install helpers on run 1.
 *     deviceSerial the device to drive.
 *     [chrome] Chrome.apk to install.
 *     [devToolsPort] DevTools port.
 *     [pac] PAC content
 *     [captureDir] capture script dir.
 *     [videoCard] the video card identifier.
 * @constructor
 */
function BrowserAndroidChrome(app, args) {
  'use strict';
  logger.info('BrowserAndroidChrome(%j)', args);
  if (!args.deviceSerial) {
    throw new Error('Missing deviceSerial');
  }
  this.app_ = app;
  this.deviceSerial_ = args.deviceSerial;
  this.shouldInstall_ = (1 === parseInt(args.runNumber || '1', 10));
  this.chrome_ = args.chrome;  // Chrome.apk.
  this.adb_ = new adb.Adb(this.app_, this.deviceSerial_);
  this.chromePackage_ = 'com.google.android.apps.chrome_dev';
  this.chromeActivity_ = 'com.google.android.apps.chrome';
  this.devToolsPort_ = args.devToolsPort;
  this.devtoolsPortLock_ = undefined;
  this.devToolsUrl_ = undefined;
  this.pac_ = args.pac;
  this.pacFile_ = undefined;
  this.pacServer_ = undefined;
  this.videoCard_ = args.videoCard;
  function toDir(s) {
    return (s ? (s[s.length - 1] === '/' ? s : s + '/') : '');
  }
  var captureDir = toDir(args.captureDir);
  this.video_ = new video_hdmi.VideoHdmi(this.app_, captureDir + 'capture');
}
/** Public class. */
exports.BrowserAndroidChrome = BrowserAndroidChrome;

/**
 * Future webdriver impl.
 * TODO: ... implementation with chromedriver2.
 */
BrowserAndroidChrome.prototype.startWdServer = function() { //browserCaps
  'use strict';
  throw new Error('Soon: ' +
      'http://madteam.co/forum/avatars/Android/android-80-domokun.png');
};

/**
 * Launches the browser with about:blank, enables DevTools.
 */
BrowserAndroidChrome.prototype.startBrowser = function() {
  'use strict';
  if (this.shouldInstall_ && this.chrome_) {
    // Explicitly uninstall, as "install -r" fails if the installed package
    // was signed with different keys than the new apk being installed.
    this.adb_.adb(['uninstall', this.chromePackage_]).addErrback(function() {
      logger.debug('Ignoring failed uninstall');
    }.bind(this));
    // Chrome install on an emulator takes a looong time.
    this.adb_.adb(['install', '-r', this.chrome_], {}, /*timeout=*/120000);
  } else {
    // Stop Chrome at the start of each run.
    this.adb_.shell(['am', 'force-stop', this.chromePackage_]);
  }
  this.scheduleStartPacServer_();
  this.scheduleSetStartupFlags_();
  // Delete the prior run's tab(s) and start with "about:blank".
  //
  // If we only set "-d about:blank", Chrome will create a new tab.
  // If we only remove the tab files, Chrome will load the
  //   "Mobile bookmarks" page
  //
  // We also tried a Page.navigate to "data:text/html;charset=utf-8,", which
  // helped but was insufficient by itself.
  this.adb_.shell(['su', '-c',
      'rm /data/data/com.google.android.apps.chrome_dev/files/tab*']);
  var activity = this.chromePackage_ + '/' + this.chromeActivity_ + '.Main';
  this.adb_.shell(['am', 'start', '-n', activity, '-d', 'about:blank']);
  // TODO(wrightt): check start error, use `pm list packages` to check pkg
  this.scheduleSelectDevToolsPort_();
  this.app_.schedule('Forward DevTools socket to local port', function() {
    this.adb_.adb(['forward', 'tcp:' + this.devToolsPort_, DEVTOOLS_SOCKET]);
  }.bind(this));
  this.app_.schedule('Set DevTools URL', function() {
    this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
  }.bind(this));
};

/**
 * Sets the Chrome command-line flags.
 *
 * @private
 */
BrowserAndroidChrome.prototype.scheduleSetStartupFlags_ = function() {
  'use strict';
  var flagsFile = '/data/local/chrome-command-line';
  var flags = [
      '--disable-fre', '--metrics-recording-only', '--enable-remote-debugging'
    ];
  // TODO(wrightt): add flags to disable experimental chrome features, if any
  if (this.pac_) {
    flags.push('--proxy-pac-url=http://127.0.0.1:' + PAC_PORT + '/from_netcat');
    if (PAC_PORT != 80) {
      logger.warn('Non-standard PAC port might not work: ' + PAC_PORT);
      flags.push('--explicitly-allowed-ports=' + PAC_PORT);
    }
  }
  this.adb_.shell(['su', '-c', 'echo \\"chrome ' + flags.join(' ') +
      '\\" > ' + flagsFile]);
};

/**
 * Selects the DevTools port.
 *
 * @private
 */
BrowserAndroidChrome.prototype.scheduleSelectDevToolsPort_ = function() {
  'use strict';
  if (!this.devToolsPort_) {
    process_utils.scheduleAllocatePort(this.app_, 'Select DevTools port').then(
      function(alloc) {
        logger.debug('Selected DevTools port ' + alloc.port);
        this.devtoolsPortLock_ = alloc;
        this.devToolsPort_ = alloc.port;
      }.bind(this));
  }
};

/**
 * Releases the DevTools port.
 *
 * @private
 */
BrowserAndroidChrome.prototype.releaseDevToolsPort_ = function() {
  'use strict';
  if (this.devtoolsPortLock_) {
    this.devToolsPort_ = undefined;
    this.devtoolsPortLock_.release();
    this.devtoolsPortLock_ = undefined;
  }
};

/**
 * Starts the PAC server.
 *
 * @private
 */
BrowserAndroidChrome.prototype.scheduleStartPacServer_ = function() {
  'use strict';
  if (!this.pac_) {
    return;
  }
  // We use netcat to serve the PAC HTTP from on the device:
  //   adb shell ... nc -l PAC_PORT < pacFile
  // Several other options were considered:
  //   1) 'data://' + base64-encoded-pac isn't supported
  //   2) 'file://' + path-on-device isn't supported
  //   3) 'http://' + desktop http.createServer assumes a route from the
  //       device to the desktop, which won't work in general
  //
  // We copy our HTTP response to the device as a "pacFile".  Ideally we'd
  // avoid this temp file, but the following alternatives don't work:
  //   a) `echo RESPONSE | nc -l PAC_PORT` doesn't close the socket
  //   b) `cat <<EOF | nc -l PAC_PORT\nRESPONSE\nEOF` can't create a temp
  //      file; see http://stackoverflow.com/questions/15283220
  //
  // We must use port 80, otherwise Chrome silently blocks the PAC.
  // This can be seen by visiting the proxy URL on the device, which displays:
  //   Error 312 (net::ERR_UNSAFE_PORT): Unknown error.
  //
  // Lastly, to verify that the proxy was set, visit:
  //   chrome://net-internals/proxyservice.config#proxy
  var localPac = this.deviceSerial_ + '.pac_body';
  this.pacFile_ = '/data/local/tmp/pac_body';
  var response = 'HTTP/1.1 200 OK\n' +
      'Content-Length: ' + this.pac_.length + '\n' +
      'Content-Type: application/x-ns-proxy-autoconfig\n' +
      '\n' + this.pac_;
  process_utils.scheduleFunction(this.app_, 'Write local PAC file',
      fs.writeFile, localPac, response);
  this.adb_.adb(['push', localPac, this.pacFile_]);
  process_utils.scheduleFunction(this.app_, 'Remove local PAC file',
      fs.unlink, localPac);
  // Start netcat server
  var args = ['-s', this.deviceSerial_, 'shell', 'su', '-c',
      'while true; do nc -l ' + PAC_PORT + ' < ' + this.pacFile_ + '; done'];
  logger.debug('Starting netcat on device: adb ' + args);
  process_utils.scheduleSpawn(this.app_, 'adb', args).then(function(proc) {
    this.pacServer_ = proc;
    proc.on('exit', function(code) {
      if (this.pacServer_) {
        logger.error('Unexpected pacServer exit: ' + code);
        this.pacServer_ = undefined;
      }
    }.bind(this));
  }.bind(this));
};

/**
 * Stops the PAC server.
 *
 * @private
 */
BrowserAndroidChrome.prototype.stopPacServer_ = function() {
  'use strict';
  if (this.pacServer_) {
    var proc = this.pacServer_;
    this.pacServer_ = undefined;
    process_utils.scheduleKill(this.app_, 'Kill PAC server', proc);
  }
  if (this.pacFile_) {
    var file = this.pacFile_;
    this.pacFile_ = undefined;
    this.adb_.shell(['rm', file]);
  }
};

/**
 * Kills the browser and cleans up.
 */
BrowserAndroidChrome.prototype.kill = function() {
  'use strict';
  this.devToolsUrl_ = undefined;
  this.releaseDevToolsPort_();
  this.stopPacServer_();
  this.adb_.shell(['am', 'force-stop', this.chromePackage_]);
};

/**
 * @return {boolean}
 */
BrowserAndroidChrome.prototype.isRunning = function() {
  'use strict';
  return undefined !== this.devToolsUrl_;
};

/**
 * @return {string} WebDriver URL.
 */
BrowserAndroidChrome.prototype.getServerUrl = function() {
  'use strict';
  return undefined;
};

/**
 * @return {string} DevTools URL.
 */
BrowserAndroidChrome.prototype.getDevToolsUrl = function() {
  'use strict';
  return this.devToolsUrl_;
};

/**
 * @return {Object.<string>} browser capabilities.
 */
BrowserAndroidChrome.prototype.scheduleGetCapabilities = function() {
  'use strict';
  return this.video_.scheduleIsSupported().then(function(isSupported) {
    return {
        webdriver: false,
        'wkrdp.Page.captureScreenshot': false, // TODO(klm): check before-26.
        'wkrdp.Network.clearBrowserCache': true,
        'wkrdp.Network.clearBrowserCookies': true,
        videoRecording: isSupported,
        takeScreenshot: true
      };
  }.bind(this));
};

/**
 * @return {webdriver.promise.Promise} The scheduled promise, where the
 *   resolved value is a Buffer of base64-encoded PNG data.
 */
BrowserAndroidChrome.prototype.scheduleTakeScreenshot = function() {
  'use strict';
  return this.adb_.shell(['screencap', '-p'],
      {encoding: 'binary', maxBuffer: 5000 * 1024}).then(function(binout) {
    // Adb shell incorrectly thinks that the binary PNG stdout is text and
    // mangles it by translating all 0x0a '\n's into 0x0d0a '\r\n's.  For
    // details, see:
    //   http://stackoverflow.com/questions/13578416
    // We use "dos2unix" to un-mangle these 0x0d0a's back into 0x0a's.
    //
    // Another option would be to write the screencap to a remote temp file
    // (e.g. in /mnt/sdcard/) and `adb pull` it to a local temp file.
    return new Buffer(this.adb_.dos2unix(binout), 'base64');
  }.bind(this));
};

/**
 * @param {string} filename The local filename to write to.
 * @param {Function=} onExit Optional exit callback, as noted in video_hdmi.
 */
BrowserAndroidChrome.prototype.scheduleStartVideoRecording = function(
    filename, onExit) {
  'use strict';
  // The video record command needs to know device type for cropping etc.
  this.adb_.shell(['getprop', 'ro.product.device']).then(
      function(stdout) {
    this.video_.scheduleStartVideoRecording(filename, this.deviceSerial_,
        stdout.trim(), this.videoCard_, onExit);
  }.bind(this));
};

/**
 * Stops the video recording.
 */
BrowserAndroidChrome.prototype.scheduleStopVideoRecording = function() {
  'use strict';
  this.video_.scheduleStopVideoRecording();
};
