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
var browser_base = require('browser_base');
var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var logger = require('logger');
var packet_capture_android = require('packet_capture_android');
var path = require('path');
var process_utils = require('process_utils');
var util = require('util');
var webdriver = require('selenium-webdriver');
var webdriver_proxy = require('selenium-webdriver/proxy');

var DEVTOOLS_SOCKET = 'localabstract:chrome_devtools_remote';
var PAC_PORT = 80;

var CHROME_FLAGS = [
    // Standard command-line flags
    '--no-first-run', '--disable-background-networking',
    '--no-default-browser-check', '--process-per-tab',
    '--allow-running-insecure-content',
    // Stabilize Chrome performance.
    '--disable-fre', '--enable-benchmarking', '--metrics-recording-only',
    // Suppress location JS API to avoid a location prompt obscuring the page.
    '--disable-geolocation',
    // Disable external URL handlers from opening
    '--disable-external-intent-requests',
    // Disable UI bars (location, debugging, etc)
    '--disable-infobars',
    // Disable the save password dialog
    '--disable-save-password-bubble',
    "--disable-background-downloads",
    "--disable-add-to-shelf",
    "--disable-client-side-phishing-detection",
    "--disable-datasaver-prompt",
    "--disable-default-apps",
    "--disable-domain-reliability",
    "--safebrowsing-disable-auto-update"
  ];

var KNOWN_BROWSERS = {
    'Chrome': 'com.android.chrome',
    'Chrome Beta': 'com.chrome.beta',
    'Chrome Canary': 'com.chrome.canary',
    'Chrome Dev': 'com.chrome.dev',
    'Chrome Stable': 'com.android.chrome',
    // TODO(wrightt): map version to installed package!
    'Chrome 35': 'com.google.android.apps.chrome_dev',
    'Chrome 36': 'com.chrome.canary',
    'Chrome 37': 'com.android.chrome',
    'Chrome 38': 'com.chrome.beta'
  };

// Browsers that we can only test by firing navigation intents
var BLACK_BOX_BROWSERS = {
    'UC Mini': {
      'package': 'com.uc.browser.en', 
      'activity': 'com.uc.browser.ActivityBrowser',
      'relaunch': true,
      'clearProfile': true,
      'videoFlags': ['--findstart', 25, '--notification'],
      'startupDelay': 4000
    },
    'UC Browser': {
      'package': 'com.UCMobile.intl',
      'activity': 'com.UCMobile.main.UCMobile',
      'clearProfile' : true,
      'videoFlags': ['--findstart', 25, '--notification'],
      'startupDelay': 10000
    },
    'Opera Mini': {
      'package': 'com.opera.mini.native',
      'activity': 'com.opera.mini.android.Browser',
      'videoFlags': ['--findstart', 75, '--notification', '--renderignore', 40,
                     '--forceblank'],
      'directories': ['cache', 'databases', 'files', 'app_opera', 'app_webview'],
      'startupDelay': 10000
    },
  };

var LAST_INSTALL_FILE = 'lastInstall.txt';


/**
 * Constructs a Chrome Mobile controller for Android.
 *
 * @param {webdriver.promise.ControlFlow} app the ControlFlow for scheduling.
 * @param {Object} args browser options:
 *   #param {string} runNumber test run number. Install the apk on run 1.
 *   #param {string=} runTempDir the directory to store per-run files like
 *       screenshots, defaults to ''.
 *   #param {boolean} isCacheWarm true for repeat view, false for first view.
 *       Determines if browser cache should be cleared.
 *   #param {Object.<string>} flags options:
 *      #param {string} deviceSerial the device to drive.
 *      #param {string=} captureDir capture script dir, defaults to ''.
 *      #param {string=} checknet 'yes' to enable isReady network check.
 *      #param {string=} chrome Chrome.apk to install, defaults to None.
 *      #param {string=} chromeActivity activity without the '.Main' suffix,
 *           defaults to 'com.google.android.apps.chrome'.
 *      #param {string=} chromePackage package, defaults task.browser-based
 *          package if set, else 'com.android.google'.
 *      #param {string=} devToolsPort DevTools port, defaults to dynamic
 *           selection.
 *      #param {string=} maxtemp maximum isReady temperature.
 *      #param {string=} videoCard the video card identifier, defaults to None.
 *   #param {Object.<string>} task options:
       #param {string=} addCmdLine additional chrome command-line flags.
 *     #param {string=} browser browser name, defaults to 'Chrome'.
 *     #param {string=} pac PAC content, defaults to None.
 * @constructor
 */
