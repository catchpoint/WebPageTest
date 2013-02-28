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

var logger = require('logger');
var process_utils = require('process_utils');


function BrowserIos(app, runNumber, deviceSerial, iosIDeviceDir,
    pythonPortForwardDir, sshLocalPort, sshCertPath, urlOpenerAppPath) {
  'use strict';
  logger.info('BrowserIos(%s)', deviceSerial);
  this.app_ = app;
  this.runNumber_ = runNumber;
  this.deviceSerial_ = deviceSerial;
  this.iosWebkitDebugProxy_ = undefined;
  this.iosWebkitDebugProxy_ = iosIDeviceDir ?
      iosIDeviceDir + '/ios_webkit_debug_proxy' : undefined;
  this.iDeviceInstaller_ = iosIDeviceDir ?
      iosIDeviceDir + '/ideviceinstaller' : 'ideviceinstaller';
  this.iDeviceAppRunner_ = iosIDeviceDir ?
      iosIDeviceDir + '/idevice-app-runner' : 'idevice-app-runner';
  this.devToolsPort_ = 9222;
  this.devToolsUrl_ = undefined;
  this.proxyProcess_ = undefined;
  this.pythonPortForwardDir_ = pythonPortForwardDir;
  this.usbPortForwardProcess_ = undefined;
  this.sshLocalPort_ = sshLocalPort || 2222;
  this.sshCertPath_ = sshCertPath || process.env.HOME + '/.ssh/id_dsa_ios';
  this.urlOpenerAppPath_ = urlOpenerAppPath;
}
exports.BrowserIos = BrowserIos;

BrowserIos.prototype.startWdServer = function(/*browserCaps, isFirstRun*/) {
  'use strict';
  throw new Error('LOL Applz');
};

BrowserIos.prototype.startBrowser = function() {
  'use strict';
  this.scheduleStartUsbPortForward_();
  this.scheduleInstallHelpersIfNeeded_();
  this.scheduleClearCacheCookies_();
  this.scheduleOpenUrl_('http://');
  this.scheduleStartDevToolsProxy_();
  this.app_.schedule('Browser start complete', function() {
    this.devToolsUrl_ = 'http://localhost:' + this.devToolsPort_ + '/json';
  }.bind(this));
};

BrowserIos.prototype.scheduleInstallHelpersIfNeeded_ = function() {
  'use strict';
  if (1 === this.runNumber_ && this.urlOpenerAppPath_) {
    process_utils.scheduleExecWithTimeout(this.app_, this.iDeviceInstaller_,
        ['-U', this.deviceSerial_, '-i', this.urlOpenerAppPath_], 20000);
  }
};

BrowserIos.prototype.scheduleStartUsbPortForward_ = function() {
  'use strict';
  if (this.pythonPortForwardDir_ && this.sshLocalPort_) {
    var env = {PYTHONPATH: this.pythonPortForwardDir_};
    Object.getOwnPropertyNames(process.env).forEach(function(e) {
      env[e] = process.env[e];
    });
    process_utils.scheduleSpawn(this.app_,
        'python', ['-m', 'tcprelay', '-t', '22:' + this.sshLocalPort_],
        {env: env}).then(function(proc) {
      this.usbPortForwardProcess_ = proc;
      proc.on('exit', function(code, signal) {
        logger.info('Port forward EXIT code %s signal %s', code, signal);
        this.usbPortForwardProcess_ = undefined;
      }.bind(this));
    }.bind(this));
  } else {
    logger.warn('iOS ssh port forward Python proxy or port not specified, ' +
        'hope already running');
  }
};

BrowserIos.prototype.stopUsbPortForward_ = function() {
  'use strict';
  if (this.usbPortForwardProcess_) {
    logger.debug('Killing port forward');
    var proc = this.usbPortForwardProcess_;
    this.usbPortForwardProcess_ = undefined;
    try {
      proc.kill();
      logger.info('Killed port forward');
    } catch(e) {
      logger.error('Cannot kill port forward: %s', e);
    }
  }
};

BrowserIos.prototype.scheduleStartDevToolsProxy_ = function() {
  'use strict';
  if (this.iosWebkitDebugProxy_) {
    if (this.proxyProcess_) {
      throw new Error('Internal error: proxy already running');
    }
    process_utils.scheduleSpawn(this.app_, this.iosWebkitDebugProxy_,
        ['-c', this.deviceSerial_ + ':' + this.devToolsPort_]).then(
        function(proc) {
      this.proxyProcess_ = proc;
      this.proxyProcess_.on('exit', function(code, signal) {
        logger.info('Proxy EXIT code %s signal %s', code, signal);
        this.proxyProcess_ = undefined;
        this.devToolsUrl_ = undefined;
      }.bind(this));
    }.bind(this));
  } else {
    logger.warn('ios_webkit_debug_proxy not specified, hope already running');
  }
};

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

BrowserIos.prototype.ssh_ = function() {
  'use strict';
  var result;
  if (this.sshLocalPort_) {
    var args = ['-p', String(this.sshLocalPort_)];
    if (this.sshCertPath_) {
      args = args.concat(['-i', this.sshCertPath_]);
    }
    args.push('root@localhost');
    args = args.concat(Array.prototype.slice.call(arguments));
    result = process_utils.scheduleExecWithTimeout(
        this.app_, 'ssh', args, 10000, /*okExitCodes=*/[0, 1]);
  } else {
    logger.error('Trying to run ssh command [%s] when there is no SSH proxy',
        Array.prototype.slice.call(arguments));
    result = this.app_.schedule('Skip ssh command', function() {});
  }
  return result;
};

BrowserIos.prototype.scheduleClearCacheCookies_ = function() {
  'use strict';
  var lib = '/private/var/mobile/Library/';
  this.ssh_('killall', 'MobileSafari');
  this.ssh_('rm', '-rf',
      lib + 'Caches/com.apple.mobilesafari/Cache.db',
      lib + 'Safari/SuspendState.plist',
      lib + 'WebKit/LocalStorage',
      lib + 'Caches/com.apple.WebAppCache/ApplicationCache.db',
      lib + 'Cookies/Cookies.binarycookies');
};

BrowserIos.prototype.scheduleOpenUrl_ = function(url) {
  'use strict';
  return process_utils.scheduleExecWithTimeout(
      this.app_, this.iDeviceAppRunner_,
      ['-u', this.deviceSerial_, '-r', 'com.google.openURL', '--args', url],
      20000);
};

BrowserIos.prototype.kill = function() {
  'use strict';
  this.devToolsUrl_ = undefined;
  this.stopDevToolsProxy_();
  this.stopUsbPortForward_();
};

BrowserIos.prototype.isRunning = function() {
  'use strict';
  return undefined !== this.devToolsUrl_;
};

BrowserIos.prototype.getServerUrl = function() {
  'use strict';
  return undefined;
};

BrowserIos.prototype.getDevToolsUrl = function() {
  'use strict';
  return this.devToolsUrl_;
};

BrowserIos.prototype.getDevToolsCapabilities = function() {
  'use strict';
  return {
      'Page.captureScreenshot': false
  };
};
