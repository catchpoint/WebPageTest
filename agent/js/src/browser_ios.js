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
var video_hdmi = require('video_hdmi');
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
 *     #param {string=} pac PAC content.
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
  this.iDeviceInstaller_ = toIDevicePath('ideviceinstaller');
  this.iDeviceAppRunner_ = toIDevicePath('idevice-app-runner');
  this.iDeviceInfo_ = toIDevicePath('ideviceinfo');
  this.iDeviceImageMounter_ = toIDevicePath('ideviceimagemounter');
  this.iDeviceScreenshot_ = toIDevicePath('idevicescreenshot');
  this.imageConverter_ = '/usr/bin/convert'; // TODO use 'sips' on mac?
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
  this.urlOpenerApp_ = process_utils.concatPath(args.flags.iosAppDir,
      args.flags.iosUrlOpenerApp || 'urlOpener.ipa');
  this.pac_ = args.task.pac;
  this.pacServerPort_ = undefined;
  this.pacServerPortLock_ = undefined;
  this.pacServer_ = undefined;
  this.pacUrlPort_ = undefined;
  this.pacUrlPortLock_ = undefined;
  this.pacForwardProcess_ = undefined;
  this.videoCard_ = args.flags.videoCard;
  var capturePath = process_utils.concatPath(args.flags.captureDir,
      args.flags.captureScript || 'capture');
  this.video_ = new video_hdmi.VideoHdmi(this.app_, capturePath);
  this.runTempDir_ = args.runTempDir || '';
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