function BrowserAndroidChrome(app, args) {
  'use strict';
  browser_base.BrowserBase.call(this, app);
  logger.info('BrowserAndroidChrome(%j)', args);
  this.deviceSerial_ = args.flags['deviceSerial'];
  this.workDir_ = args.workDir || '';
  var lastInstall = undefined;
  this.device_status_file_ = 'device_status_' + this.deviceSerial_ + '.json';
  try {
    lastInstall = fs.readFileSync(path.join(this.workDir_, LAST_INSTALL_FILE));
  } catch(e) {}
  this.apk_packages_ = args.task['apk_info'] ? args.task.apk_info['packages'] : undefined;
  this.shouldUninstall_ = true;
  this.shouldInstall_ =
      args.customBrowser && (args.customBrowser != lastInstall);
  if (this.shouldInstall_)
    logger.debug('Browser install for "' + args.customBrowser +
        '" needed.  Last install: "' + lastInstall + '"');
  this.chrome_ = args.customBrowser || args.flags.chrome;  // Chrome.apk.
  this.chromedriver_ = args.flags.chromedriver;
  this.supportsTracing = true;
  this.isBlackBox = false;
  this.videoFlags = undefined;
  if (args.flags.chromePackage) {
    this.browserPackage_ = args.flags.chromePackage;
  } else if (args.task.browser) {
    var browserName = args.task.browser;
    var separator = browserName.lastIndexOf('-');
    if (separator >= 0) {
      browserName = browserName.substr(separator + 1).trim();
    }
    this.browserPackage_ = KNOWN_BROWSERS[browserName];
    if (!this.browserPackage_ && BLACK_BOX_BROWSERS[browserName] != undefined) {
      this.browserPackage_ = BLACK_BOX_BROWSERS[browserName].package;
      this.browserActivity_ = BLACK_BOX_BROWSERS[browserName].activity;
      this.blank_page_ = args.flags.blankPage ||
                         'http://www.webpagetest.org/blank.html';
      this.isBlackBox = true;
      this.supportsTracing = false;
      this.browserConfig_ = BLACK_BOX_BROWSERS[browserName];
      if (BLACK_BOX_BROWSERS[browserName]['videoFlags'] != undefined)
        this.videoFlags = BLACK_BOX_BROWSERS[browserName].videoFlags;
    }
  }
  this.blank_page_ = this.blank_page_ || 'about:blank';
  this.browserPackage_ = args.task.customBrowser_package ||
      args.chromePackage_ || this.browserPackage_ || 'com.android.chrome';
  this.browserActivity_ = args.task.customBrowser_activity ||
      args.chromeActivity || this.browserActivity_ ||
      'com.google.android.apps.chrome.Main';
  this.flagsFile_ = args.task.customBrowser_flagsFile ||
      args.flagsFile || '/data/local/chrome-command-line';
  this.devToolsPort_ = args.flags.devToolsPort;
  this.devToolsSocket_ = args.task.customBrowser_socket ||
      args.devToolsSocket || DEVTOOLS_SOCKET;
  this.devtoolsPortLock_ = undefined;
  this.devToolsUrl_ = undefined;
  this.hostsFile_ = args.task.hostsFile;
  this.serverPort_ = args.flags.serverPort;
  this.serverPortLock_ = undefined;
  this.serverUrl_ = undefined;
  this.pac_ = args.task.pac;
  this.pacFile_ = undefined;
  this.maxTemp = args.flags.maxtemp ? parseFloat(args.flags.maxtemp) : 0;
  this.checkNet = 'yes' === args.flags.checknet;
  this.useRndis = this.checkNet && 'yes' === args.flags.useRndis;
  this.rndis444 = args.flags['rndis444'] ? args.flags.rndis444 : undefined;
  this.deviceVideoPath_ = undefined;
  this.recordProcess_ = undefined;
  function toDir(s) {
    return (s ? (s[s.length - 1] === '/' ? s : s + '/') : '');
  }
  var captureDir = toDir(args.flags.captureDir);
  this.adb_ = new adb.Adb(this.app_, this.deviceSerial_);
  this.videoFile_ = undefined;
  this.pcap_ = new packet_capture_android.PacketCaptureAndroid(this.app_, args);
  this.runTempDir_ = args.runTempDir || '';
  this.useXvfb_ = undefined;
  this.chromeFlags_ = CHROME_FLAGS.slice();
  this.additionalFlags_ = args.task.addCmdLine;
  if (args.task.ignoreSSL) {
    this.chromeFlags_.push('--ignore-certificate-errors');
  }
  this.isCacheWarm_ = args.isCacheWarm;
  this.remoteNetlog_ = undefined;
  this.netlogEnabled_ = args.task['netlog'] ? true : false;
  this.lastVideoSize_ = 0;
  this.videoStarted_ = false;
  this.videoIdleCount_ = 0;
}
util.inherits(BrowserAndroidChrome, browser_base.BrowserBase);
/** Public class. */
exports.BrowserAndroidChrome = BrowserAndroidChrome;

/**
 * Start chromedriver, 2.x required.
 *
 * @param {Object} browserCaps capabilities to be passed to Builder.build():
 *    #param {string} browserName must be 'chrome'.
 */
