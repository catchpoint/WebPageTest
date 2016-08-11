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

var bplist = require('bplist');
var browser_base = require('browser_base');
var fs = require('fs');
var http = require('http');
var logger = require('logger');
var os = require('os');
var path = require('path');
var process_utils = require('process_utils');
var util = require('util');
var webdriver = require('selenium-webdriver');


/**
 * Constructs a Mobile Safari controller for iOS.
 *
 * @param {webdriver.promise.ControlFlow} app the ControlFlow for scheduling.
 * @param {Object} args options:
 *   #param {string} runNumber test run number. Install the apk on run 1.
 *   #param {string} runTempDir the directory to store per-run files like
 *       screenshots.
 *   #param {Object.<String>} flags:
 *     #param {string} deviceSerial the device to drive.
 *     #param {string=} captureDir capture script dir, defaults to ''.
 *   #param {Object.<String>} task:
 * @constructor
 */
function BrowserIos(app, args) {
  'use strict';
  browser_base.BrowserBase.call(this, app);
  logger.info('BrowserIos(%j)', args);
  if (!args.flags.deviceSerial) {
    throw new Error('Missing device_serial');
  }
  this.app_ = app;
  this.shouldInstall_ = (1 === parseInt(args.runNumber || '1', 10));
  this.deviceSerial_ = args.flags.deviceSerial;
  // TODO allow idevice/ssh/etc to be undefined and try to run as best we can,
  // potentially with lots of warnings (e.g. "can't clear cache", ...).
  var iDeviceDir = args.flags.iosIDeviceDir;
  var toIDevicePath = process_utils.concatPath.bind(this, iDeviceDir);
  this.iosWebkitDebugProxy_ = toIDevicePath('ios_webkit_debug_proxy');
  this.iDeviceInfo_ = toIDevicePath('ideviceinfo');
  this.iDeviceImageMounter_ = toIDevicePath('ideviceimagemounter');
  this.iDeviceScreenshot_ = toIDevicePath('idevicescreenshot');
  this.imageConverter_ = 'convert'; // TODO use 'sips' on mac?
  this.devImageDir_ = process_utils.concatPath(args.flags.iosDevImageDir);
  this.devToolsPort_ = args.flags.devToolsPort;
  this.devtoolsPortLock_ = undefined;
  this.devToolsUrl_ = undefined;
  this.proxyProcess_ = undefined;
  this.sshConfigFile_ = '/dev/null';
  this.sshProxy_ = process_utils.concatPath(args.flags.iosSshProxyDir,
      args.flags.iosSshProxy || 'sshproxy.py');
  this.sshCertPath_ = (args.flags.iosSshCert ||
      process.env.HOME + '/.ssh/id_dsa_ios');
  this.xrecord_ = process_utils.concatPath(args.flags.iosVideoDir,
      'xrecord');
  this.videoProcess_ = undefined;
  this.videoStarted_ = false;
  this.pcapFile_ = undefined;
  this.pcapRemoteFile_ = '/var/logs/webpagetest.pcap';
  this.pcapProcess_ = undefined;
  this.pcapStarted_ = false;
  var capturePath = process_utils.concatPath(args.flags.captureDir,
      args.flags.captureScript || 'capture');
  this.runTempDir_ = args.runTempDir || '';
  this.isCacheWarm_ = args.isCacheWarm;
  this.supportsTracing = false;
}
util.inherits(BrowserIos, browser_base.BrowserBase);
/** Public class. */
exports.BrowserIos = BrowserIos;

/**
 * Future webdriver impl.
 * TODO... implementation with ios-driver.
 */
BrowserIos.prototype.startWdServer = function() {
  'use strict';
  throw new Error('LOL Applz');
};

// Infrequent device cleanup/health
BrowserIos.prototype.deviceCleanup = function() {
}

/** Starts browser. */
BrowserIos.prototype.startBrowser = function() {
  'use strict';
  this.scheduleMountDeveloperImageIfNeeded_();
  if (!this.isCacheWarm_) {
    this.scheduleClearCacheCookies_();
  }
  this.scheduleOpenUrl_('http://about:blank');
  this.cleanup_();
};

BrowserIos.prototype.prepareDevTools = function() {
  this.scheduleSelectDevToolsPort_();
  this.scheduleStartDevToolsProxy_();
};

/**
 * Mounts the dev image if needed, which is required by idevice-app-runner to
 * launch gdb "debugserver".
 *
 * @return {webdriver.promise.Promise}
 * @private
 */