/** Starts browser. */
BrowserIos.prototype.startBrowser = function() {
  'use strict';
  this.scheduleMountDeveloperImageIfNeeded_();
  this.scheduleInstallHelpersIfNeeded_();
  this.scheduleClearCacheCookies_();
  this.scheduleStartPacServer_();
  this.scheduleConfigurePac_();
  this.scheduleOpenUrl_('http://');
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
  if (!this.iDeviceAppRunner_) {
    return undefined;
  }
  var done = new webdriver.promise.Deferred();
  function reject(e) {
    done.reject(e instanceof Error ? e : new Error(e));
  }
  logger.debug('Checking iOS debugserver');
  process_utils.scheduleExec(this.app_, this.iDeviceAppRunner_,
      ['-U', this.deviceSerial_, '-r', 'check_gdb'],
      undefined,  // Use default spawn options.
      20000).then(function(stdout) {
    reject('Expecting an error from check_gdb, not ' + stdout);
  }, function(e) {
    var stderr = (e.stderr || e.message || '').trim();
    if (0 === stderr.indexOf('Unknown APPID (check_gdb) is not in:')) {
      logger.debug('Dev image already mounted');
      done.fulfill();
    } else if (stderr !== 'Could not start com.apple.debugserver!') {
      reject('Unexpected stderr: ' + stderr);
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
  }.bind(this));
  return done.promise;
};

/** @private */
BrowserIos.prototype.scheduleInstallHelpersIfNeeded_ = function() {
  'use strict';
  if (this.shouldInstall_ && this.urlOpenerApp_) {
    this.app_.schedule('Install openURL app', function() {
      var done = new webdriver.promise.Deferred();
      function reject(e) {
        done.reject(e instanceof Error ? e : new Error(e));
      }
      process_utils.scheduleExec(this.app_, this.iDeviceInstaller_,
          ['-U', this.deviceSerial_, '-i', this.urlOpenerApp_],
          undefined,  // Use default spawn options.
          20000).then(function(stdout) {
        if (stdout.indexOf('Install - Complete') >= 0) {
          done.fulfill();
        } else {
          reject('Install failed: ' + stdout);
        }
      }.bind(this), reject);
      return done.promise;
    }.bind(this));
  }
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
 * @param {string} var_args arguments.
 * @private
 */
BrowserIos.prototype.scheduleScp_ = function(var_args) { // jshint unused:false
  'use strict';
  process_utils.scheduleExec(
      this.app_, 'scp', this.getSshArgs_.apply(this, arguments));
};

/** @private */
BrowserIos.prototype.scheduleClearCacheCookies_ = function() {
  'use strict';
  var glob = '/private/var/mobile/Applications/*/MobileSafari.app/Info.plist';
  this.scheduleSsh_('killall', 'MobileSafari');
  this.scheduleSsh_('test -f ' + glob + ' | ls ' + glob).then(function(stdout) {
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
    this.scheduleSsh_('rm', '-rf',
      lib + 'Caches/com.apple.mobilesafari/Cache.db',
      lib + 'Caches/' + cache,
      lib + 'Safari/History.plist',
      lib + 'Safari/SuspendState.plist',
      lib + 'WebKit/LocalStorage',
      '/private/var/mobile/Library/Cookies/Cookies.binarycookies');
  }.bind(this));
};

/**
 * @param {string} url the URL to open.
 * @private
 */
BrowserIos.prototype.scheduleOpenUrl_ = function(url) {
  'use strict';
  if (this.iDeviceAppRunner_) {
    process_utils.scheduleExec(
        this.app_, this.iDeviceAppRunner_,
        ['-u', this.deviceSerial_, '-r', 'com.google.openURL', '--args', url],
        undefined,  // Use default spawn options.
        20000);
  }
};

/** @private */
BrowserIos.prototype.scheduleConfigurePac_ = function() {
  'use strict';
  // Modify the configd table, which will notify Safari.  This config is not
  // persisted.
  //
  // This doesn't update the "Settings > WiFi > ? > Auto" UI.  Instead, the UI
  // persists its PAC settings in:
  //   /private/var/preferences/SystemConfiguration/preferences.plist
  // When you manually change the settings in the UI, it both (1) saves a new
  // plist and (2) modifies the configd table, which notifies Safari.
  this.scheduleSsh_('echo list Setup:/Network/Service/.*/Proxies |scutil').then(
    function(stdout) {
      logger.debug((this.pacUrlPort_ ? 'Setting' : 'Clearing') + ' PAC');
      var commands = [];
      var lines = stdout.trim().split('\n');
      lines.forEach(function(line) {
        var matches = /^\s*subKey\s*\[\d+\]\s*=\s*(.*)\s*$/im.exec(line);
        if (matches) {
          var key = matches[1];
          commands.push('get ' + key);
          if (this.pacUrlPort_) {
            commands.push('d.add ProxyAutoConfigEnable # 1');
            commands.push('d.add ProxyAutoConfigURLString ' +
                'http://127.0.0.1:' + this.pacUrlPort_ + '/proxy.pac');
          } else {
            commands.push('d.remove ProxyAutoConfigEnable');
            commands.push('d.remove ProxyAutoConfigURLString');
          }
          commands.push('set ' + key);
        }
      }.bind(this));
      if (commands.length > 0) {
        logger.debug('Sending commands to scutil:\n  ' + commands.join('\n  '));
        return this.scheduleSsh_('echo -e "' + commands.join('\n') +
            '" | scutil');
      }
      if (!this.pacUrlPort_) {
        return undefined;
      }
      throw new Error('scutil lacks PAC Proxies? ' + stdout);
    }.bind(this));

  // Update the Settings UI.  This is optional but a good idea, since
  // otherwise the UI won't reflect the PAC settings.
  this.scheduleConfigurePacUI_();
};

/** @private */
BrowserIos.prototype.scheduleConfigurePacUI_ = function() {
  'use strict';
  // TODO(klm): Switch from tmp file to 'ssh ... cat' after upgrading NodeJS
  // to a version where child_process.exec stdout is a Buffer not a string.
  var remotePrefs =
      '/private/var/preferences/SystemConfiguration/preferences.plist';
  var scpRemotePrefs = this.deviceSerial_ + ':' + remotePrefs;
  var localPrefs = path.join(this.runTempDir_, '.preferences.plist');
  this.scheduleScp_(scpRemotePrefs, localPrefs);

  process_utils.scheduleFunction(this.app_, 'Read plist', fs.readFile,
       localPrefs).then(function(data) {
    return process_utils.scheduleFunction(this.app_, 'Parse',
        bplist.parseBuffer, data);
  }.bind(this), function() {}).then(function(result) {
    return result && result[0];
  }).then(function(plist) {
    var modified = false;
    process_utils.forEachRecursive(plist, function(key, parentObject, keyPath) {
      var parentKey = keyPath[keyPath.length - 1];
      if ('signature' === parentKey || 'IOMACAddress' === parentKey) {
        return true;  // Skip this branch.
      }
      if ('Proxies' !== key) {
        return false;  // Keep going.
      }
      var proxies = parentObject.Proxies;
      modified = true;
      if (this.pacUrlPort_) {
        logger.debug('Setting PAC URL in %s/%s', keyPath.join('/'), key);
        proxies.ProxyAutoConfigEnable = 1;
        // The URL points to the ssh reverse port forward to the server
        // from scheduleStartPacServer_, always responding with this.pac_.
        proxies.ProxyAutoConfigURLString =
            'http://127.0.0.1:' + this.pacUrlPort_ + '/proxy.pac';
      } else {
        logger.debug('Deleting PAC URL in %s/%s', keyPath.join('/'), key);
        delete proxies.ProxyAutoConfigEnable;
        delete proxies.ProxyAutoConfigURLString;
      }
      return true;  // Skip -- no need to recurse under Proxies.
    }.bind(this));
    return (modified ? plist : undefined);
  }.bind(this)).then(function(plist) {
    return plist && process_utils.scheduleFunction(this.app_, 'write plist',
        fs.writeFile, localPrefs, bplist.create(plist));
  }.bind(this));

  this.scheduleScp_(localPrefs, scpRemotePrefs);
};

/** @private */
BrowserIos.prototype.scheduleStartPacServer_ = function() {
  'use strict';
  logger.debug('PAC: %s', this.pac_);
  if (!this.pac_) {
    // Only need the server and its ssh forward if we have PAC content.
    return;
  }
  // We must dynamically allocate both ports, otherwise Safari thinks that
  // the PAC content hasn't changed.
  process_utils.scheduleAllocatePort(this.app_, 'Select PAC Server port').then(
    function(alloc) {
      logger.debug('Selected PAC Server port ' + alloc.port);
      this.pacServerPortLock_ = alloc;
      this.pacServerPort_ = alloc.port;
    }.bind(this));
  this.app_.schedule('Start PAC Server', function() {
    this.pacServer_ = http.createServer(function(request, response) {
      logger.debug('Got PAC HTTP request path=%s headers=%j',
          request.url, request.headers);
      response.writeHead(200, {
        'Content-Length': this.pac_.length,
        'Content-Type': 'application/x-ns-proxy-autoconfig'
      });
      response.write(this.pac_);
      response.end();
    }.bind(this));
    return process_utils.scheduleFunction(this.app_,
        'Start PAC listener on port ' + this.pacServerPort_,
        this.pacServer_.listen.bind(this.pacServer_), this.pacServerPort_);
  }.bind(this));
  process_utils.scheduleAllocatePort(this.app_, 'Select PAC URL port').then(
    function(alloc) {
      logger.debug('Selected PAC URL port ' + alloc.port);
      this.pacUrlPortLock_ = alloc;
      this.pacUrlPort_ = alloc.port;
      var args = this.getSshArgs_(
          this.deviceSerial_,
          '-R', this.pacUrlPort_ + ':127.0.0.1:' + this.pacServerPort_, '-N');
      return process_utils.scheduleSpawn(this.app_, 'ssh', args).then(
        function(proc) {
          logger.info('Created tunnel from ' +
              this.deviceSerial_ + ':' + this.pacUrlPort_ + ' to :' +
              this.pacServerPort_);
          this.pacForwardProcess_ = proc;
        }.bind(this));
    }.bind(this));
};

/**
 * Stops the PAC server.
 *
 * @private
 */
BrowserIos.prototype.stopPacServer_ = function() {
  'use strict';
  if (this.pacForwardProcess_) {
    logger.debug('Killing PAC port forwarding');
    try {
      this.pacForwardProcess_.kill();
      logger.debug('Killed PAC port forwarding');
    } catch (killException) {
      logger.error('PAC port forwarding kill failed: %s', killException);
    }
    this.pacForwardProcess_ = undefined;
  } else {
    logger.debug('PAC port forwarding process already unset');
  }
  if (this.pacUrlPortLock_) {
    this.pacUrlPort_ = undefined;
    this.pacUrlPortLock_.release();
    this.pacUrlPortLock_ = undefined;
  }
  if (this.pacServer_) {
    process_utils.scheduleFunction(this.app_, 'Stop PAC server',
        this.pacServer_.close.bind(this.pacServer_));
    this.pacServer_ = undefined;
  }
  if (this.pacServerPortLock_) {
    this.pacServerPort_ = undefined;
    this.pacServerPortLock_.release();
    this.pacServerPortLock_ = undefined;
  }
};

/** Kills the browser. */
BrowserIos.prototype.kill = function() {
  'use strict';
  this.devToolsUrl_ = undefined;
  this.stopDevToolsProxy_();
  this.releaseDevToolsPort_();
  this.stopPacServer_();
  if (this.pac_) {
    // Clear the PAC settings
    this.scheduleConfigurePac_();
  }
  this.video_.scheduleStopVideoRecording();
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
  return this.video_.scheduleIsSupported().then(function(canRecordVideo) {
    return process_utils.scheduleFunction(this.app_, 'exists',
        fs.exists, this.imageConverter_ || '').then(function(canConvertImages) {
      if (!canConvertImages && ((/convert$/).test(this.imageConverter_))) {
        logger.debug('Missing ' + this.imageConverter_ + ', possible fix:\n' +
            (/^darwin/i.test(os.platform()) ?
             'brew install imagemagick --with-libtiff' :
             'sudo apt-get install imagemagick'));
      }
      return {
          webdriver: false,
          videoRecording: canRecordVideo,
          takeScreenshot: canConvertImages
        };
    }.bind(this));
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
      throw new Error('Unable to take screenshot: ' + stdout);
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
 * @param {Function=} onExit Optional exit callback, as noted in video_hdmi.
 */
BrowserIos.prototype.scheduleStartVideoRecording = function(filename, onExit) {
  'use strict';
  // The video record command needs to know device type for cropping etc.
  this.scheduleGetDeviceInfo_('ProductType').then(function(stdout) {
    this.video_.scheduleStartVideoRecording(filename, this.deviceSerial_,
        stdout.trim(), this.videoCard_, onExit);
  }.bind(this));
};

/**
 * Stops the video recording.
 */
BrowserIos.prototype.scheduleStopVideoRecording = function() {
  'use strict';
  this.video_.scheduleStopVideoRecording();
};

/**
 * Starts packet capture.
 *
 * #param {string} filename  local file where to copy the pcap result.
 */
BrowserIos.prototype.scheduleStartPacketCapture = function() {
  'use strict';
  throw new Error('Packet capture requested, but not implemented for iOS');
};

/**
 * Stops packet capture and copies the result to a local file.
 */
BrowserIos.prototype.scheduleStopPacketCapture = function() {
  'use strict';
  throw new Error('Packet capture requested, but not implemented for iOS');
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
    if (!hasWifi) {
      throw new Error('Wifi is offline');
    }
  }.bind(this));
};