BrowserAndroidChrome.prototype.startWdServer = function(browserCaps) {
  'use strict';
  if (!this.chromedriver_) {
    throw new Error('Must set chromedriver before starting it');
  }
  browserCaps[webdriver.Capability.BROWSER_NAME] = webdriver.Browser.CHROME;
  browserCaps.chromeOptions = {
    args: this.chromeFlags_.slice(),  // FIXME(wrightt): additionalFlags_
    androidPackage: this.browserPackage_,
    androidDeviceSerial: this.deviceSerial_
  };
  if (this.pac_) {
    if (PAC_PORT !== 80) {
      logger.warn('Non-standard PAC port might not work: ' + PAC_PORT);
      browserCaps.chromeOptions.args.push(
          '--explicitly-allowed-ports=' + PAC_PORT);
    }
    browserCaps[webdriver.Capability.PROXY] = webdriver_proxy.pac(
        'http://127.0.0.1:' + PAC_PORT + '/from_netcat');
  }
  this.kill();
  this.scheduleConfigureHostsFile_();
  this.scheduleDownloadApkIfNeeded_();
  this.scheduleInstallIfNeeded_();
  this.scheduleConfigureServerPort_();
  // Must be scheduled, since serverPort_ is assigned in a scheduled function.
  this.scheduleNeedsXvfb_().then(function(useXvfb) {
    var cmd = this.chromedriver_;
    var args = ['-port=' + this.serverPort_];
    if (logger.isLogging('extra')) {
      args.push('--verbose');
    }
    if (useXvfb) {
      // Use a fake X display, otherwise a scripted "sendKeys" fails with:
      //   an X display is required for keycode conversions, consider using Xvfb
      // TODO(wrightt) submit a crbug; Android shouldn't use the host's keymap!
      args.splice(0, 0, '-a', cmd);
      cmd = 'xvfb-run';
    }
    this.startChildProcess(cmd, args, 'WD server');
    // Make sure we set serverUrl_ only after the child process start success.
    this.app_.schedule('Set DevTools URL', function() {
      this.serverUrl_ = 'http://localhost:' + this.serverPort_;
    }.bind(this));
  }.bind(this));
};

/**
 *  Do infrequent device cleanup operations (clear downloads, pdf viewer, etc)
 */
BrowserAndroidChrome.prototype.deviceCleanup = function() {
  this.clearDownloads_();
  this.clearNotifications_();
  this.clearKnownApps_();
}

/**
 * Launches the browser to a blank page, enables DevTools.
 */
BrowserAndroidChrome.prototype.startBrowser = function() {
  'use strict';
  // Stop Chrome at the start of each run.
  // TODO(wrightt): could keep the devToolsPort up
  this.kill();
  this.scheduleConfigureHostsFile_();
  this.scheduleDownloadApkIfNeeded_();
  this.scheduleInstallIfNeeded_();
  this.scheduleSetStartupFlags_();
  this.clearProfile_();

  // Flush the DNS cache
  this.adb_.su(['ndc', 'resolver', 'flushdefaultif']);

  // Start the browser
  this.navigateTo(this.blank_page_);
  if (this.isBlackBox) {
    if (this.browserConfig_['relaunch']) {
      // Get around first-launch UI
      this.app_.timeout(1000, 'Wait for first browser startup');
      this.kill();
      this.navigateTo(this.blank_page_);
    }
    this.app_.timeout(this.browserConfig_['startupDelay'], 'Wait for browser startup');
  }

  this.scheduleConfigureDevToolsPort_();
};

BrowserAndroidChrome.prototype.navigateTo = function(url) {
  'use strict';
  this.app_.schedule('Navigate', function() {
    var activity = this.browserPackage_ + '/' + this.browserActivity_;
    this.adb_.shell(['am', 'start', '-n', activity,
        '-a', 'android.intent.action.VIEW', '-d', url]);
  }.bind(this));
};


/**
 * Callback when the child chromedriver process exits.
 * @override
 */
BrowserAndroidChrome.prototype.onChildProcessExit = function() {
  'use strict';
  logger.info('chromedriver exited, resetting WD server URL');
  this.serverUrl_ = undefined;
};

/**
 * Clears the profile directory to reset state.  When the caller expects a
 * cold cache we completely delete the profile.  In all cases we remove the list
 * of existing tabs.
 * @private
 */