BrowserIos.prototype.scheduleMountDeveloperImageIfNeeded_ = function() {
  'use strict';
  var done = new webdriver.promise.Deferred();
  function reject(e) {
    done.reject(e instanceof Error ? e : new Error(e));
  }
  this.scheduleSsh_('mount').then(function(stdout) {
    var m = stdout.match(/ on \/Developer /);
    if (m) {
      logger.debug("Developer image already mounted.")
      done.fulfill();
    } else {
      this.scheduleGetDeviceInfo_('ProductVersion').then(function(stdout) {
        var version = stdout.trim();
        var m = version.match(/^(\d+\.\d+)\./);
        version = (m ? m[1] : version);
        var dmgDir = this.devImageDir_ + version;
        var img = dmgDir + '/DeveloperDiskImage.dmg';
        fs.exists(img, function(exists) {
          if (!exists) {
            reject('Missing Xcode image: ' + img + '{,.signature}');
          } else {
            logger.info('Mounting ' + this.deviceSerial_ + ' ' + dmgDir);
            var sig = img + '.signature';
            process_utils.scheduleExec(
                this.app_, this.iDeviceImageMounter_,
                ['-u', this.deviceSerial_, img, sig],
                undefined,  // Use default spawn options.
                30000).then(function() {
              done.fulfill();
            }.bind(this), reject);
          }
        }.bind(this));
      }.bind(this), reject);
    }
  }.bind(this), reject);
  return done.promise;
};