BrowserAndroidChrome.prototype.clearProfile_ = function() {
  'use strict';
  if (this.isBlackBox) {
    if (!this.isCacheWarm_) {
      if (this.browserConfig_['clearProfile']) {
        // Nuke all of the application data
        this.adb_.shell(['pm', 'clear', this.browserPackage_]);
      } else if (this.browserConfig_['directories']) {
        // Just clear out the cache directories
        for (var i = 0; i < this.browserConfig_.directories.length; i++) {
          this.adb_.su(['rm', '-r', '/data/data/' + this.browserPackage_ +
                       '/' + this.browserConfig_.directories[i]]);
        }
      }
    }
  } else {
    if (this.isCacheWarm_) {
      this.adb_.su(['rm', '-r', '/data/data/' + this.browserPackage_ +
                   '/app_tabs']);
    } else {
      // Delete everything except the lib directory
      this.adb_.su(['ls', '/data/data/' + this.browserPackage_]).then(
          function(files) {
        var lines = files.split('\n');
        var count = lines.length;
        var directories = '';
        for (var i = 0; i < count; i++) {
          var file = lines[i].trim();
          if (file.length && file !== '.' && file !== '..' &&
              file !== 'lib' && file !== 'shared_prefs') {
            directories += ' /data/data/' + this.browserPackage_ + '/' + file;
          }
        }
        if (directories.length)
          this.adb_.su(['rm', '-r ' + directories]);
      }.bind(this));
    }
  }
};

BrowserAndroidChrome.prototype.clearDownloads_ = function() {
  this.app_.schedule('Clear Downloads', function() {
    this.adb_.getStoragePath().then(function(storagePath) {
      this.adb_.shell(['rm', '/sdcard/Download/*', storagePath + '/Download/*']);
      this.adb_.su(['rm', '/data/media/0/Download/*']);
      // UC Browser backup data
      this.adb_.shell(['rm', '-rf', '/sdcard/Backucup', storagePath + '/Backucup',
                       '/sdcard/UCDownloads', storagePath + '/UCDownloads']);
      this.adb_.su(['rm', '-rf', '/data/media/0/Backucup', '/data/media/0/UCDownloads']);
    }.bind(this));
  }.bind(this));
};

BrowserAndroidChrome.prototype.clearNotifications_ = function() {
  this.app_.schedule('Clear Notifications', function() {
    this.adb_.su(['service', 'call', 'notification', '1']);
  }.bind(this));
};

BrowserAndroidChrome.prototype.clearKnownApps_ = function() {
  this.app_.schedule('Clear Known Apps', function() {
    // Motorola update notification
    this.adb_.shell(['am', 'force-stop', 'com.motorola.ccc.ota']);
    // Google docs pdf viewer
    this.adb_.shell(['am', 'force-stop', 'com.google.android.apps.docs']);
  }.bind(this));
};

/**
 * Configures /etc/hosts to match the desired hosts file (for content
 * blocking, SPOF testing or DNS override).
 * @private
 */
BrowserAndroidChrome.prototype.scheduleConfigureHostsFile_ = function() {
  this.app_.schedule('Configure hosts file', function() {
    if (this.hostsFile_ !== undefined && this.hostsFile_.length) {
      this.adb_.shell(['cat', '/etc/hosts']).then(
          function(stdout) {
        if (stdout.trim() != this.hostsFile_.trim()) {
          logger.debug("Rewriting /etc/hosts");
          logger.debug("Current hosts file: " + stdout);
          logger.debug("New hosts file: " + this.hostsFile_);
          var localHostsFile = path.join(this.runTempDir_, 'wpt_hosts');
          try {fs.unlinkSync(localHostsFile);} catch(e) {}
          process_utils.scheduleFunction(this.app_, 'Write local hosts file',
              fs.writeFile, localHostsFile, this.hostsFile_);
          this.adb_.getStoragePath().then(function(storagePath) {
            var tempHostsFile = storagePath + '/wpt_hosts';
            this.adb_.adb(['push', localHostsFile, tempHostsFile]);
            this.adb_.su(['chown', 'root:root', tempHostsFile]);
            this.adb_.su(['chmod', '644', tempHostsFile]);
            this.adb_.su(['mount', '-o', 'rw,remount', '/system']);
            this.adb_.su(['cp', tempHostsFile, '/etc/hosts']);
            this.adb_.su(['mount', '-o', 'ro,remount', '/system']);
            this.adb_.su(['rm', tempHostsFile]);
          }.bind(this));
        }
      }.bind(this));
    }
  }.bind(this));
};

BrowserAndroidChrome.prototype.scheduleHttpDownload_ = function(url, local_file, md5Hash) {
  logger.debug('Downloading ' + url + ' to ' + local_file);
  var done = new webdriver.promise.Deferred();
  var active = true;
  var md5 = crypto.createHash('md5');
  var file = fs.createWriteStream(local_file);
  var onError = function(e) {
    if (active) {
      active = false;
      file.end();
      logger.warn('Failed to download ' + url);
      done.fulfill(false);
    }
  }.bind(this);
  var onDone = function() {
    if (active) {
      active = false;
      file.end();
      var md5hex = md5.digest('hex').toUpperCase();
      logger.debug('Finished download - md5: ' + md5hex);
      done.fulfill(md5hex == md5Hash.toUpperCase());
    }
  }.bind(this);
  var request = http.get(url, function(response) {
    response.pipe(file);
    response.on('data', function(chunk) {md5.update(chunk);}.bind(this));
    response.on('error', onError);
    response.on('end', onDone);
    response.on('close', onDone);
  }.bind(this));
  request.on('error', onError);
  request.end();
  return done.promise;
}

/**
 * Downloads the apk for the requested package and sets up install if needed.
 * This is not for custom browsers but for auto-updating the play-store
 * installed ones.
 */
BrowserAndroidChrome.prototype.scheduleDownloadApkIfNeeded_ = function() {
  this.app_.schedule('Download APK if needed', function() {
    if (this.apk_packages_ &&
        this.browserPackage_ &&
        this.apk_packages_[this.browserPackage_] &&
        this.apk_packages_[this.browserPackage_]['md5'] &&
        this.apk_packages_[this.browserPackage_]['apk_url']) {
      var status = {};
      try {
        status = JSON.parse(fs.readFileSync(this.device_status_file_, "utf8"))
      } catch(e) {}
      if (status['apk'] == undefined ||
          status.apk[this.browserPackage_] == undefined ||
          status.apk[this.browserPackage_]['md5'] !== this.apk_packages_[this.browserPackage_]['md5']) {
        logger.debug('APK Update available for ' + this.browserPackage_ + ' md5: ' + this.apk_packages_[this.browserPackage_]['md5'].toUpperCase());
        var local_file = path.join(this.workDir_, 'browser.apk');
        try {fs.unlinkSync(local_file);} catch(e) {}
        this.download_complete_ = false;
        this.download_ok_ = false;
        this.scheduleHttpDownload_(this.apk_packages_[this.browserPackage_]['apk_url'], local_file, this.apk_packages_[this.browserPackage_]['md5']).then(function(ok) {
          this.download_ok_ = ok;
          this.download_complete_ = true;
        }.bind(this));
        this.app_.wait(function() {return this.download_complete_;}.bind(this), 600000);
        this.app_.schedule('Install', function() {
          if (this.download_ok_) {
            // install the apk
            this.adb_.adb(['install', '-rg', local_file], {}, 120000).addBoth(function() {
              logger.debug('Install complete');
              if (status['apk'] == undefined)
                status.apk = {};
              if (status.apk[this.browserPackage_] == undefined)
                status.apk[this.browserPackage_] = {};
              status.apk[this.browserPackage_]['md5'] = this.apk_packages_[this.browserPackage_]['md5'];
              fs.writeFileSync(this.device_status_file_, JSON.stringify(status));
            }.bind(this));
          }
        }.bind(this));

        // Make sure not to leave the downloaded apk around
        this.app_.schedule('Download cleanup', function() {
          try {fs.unlinkSync(local_file);} catch(e) {}
        }.bind(this));
      }
    }
  }.bind(this));
};

/**
 * Installs Chrome apk if this is the first run, and the apk was provided.
 * @private
 */
BrowserAndroidChrome.prototype.scheduleInstallIfNeeded_ = function() {
  'use strict';
  if (this.shouldInstall_ && this.chrome_) {
    // Explicitly uninstall, as "install -r" fails if the installed package
    // was signed differently than the new apk being installed.
    if (this.shouldUninstall_) {
      this.adb_.adb(['uninstall', this.browserPackage_]).addErrback(function() {
        logger.debug('Ignoring failed uninstall');
      }.bind(this));
    }
    // Delete ALL of the existing app data for the package before installing
    this.adb_.su(['rm', '-rf', '/data/data/' + this.browserPackage_]);
    // Chrome install on an emulator takes a looong time.
    this.adb_.adb(['install', '-r', this.chrome_], {}, /*timeout=*/120000);
    fs.writeFileSync(path.join(this.workDir_, LAST_INSTALL_FILE), this.chrome_);
  }
  // TODO(wrightt): use `pm list packages` to check pkg
};

/**
 * Test if we have a host-side display.
 *
 * @return {webdriver.promise.Promise} resolve({boolean} useXvfb).
 * @private
 */
BrowserAndroidChrome.prototype.scheduleNeedsXvfb_ = function() {
  'use strict';
  if (undefined === this.useXvfb_) {
    if (process.platform !== 'linux') {
      this.useXvfb_ = false;
    } else {
      process_utils.scheduleExec(this.app_, 'xset', ['q']).then(
          function() {
        this.useXvfb_ = false;
      }.bind(this), function(e) {
        this.useXvfb_ = true;
        if (!(/unable to open|no such file/i).test(e.message)) {
          throw e;
        }
      }.bind(this));
    }
  }
  return this.app_.schedule('needsXvfb', function() {
    return this.useXvfb_;
  }.bind(this));
};

/**
 * Sets the Chrome command-line flags.
 *
 * @private
 */