/** @private */
BrowserIos.prototype.scheduleSelectDevToolsPort_ = function() {
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

/** @private */
BrowserIos.prototype.releaseDevToolsPort_ = function() {
  'use strict';
  if (this.devtoolsPortLock_) {
    this.devToolsPort_ = undefined;
    this.devtoolsPortLock_.release();
    this.devtoolsPortLock_ = undefined;
  }
};

/** @private */
BrowserIos.prototype.scheduleStartDevToolsProxy_ = function() {
  'use strict';
  if (this.proxyProcess_) {
    throw new Error('Internal error: proxy already running');
  }
  this.app_.schedule('Wait for devToolsPort_', function() {
    if (this.iosWebkitDebugProxy_) {
      process_utils.scheduleSpawn(this.app_, this.iosWebkitDebugProxy_,
          ['-c', this.deviceSerial_ + ':' + this.devToolsPort_]).then(
          function(proc) {
        this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
        this.proxyProcess_ = proc;
        this.proxyProcess_.on('exit', function(code, signal) {
          logger.info('Proxy EXIT code %s signal %s', code, signal);
          this.proxyProcess_ = undefined;
          this.devToolsUrl_ = undefined;
        }.bind(this));
      }.bind(this));
    } else {
      logger.warn('ios_webkit_debug_proxy not specified, hope already running');
      this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
    }
  }.bind(this));
};

/** @private */
BrowserIos.prototype.stopDevToolsProxy_ = function() {
  'use strict';
  if (this.proxyProcess_) {
    logger.debug('Killing the proxy');
    try {
      this.proxyProcess_.kill();
      logger.info('Killed proxy');
    } catch (killException) {
      logger.error('Proxy kill failed: %s', killException);
    }
  } else {
    logger.debug('Proxy process already unset');
  }
  this.proxyProcess_ = undefined;
  this.devToolsUrl_ = undefined;
};

/**
 * @param {string} var_args arguments.
 * @return {Array} ssh args.
 * @private
 */
BrowserIos.prototype.getSshArgs_ = function(var_args) { // jshint unused:false
  'use strict';
  var args = [];
  if (this.sshConfigFile_) {
    // Required to ignore /etc/ssh/ssh_config
    args.push('-F', this.sshConfigFile_);
  }
  if (this.sshCertPath_) {
    args.push('-i', this.sshCertPath_);
  }
  if (this.sshProxy_) {
    args.push('-o', 'ProxyCommand="' + this.sshProxy_ + '" -u %h');
  }
  args.push('-o', 'User=root');
  args.push.apply(args, Array.prototype.slice.call(arguments));
  return args;
};

/**
 * Runs an ssh command, treats exit code of 0 or 1 as success.
 * @param {string} var_args arguments.
 * @return {webdriver.promise.Promise} fulfill({string} stdout).
 * @private
 */
BrowserIos.prototype.scheduleSsh_ = function(var_args) { // jshint unused:false
  'use strict';
  var args = this.getSshArgs_.apply(
      this, [this.deviceSerial_].concat(Array.prototype.slice.call(arguments)));
  return process_utils.scheduleExec(this.app_, 'ssh', args).addErrback(
      function(e) {
    if (!e.signal && 1 === e.code) {
      return e.stdout;
    }
    throw e;
  }.bind(this));
};

/**
 * Runs an ssh command, treats exit code of 0 or 1 as success.
 * @param {string} var_args arguments.
 * @return {webdriver.promise.Promise} fulfill({string} stdout).
 * @private
 */
BrowserIos.prototype.scheduleSshNoFault_ = function(var_args) { // jshint unused:false
  'use strict';
  var args = this.getSshArgs_.apply(
      this, [this.deviceSerial_].concat(Array.prototype.slice.call(arguments)));
  return process_utils.scheduleExec(this.app_, 'ssh', args).addErrback(
      function(e) {
    if (!e.signal && 1 === e.code) {
      return e.stdout;
    }
    return '';
  }.bind(this));
};

/**
 * Spawns a SSH process
 * @param {string} var_args arguments.
 * @return {webdriver.promise.Promise} fulfill({string} stdout).
 * @private
 */
BrowserIos.prototype.scheduleSpawnSsh_ = function(var_args) { // jshint unused:false
  'use strict';
  var args = this.getSshArgs_.apply(
      this, [this.deviceSerial_].concat(Array.prototype.slice.call(arguments)));
  return process_utils.scheduleSpawn(this.app_, 'ssh', args);
};

/**
 * @param {string} var_args arguments.
 * @private
 */
BrowserIos.prototype.scheduleScp_ = function(var_args) { // jshint unused:false
  'use strict';
  process_utils.scheduleExec(
      this.app_, 'scp', this.getSshArgs_.apply(this, arguments));
};

/**
  Do any device cleanup we'd want to do between, before or after tests.
  @private
*/
BrowserIos.prototype.cleanup_ = function() {
  this.scheduleSshNoFault_('killall', 'tcpdump');
  this.scheduleSshNoFault_('killall', 'certui_relay');
  this.scheduleSshNoFault_('rm', '-rf', '/private/var/logs/webpagetest.pcap');
  this.scheduleSshNoFault_('rm', '-rf', '/private/var/mobile/Library/Assets/com_apple_MobileAsset_SoftwareUpdate/*.asset');
}

/** @private */
BrowserIos.prototype.scheduleClearCacheCookies_ = function() {
  'use strict';
  this.scheduleSshNoFault_('killall', 'MobileSafari');
  var glob = '/private/var/mobile/Applications/*/MobileSafari.app/Info.plist';
  this.scheduleSshNoFault_('test -f ' + glob + ' | ls ' + glob).then(function(stdout) {
    var path = stdout.trim();
    if (path) {
      // iOS 7+: Extract the app_id by removing the glob's [0:'*'] prefix
      // and ('*':] suffix from the expanded path.
      var sep = glob.indexOf('*');
      return path.substring(sep, path.length - (glob.length - sep) + 1);
    } else {
      // iOS 6: Safari does not store its content under app-id-named dirs.
      return undefined;
    }
  }.bind(this)).then(function(app_id) {
    var lib = ('/private/var/mobile' +
        (app_id ? '/Applications/' + app_id : '') + '/Library/');
    var cache = (app_id ? 'fsCachedData/*' :
        'com.apple.WebAppCache/ApplicationCache.db');
    this.scheduleSshNoFault_('rm', '-rf',
      lib + 'Caches/com.apple.mobilesafari/Cache.db',
      lib + 'Caches/' + cache,
      lib + 'Safari/History.plist',
      lib + 'Safari/SuspendState.plist',
      lib + 'WebKit/LocalStorage',
      '/private/var/mobile/Library/Cookies/Cookies.binarycookies');
  }.bind(this));

  // iOS 8 uses a different paths
  var paths = [// iOS 8+
               '/private/var/mobile/Containers/Data/Application/*/Library/Safari/*',
               '/var/mobile/Downloads/*',
               '/private/var/mobile/Downloads/*',
               '/var/mobile/Library/Safari/*',
               '/private/var/mobile/Library/Safari/*',
               '/private/var/mobile/Library/Cookies/*',
               //iOS 9+
               '/private/var/mobile/Containers/Data/Application/*/Library/Caches/com.apple.mobilesafari',
               '/private/var/mobile/Containers/Data/Application/*/Library/Caches/Snapshots/com.apple.mobilesafari',
               '/private/var/mobile/Containers/Data/Application/*/Library/Caches/WebKit',
               '/private/var/mobile/Containers/Data/Application/*/Library/Caches/com.apple.WebKit.*',
               '/private/var/mobile/Containers/Data/Application/*/Library/WebKit'];
  for (var i = 0; i < paths.length; i++) {
    this.scheduleSshNoFault_('rm', '-rf', paths[i]);
  }
};

/**
 * @param {string} url the URL to open.
 * @private
 */
BrowserIos.prototype.scheduleOpenUrl_ = function(url) {
  'use strict';
  this.app_.schedule('Open URL', function() {
    logger.debug('Opening URL: ' + url);
    this.scheduleSsh_('uiopen', url);
  }.bind(this));
};

/** Kills the browser. */
BrowserIos.prototype.kill = function() {
  'use strict';
  this.devToolsUrl_ = undefined;
  this.stopDevToolsProxy_();
  this.releaseDevToolsPort_();
  this.cleanup_();
};

/** @return {boolean} */
BrowserIos.prototype.isRunning = function() {
  'use strict';
  return undefined !== this.devToolsUrl_;
};

/** @return {string} WebDriver Server URL. */
BrowserIos.prototype.getServerUrl = function() {
  'use strict';
  return undefined;
};

/** @return {string} DevTools URL. */
BrowserIos.prototype.getDevToolsUrl = function() {
  'use strict';
  return this.devToolsUrl_;
};

/** @return {Object} capabilities. */
BrowserIos.prototype.scheduleGetCapabilities = function() {
  'use strict';
  return this.app_.schedule('iOS get capabilities', function() {
    return {
      webdriver: false,
      videoRecording: os.platform() == 'darwin' ? true : false,
      videoFileExtension: 'mp4',
      takeScreenshot: true
    };
  }.bind(this));
};

/**
 * @param {string} key the ideviceinfo field name.
 * @return {webdriver.promise.Promise} The scheduled promise, where the
 *   resolved value is the ideviceinfo.
 * @private
 */
BrowserIos.prototype.scheduleGetDeviceInfo_ = function(key) {
  'use strict';
  return process_utils.scheduleExec(this.app_, this.iDeviceInfo_,
      ['-k', key, '-u', this.deviceSerial_]);
};

/**
 * @param {string} fileNameNoExt filename without the '.png' suffix.
 * @return {webdriver.promise.Promise} resolve(diskPath) of the written file.
 */
BrowserIos.prototype.scheduleTakeScreenshot = function(fileNameNoExt) {
  'use strict';
  return process_utils.scheduleExec(this.app_, this.iDeviceScreenshot_,
      ['-u', this.deviceSerial_],
      // The idevicescreenshot writes the tiff file into the current dir.
      // Run with runTempDir as the current, to avoid garbage files if we crash.
      {cwd: this.runTempDir_}).then(function(stdout) {
    var m = stdout.match(/^Screenshot\s+saved\s+to\s+(\S+\.tiff)(\s|$)/i);
    if (!m) {
      //throw new Error('Unable to take screenshot: ' + stdout);
      logger.debug("Unable to take screenshot: " + stdout)
    }
    return m[1];
  }).then(function(localTiffFilename) {
    var localTiff = path.join(this.runTempDir_, localTiffFilename);
    var localPng = path.join(this.runTempDir_, fileNameNoExt + '.png');
    process_utils.scheduleExec(this.app_, this.imageConverter_,
        (/sips$/.test(this.imageConverter_) ?
         ['-s', 'format', 'png', localTiff, '–out', localPng] :
         [localTiff, '-format', 'png', localPng]));
    return localPng;
  }.bind(this));
};

/**
 * @param {string} filename The local filename to write to.
 * @param {Function=} onExit Optional exit callback.
 */
BrowserIos.prototype.prepareVideoCapture = function(filename) {
  // xrecord breaks the debug proxy connection so we need to start
  // video capture before starting the proxy.
  this.app_.schedule('Start video capture', function() {
    if (this.xrecord_) {
      process_utils.scheduleSpawn(this.app_, this.xrecord_,
          ['-q', '-d', '-f', '-i', this.deviceSerial_, '-o', filename]).then(
          function(proc) {
        this.videoProcess_ = proc;
        this.videoProcess_.on('exit', function(code, signal) {
          logger.info('xrecord EXIT code %s signal %s', code, signal);
          this.videoProcess_ = undefined;
        }.bind(this));
        this.videoStarted_ = false;
        this.videoProcess_.stderr.on('data', function(data) {
          if (data.toString().indexOf('Recording started') >= 0) {
            logger.debug('Video capture started recording');
            this.videoStarted_ = true;
          }
        }.bind(this));
        // xrecord will wait for up to 10 minutes to acquire an exclusive lock
        // (only one video at a time is currently possible in OSX)
        this.app_.wait(function() {return this.videoStarted_ || !this.videoProcess_;}.bind(this), 660000);
      }.bind(this));
    }
  }.bind(this));
};

/**
 * @param {string} filename The local filename to write to.
 * @param {Function=} onExit Optional exit callback.
 */
BrowserIos.prototype.scheduleStartVideoRecording = function(filename) {
  'use strict';
};

/**
 * Stops the video recording.
 */
BrowserIos.prototype.scheduleStopVideoRecording = function() {
  'use strict';
  if (this.videoProcess_) {
    this.app_.schedule('Stop video capture', function() {
      logger.debug('Killing video capture');
      try {
        this.videoProcess_.kill('SIGINT');
        this.app_.wait(function() {
          return this.videoProcess_ == undefined;
        }.bind(this), 30000).then(function() {
          logger.info('Killed video capture');
        }.bind(this));
      } catch (killException) {
        logger.error('video capture kill failed: %s', killException);
        this.videoProcess_ = undefined;
      }
    }.bind(this));
  }
};

/**
 * Starts packet capture.
 *
 * #param {string} filename  local file where to copy the pcap result.
 */
BrowserIos.prototype.scheduleStartPacketCapture = function(filename) {
  'use strict';
  this.app_.schedule('Start packet capture', function() {
    this.scheduleSshNoFault_('rm', this.pcapRemoteFile_).then(function() {
      this.scheduleSpawnSsh_('tcpdump -i en0 -s 0 -p -w ' + this.pcapRemoteFile_).then(
          function(proc) {
        this.pcapProcess_ = proc;
        this.pcapFile_ = filename;
        this.pcapProcess_.on('exit', function(code, signal) {
          logger.info('packet capture EXIT code %s signal %s', code, signal);
          this.pcapProcess_ = undefined;
        }.bind(this));
        this.pcapStarted_ = false;
        this.pcapProcess_.stderr.on('data', function(data) {
          if (data.toString().indexOf('listening on en0') >= 0) {
            logger.debug('packet capture started recording');
            this.pcapStarted_ = true;
          }
        }.bind(this));
        this.app_.wait(function() {return this.pcapStarted_;}.bind(this), 30000);
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

/**
 * Stops packet capture and copies the result to a local file.
 */
BrowserIos.prototype.scheduleStopPacketCapture = function() {
  'use strict';
  if (this.pcapProcess_) {
    this.app_.schedule('Stop packet capture', function() {
      logger.debug('Killing packet capture');
      try {
        this.scheduleSshNoFault_('killall', '-INT', 'tcpdump');
        this.app_.wait(function() {
          return this.pcapProcess_ == undefined;
        }.bind(this), 30000).then(function() {
          logger.info('Killed packet capture');
        }.bind(this));
      } catch (killException) {
        logger.error('packet capture kill failed: %s', killException);
        this.pcapProcess_ = undefined;
      }
    }.bind(this));
    this.scheduleScp_(this.deviceSerial_ + ':' + this.pcapRemoteFile_, this.pcapFile_);
    this.scheduleSshNoFault_('rm', this.pcapRemoteFile_);
  }
};

/**
 * Throws an error if the browser is not ready to run tests.
 *
 * @return {webdriver.promise.Promise} resolve() for addErrback.
 * @override
 */
BrowserIos.prototype.scheduleAssertIsReady = function() {
  'use strict';
  return this.scheduleSsh_('echo show State:/Network/Interface/en0/IPv4|scutil'
      ).then(function(stdout) {
    // If WiFi is disabled we'll get "No such key" stdout.
    var hasWifi = false;
    var insideTag = false;
    var lines = stdout.trim().split('\n');
    lines.forEach(function(line) {
      if (/^\s*Addresses\s*:\s*<array>\s*{\s*$/.test(line)) {
        insideTag = true;
      } else if (insideTag && (/^\s*0\s*:\s*\d+(\.\d+){3}\s*/).test(line)) {
        hasWifi = true;
      } else if (-1 !== line.indexOf('}')) {
        insideTag = false;
      }
    });
    // Make sure Safari is closed if we aren't running a test
    this.scheduleSshNoFault_('killall', 'MobileSafari');
    if (!hasWifi) {
      throw new Error('Wifi is offline');
    }
  }.bind(this));
};