BrowserAndroidChrome.prototype.scheduleSetStartupFlags_ = function() {
  'use strict';
  this.app_.schedule('Configure startup flags', function() {
    if (!this.isBlackBox) {
      var flags = this.chromeFlags_.concat('--enable-remote-debugging');
      if (this.pac_) {
        flags.push('--proxy-pac-url=http://127.0.0.1:' + PAC_PORT + '/from_netcat');
        if (PAC_PORT !== 80) {
          logger.warn('Non-standard PAC port might not work: ' + PAC_PORT);
          flags.push('--explicitly-allowed-ports=' + PAC_PORT);
        }
      }
      var localFlagsFile = path.join(this.runTempDir_, 'wpt_chrome_command_line');
      try {fs.unlinkSync(localFlagsFile);} catch(e) {}
      var flagsString = 'chrome ' + flags.join(' ');
      if (this.additionalFlags_) {
        flagsString += ' ' + this.additionalFlags_;
      }
      this.adb_.getStoragePath().then(function(storagePath) {
        if (this.netlogEnabled_) {
          this.remoteNetlog_ = '/sdcard/netlog.txt';
          this.adb_.shell(['rm', this.remoteNetlog_]);
          flagsString +=' --log-net-log=' + this.remoteNetlog_;
        }
        logger.debug("Chrome command line: " + flagsString);
        fs.writeFileSync(localFlagsFile, flagsString);
        var tempFlagsFile = storagePath + '/wpt_chrome_command_line';
        this.adb_.adb(['push', localFlagsFile, tempFlagsFile]);
        this.adb_.su(['cp', tempFlagsFile, this.flagsFile_]);
        this.adb_.shell(['rm', tempFlagsFile]);
        this.adb_.su(['chmod', '666', this.flagsFile_]);
      }.bind(this));
    }
  }.bind(this));
};

/**
 * Selects the chromedriver port.
 *
 * @private
 */
BrowserAndroidChrome.prototype.scheduleConfigureServerPort_ = function() {
  'use strict';
  this.app_.schedule('Configure WD port', function() {
    if (this.serverPort_ || this.isBlackBox) {
      return;
    }
    process_utils.scheduleAllocatePort(this.app_, 'Select WD port').then(
        function(alloc) {
      logger.debug('Selected WD port ' + alloc.port);
      this.serverPortLock_ = alloc;
      this.serverPort_ = alloc.port;
    }.bind(this));
  }.bind(this));
};

/**
 * Releases the DevTools port.
 *
 * @private
 */
BrowserAndroidChrome.prototype.releaseServerPortIfNeeded_ = function() {
  'use strict';
  if (this.serverPortLock_) {
    logger.debug('Releasing WD port ' + this.serverPort_);
    this.serverPort_ = undefined;
    this.serverPortLock_.release();
    this.serverPortLock_ = undefined;
  }
};

/**
 * Selects the DevTools port.
 *
 * @private
 */
BrowserAndroidChrome.prototype.scheduleConfigureDevToolsPort_ = function() {
  'use strict';
  this.app_.schedule('Configure DevTools port', function() {
    if (!this.isBlackBox) {
      if (!this.devToolsPort_) {
        process_utils.scheduleAllocatePort(this.app_, 'Select DevTools port')
            .then(function(alloc) {
          logger.debug('Selected DevTools port ' + alloc.port);
          this.devtoolsPortLock_ = alloc;
          this.devToolsPort_ = alloc.port;
        }.bind(this));
      }
      // The following must be done even if devToolsPort_ is fixed, not allocated.
      if (!this.devToolsUrl_) {
        // The adb call must be scheduled, because devToolsPort_ is only assigned
        // when the above scheduled port allocation completes.
        this.app_.schedule('Forward DevTools socket to local port', function() {
          // TODO(wrightt): if below `adb --help` lacks '--remove', reuse the
          // existing `adb forward` process if it already exists.
          this.adb_.adb(
              ['forward', 'tcp:' + this.devToolsPort_, this.devToolsSocket_]);
        }.bind(this));
        // Make sure we set devToolsUrl_ only after the adb forward succeeds.
        this.app_.schedule('Set DevTools URL', function() {
          this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
        }.bind(this));
      }
    }
  }.bind(this));
};

/**
 * Releases the DevTools port.
 *
 * @private
 */
BrowserAndroidChrome.prototype.releaseDevToolsPortIfNeeded_ = function() {
  'use strict';
  if (this.devtoolsPortLock_) {
    logger.debug('Releasing DevTools port ' + this.devToolsPort_);
    var devToolsPort = this.devToolsPort_;
    this.devToolsPort_ = undefined;
    this.devtoolsPortLock_.release();
    this.devtoolsPortLock_ = undefined;
    this.adb_.adb(['forward', '--remove', 'tcp:' + devToolsPort]).addErrback(
        function(e) {
      // Log a warning.  '--remove' is a relatively new adb feature, so we'll
      // test if it's supported by running `adb -s <serial> --help` and
      // grepping the stderr usage for this command.
      //
      // Ideally we'd use `adb -s <serial> help`, which returns 0 instead of 1,
      // but 'help' still prints to stderr and our exec only supports stdout.
      this.adb_.adb(['--help']).addBoth(function(e2) {
        var isSupported = (e2 && (/adb\s+forward\s+--remove/).test(e2.stderr));
        logger.warn('Unable to release adb port ' + devToolsPort + ': ' +
            (isSupported ? e.stderr :
             'Your version of adb lacks "forward --remove" support?'));
      }.bind(this));
    }.bind(this));
  }
};

/**
 * Kills the browser and cleans up.
 */
BrowserAndroidChrome.prototype.kill = function() {
  'use strict';
  this.killChildProcessIfNeeded();
  this.devToolsUrl_ = undefined;
  this.serverUrl_ = undefined;
  this.releaseDevToolsPortIfNeeded_();
  this.releaseServerPortIfNeeded_();
  this.adb_.scheduleForceStopMatchingPackages(/^\S*\.chrome[^:]*$/);
  this.adb_.shell(['am', 'force-stop', this.browserPackage_]);
  this.adb_.scheduleDismissSystemDialog();
};

/**
 * @return {boolean}
 * @override
 */
BrowserAndroidChrome.prototype.isRunning = function() {
  'use strict';
  return browser_base.BrowserBase.prototype.isRunning.call(this) ||
      !!this.devToolsUrl_ || !!this.serverUrl_;
};

/**
 * @return {string} WebDriver URL.
 * @override
 */
BrowserAndroidChrome.prototype.getServerUrl = function() {
  'use strict';
  return this.serverUrl_;
};

/**
 * @return {string} DevTools URL.
 * @override
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
  return this.adb_.shell(['getprop', 'ro.build.version.release']).then(
      function(stdout) {
    return {
      webdriver: false,
      'wkrdp.Page.captureScreenshot': false,
      'wkrdp.Network.clearBrowserCache': true,
      'wkrdp.Network.clearBrowserCookies': true,
      videoRecording: parseFloat(stdout) >= 4.4,
      videoFileExtension: 'mp4',
      takeScreenshot: true
    };
  }.bind(this));
};

/**
 * @param {string} fileNameNoExt filename without the '.png' suffix.
 * @return {webdriver.promise.Promise} resolve(diskPath) of the written file.
 */
BrowserAndroidChrome.prototype.scheduleTakeScreenshot =
    function(fileNameNoExt) {
  'use strict';
  return this.adb_.getStoragePath().then(function(storagePath) {
    var localPath = path.join(this.runTempDir_, fileNameNoExt + '.png');
    var devicePath = storagePath + '/wpt_screenshot.png';
    this.adb_.shell(['screencap', '-p', devicePath]);
    return this.adb_.adb(['pull', devicePath, localPath]).then(function() {
      return localPath;
    }.bind(this));
  }.bind(this));
};

/**
 * @param {string} filename The local filename to write to.
 * @param {Function=} onExit Optional exit callback.
 */
BrowserAndroidChrome.prototype.scheduleStartVideoRecording = function(
    filename) {
  'use strict';
  this.adb_.getStoragePath().then(function(storagePath) {
    this.deviceVideoPath_ = storagePath + '/wpt_video.mp4';
    this.videoFile_ = filename;
    this.adb_.shell(['rm', this.deviceVideoPath_]);
    this.adb_.spawnShell(['screenrecord', '--verbose',
                          '--bit-rate', 8000000,
                          this.deviceVideoPath_]).then(function(proc) {
      this.recordProcess_ = proc;
      proc.on('exit', function(code, signal) {
        if (!this.recordProcess_) {
          logger.debug('Normal exit via scheduleStopVideoRecording');
        } else {
          logger.debug('Unexpected video recording EXIT with code ' +
              code + ' signal ' + signal);
        }
        this.recordProcess_ = undefined;
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

/**
 * Stops the video recording.
 */
BrowserAndroidChrome.prototype.scheduleStopVideoRecording = function() {
  'use strict';
  if (this.deviceVideoPath_ && this.videoFile_) {
    if (this.recordProcess_) {
      try {
        var recordProcess = this.recordProcess_;
        this.recordProcess_ = undefined;
        this.adb_.scheduleKill('screenrecord');
        this.app_.schedule('screenrecord kill issued', function() {
          process_utils.scheduleWait(this.app_, recordProcess,
              'screenrecord', 30000);
        }.bind(this));
      } catch(e) {}
    }
    this.adb_.adb(['pull', this.deviceVideoPath_, this.videoFile_]);
  }
};

/**
 * Starts packet capture.
 *
 * @param {string} filename  local file where to copy the pcap result.
 */
BrowserAndroidChrome.prototype.scheduleStartPacketCapture = function(filename) {
  'use strict';
  this.pcap_.scheduleStart(filename);
};

/**
 * Stops packet capture and copies the result to a local file.
 */
BrowserAndroidChrome.prototype.scheduleStopPacketCapture = function() {
  'use strict';
  this.pcap_.scheduleStop();
};

/**
 * Pull the netlog from the remote device.
 *
 * @return {webdriver.promise.Promise} resolve() for addErrback.
 * @override
 */
BrowserAndroidChrome.prototype.scheduleGetNetlog = function(localNetlog) {
  'use strict';
  logger.debug("scheduleGetNetlog - " + this.remoteNetlog_ + ' to ' + localNetlog);
  if (this.remoteNetlog_) {
    return this.adb_.adb(['pull', this.remoteNetlog_, localNetlog]).then(function() {
      return true;
    }.bind(this));
  } else {
    logger.debug("scheduleGetNetlog, remoteNetlog not set");
    return webdriver.promise.fulfilled(false);
  }
};

/**
 * Verifies that the device is attached, online, and under the max temp.
 *
 * @return {webdriver.promise.Promise} resolve() for addErrback.
 * @override
 */
BrowserAndroidChrome.prototype.scheduleAssertIsReady = function() {
  'use strict';
  return this.app_.schedule('Assert isReady', function() {
    if (this.checkNet) {
      if (this.rndis444 || this.useRndis) {
        this.adb_.scheduleAssertRndisIsEnabled();
      } else {
        this.adb_.scheduleDetectConnectedInterface();
      }
      this.adb_.scheduleGetGateway().then(function(ip) {
        this.adb_.schedulePing(ip).addErrback(function(){
          this.adb_.schedulePing('8.8.8.8');
        }.bind(this));
      }.bind(this));
    }
    if (this.maxTemp) {
      this.adb_.scheduleCheckBatteryTemperature(this.maxTemp);
    }
    if (!this.checkNet && !this.maxTemp) {
      // Run an arbitrary command, simply to verify the device is alive
      this.adb_.shell(['date']);
    }
  }.bind(this));
};

/**
 * Verifies that the browser is still running and didn't crash.
 *
 * @return {webdriver.promise.Promise} resolve() for addErrback.
 * @override
 */
BrowserAndroidChrome.prototype.scheduleAssertIsRunning = function() {
  'use strict';
  return this.app_.schedule('Assert isRunning', function() {
    return this.adb_.shell(['dumpsys', 'activity']).then( function(stdout) {
      var running = false;
      stdout.split(/[\r\n]+/).forEach(function(line) {
        if (line.match(/\(top-activity\)$/)) {
          if (line.indexOf(this.browserPackage_) >= 0) {
            running = true;
          }
        }
      }.bind(this));
      return running;
    }.bind(this));
  }.bind(this));
};

/**
 * Attempts recovery if the device is offline.
 *
 * @return {webdriver.promise.Promise} resolve(boolean) wasOffline.
 * @override
 */
BrowserAndroidChrome.prototype.scheduleMakeReady = function() {
  'use strict';
  return this.scheduleAssertIsReady().then(function() {
    return false;  // Was already online.
  }, function(e) {
    if (this.checkNet && this.rndis444) {
      return this.adb_.scheduleEnableRndis444(this.rndis444).then(
          this.scheduleAssertIsReady.bind(this)).then(function() {
        return true;  // Was offline but we're back online now.
      });
    } else if (this.checkNet && this.useRndis) {
      return this.adb_.scheduleEnableRndis().then(
          this.scheduleAssertIsReady.bind(this)).then(function() {
        return true;  // Was offline but we're back online now.
      });
    } else {
      throw e;  // We're offline and can't recover.
    }
  }.bind(this));
};

/**
 * Checks to see if activity has been detected since the last check.
 * This is (planned to be) done by checking the video capture
 * and tcpdump files for significant increases in size.
 *
 * @return {webdriver.promise.Promise} resolve(boolean) activityDetected.
 * @override
 */
BrowserAndroidChrome.prototype.scheduleActivityDetected = function() {
  'use strict';
  return this.adb_.shell(['ls', '-l', this.deviceVideoPath_]).addBoth(function(stdout) {
    var activity_detected = true;
    var matches = stdout.match(/[^\d]*([\d]+)/);
    if (matches && matches.length > 1) {
      var video_size = parseInt(matches[1]);
      var video_delta = video_size - this.lastVideoSize_;
      logger.debug('video size: ' + video_size + ' (+' + video_delta + ')');
      this.lastVideoSize_ = video_size;

      if (!this.videoStarted_) {
        if (video_delta > 100000)
          this.videoStarted_ = true;
      } else {
        if (video_delta > 10000) {
          this.videoIdleCount_ = 0;
        } else {
          this.videoIdleCount_++;
          if (this.videoIdleCount_ > 3)
            activity_detected = false;
        }
      }
    }
    return activity_detected;
  }.bind(this));
};
