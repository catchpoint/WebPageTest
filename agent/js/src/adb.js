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

var murmurhash = require('murmurhash/murmurhash3_gc');
var logger = require('logger');
var process_utils = require('process_utils');
var util = require('util');

/** Default adb command timeout. */
exports.DEFAULT_TIMEOUT = 60000;

var STORAGE_PATHS_ = ['$EXTERNAL_STORAGE',
    '$SECONDARY_STORAGE',
    '/data/local/tmp'
];

/**
 * Creates an adb runner for a given device serial.
 *
 * @param {webdriver.promise.ControlFlow} app the scheduler app.
 * @param {string} serial the device serial.
 * @param {string=} adbCommand the adb command, defaults to 'adb'.
 * @constructor
 */
function Adb(app, serial, adbCommand) {
  'use strict';
  this.app_ = app;
  this.adbCommand = adbCommand || process.env.ANDROID_ADB || 'adb';
  this.serial = serial;
  this.isUserDebug_ = undefined;
  this.storagePath_ = undefined;
}
/** Public class. */
exports.Adb = Adb;

/**
 * Schedules an adb command, resolves with its stdout.
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 * @private
 */
Adb.prototype.command_ = function(args, options, timeout) {
  'use strict';
  return process_utils.scheduleExec(this.app_,
      this.adbCommand, args,
      options,
      timeout || exports.DEFAULT_TIMEOUT);
};

/**
 * Schedules an adb command on the device, resolves with its stdout.
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 */
Adb.prototype.adb = function(args, options, timeout) {
  'use strict';
  return this.command_(['-s', this.serial].concat(args), options, timeout);
};

/**
 * Schedules an adb shell command on the device, resolves with its stdout.
 *
 * The caller should trim/split the returned stdout to remove any trailing '\r's
 * or newlines.  For example, `adb shell echo foo | cat -v` returns "foo^M".
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 */
Adb.prototype.shell = function(args, options, timeout) {
  'use strict';
  return this.adb(['shell'].concat(args), options, timeout);
};

/**
 * Formats "su -c" arguments to match the device-specific shell.
 *
 * The basic formats are:
 *     COMMAND                SuperSu                 userdebug
 *     su -c 'echo x'         x                       su: exec failed...
 *     su 0 sh -c 'echo x'    sh: sh: No such...      x
 * The extra "sh -c" is required for userdebug shell built-ins commands, e.g.:
 *     su 0 echo x            sh: echo: No such..     su: exec failed...
 *     su 0 ls data           sh: ls: No such...      app, ...
 * For completeness, the other interesting cases are:
 *     su -c echo x           Unknown id: x           su: exec failed...
 *     su -c 'ls data'        app, ...                su: exec failed...
 *     su -c ls data          Unknown id: data        app, ...
 *     su 0 sh -c 'ls data'   sh: sh: No such...      app, ...
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Array} shellArgs).
 */
Adb.prototype.formatSuArgs = function(args) {
  'use strict';
  return this.app_.schedule('Check su', function() {
    if (undefined === this.isUserDebug_) {
      // Test an arbitrary command, e.g. 'echo x' or 'date +%s'
      this.shell(['su', '-c', 'echo x']).then(function(stdout) {
        if ('x' === stdout.trim()) {
          this.isUserDebug_ = false;
        } else if (/^su: exec failed/.test(stdout)) {
          this.isUserDebug_ = true;
        } else {
          throw new Error('Unexpected \'su\' output: ' + stdout);
        }
      }.bind(this));
    }
    return this.app_.schedule('Format su', function() {
      return (this.isUserDebug_ ?
          ['su', '0', 'sh', '-c', args.join(' ')] :
          ['su', '-c', args.join(' ')]);
    }.bind(this));
  }.bind(this));
};

/**
 * Schedules an "adb shell su -c" command, resolves with its stdout.
 *
 * @param {Array} args command args, as in process.spawn.
 * @param {Object=} options command options, as in process.spawn.
 * @param {number=} timeout milliseconds to wait before killing the process,
 *   defaults to DEFAULT_TIMEOUT.
 * @return {webdriver.promise.Promise} The scheduled promise.
 */
Adb.prototype.su = function(args, options, timeout) {
  'use strict';
  return this.formatSuArgs(args).then(function(shellArgs) {
    return this.shell(shellArgs, options, timeout);
  }.bind(this));
};

/**
 * Spawns a background process.
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Process} proc).
 * @private
 */
Adb.prototype.spawn_ = function(args) {
  'use strict';
  return process_utils.scheduleSpawn(this.app_, this.adbCommand, args);
};

/**
 * Spawns a background "adb" process.
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Process} proc).
 */
Adb.prototype.spawnAdb = function(args) {
  'use strict';
  return this.spawn_(['-s', this.serial].concat(args));
};

/**
 * Spawns a background "adb shell" process.
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Process} proc).
 */
Adb.prototype.spawnShell = function(args) {
  'use strict';
  return this.spawnAdb(['shell'].concat(args));
};

/**
 * Spawns a background "adb shell su" command.
 *
 * @param {Array} args command args, as in process.spawn.
 * @return {webdriver.promise.Promise} resolve({Process} proc).
 */
Adb.prototype.spawnSu = function(args) {
  'use strict';
  return this.formatSuArgs(args).then(function(shellArgs) {
    return this.spawnShell(shellArgs);
  }.bind(this));
};

/**
 * Schedules a check if a given path (including wildcards) exists on device.
 *
 * @param {string} path  the path to check.
 * @return {webdriver.promise.Promise}  Resolves to true if exists, or false.
 */
Adb.prototype.exists = function(path) {
  'use strict';
  return this.shell(['ls', path, '>', '/dev/null', '2>&1', ';', 'echo', '$?'])
      .then(function(stdout) {
    return stdout.trim() === '0';
  }.bind(this));
};

/**
 * Gets the device's writable storage path.
 *
 * @return {webdriver.promise.Promise} resolve(String path).
 */
Adb.prototype.getStoragePath = function() {
  'use strict';
  var tryRemainingPaths = (function(pathsToTry) {  // Modifies pathsToTry
    return this.app_.schedule('getStoragePath', function() {
      if (this.storagePath_) {
        return this.storagePath_;
      }
      var path = pathsToTry.shift();
      if (!path) {
        throw new Error('Unable to find storage path');
      }
      return this.shell(['[[ -w "' + path + '" ]] && (' +
          'touch "' + path + '/adb_test" && rm "' + path + '/adb_test"' +
          ') &>/dev/null && echo "' + path + '"']).then(
          function(stdout) {
        var resolvedPath = stdout.trim(); // remove newline.
        if (!resolvedPath) {
          return tryRemainingPaths(pathsToTry);
        }
        logger.debug('Found storage path %s --> %s', path, resolvedPath);
        // Return the resolved path (e.g. '/sdcard' not '$EXTERNAL_STORAGE'),
        // so the caller can `adb push/pull` files to the absolute path.
        this.storagePath_ = resolvedPath;
        return resolvedPath;
      }.bind(this));
    }.bind(this));
  }.bind(this));
  return tryRemainingPaths(STORAGE_PATHS_.slice());
};

/**
 * Schedules a promise resolved with pid's of process(es) with a given name.
 *
 * So far only supports non-package binary names, e.g. 'tcpdump'.
 *
 * @param {string} name  the process name to check.
 * @return {webdriver.promise.Promise} Resolves to Array of pid's as strings.
 */
Adb.prototype.getPidsOfProcess = function(name) {
  'use strict';
  return this.shell(['ps', name]).then(function(stdout) {
    var pids = [];
    var lines = stdout.split(/[\r\n]+/);
    if (lines.length === 0 || lines[0].indexOf('USER ') !== 0) {  // Heading.
      throw new Error(util.format('ps command failed, output: %j', stdout));
    }
    lines.forEach(function(line, iLine) {
      if (line.length === 0) {
        return;  // Skip empty lines (last line in particular).
      }
      var fields = line.split(/\s+/);
      if (iLine === 0) {  // Skip the header
        return;
      }
      if (fields.length !== 9) {
        throw new Error(util.format('Failed to parse ps output line %d: %j',
            iLine, stdout));
      }
      pids.push(fields[1]);
    }.bind(this));
    return pids;
  }.bind(this));
};

/**
 * Kills any running processes with a given name, using a given signal.
 *
 * Requires root.
 *
 * @param {string} processName  the process name to kill.
 * @param {string} signal  the signal name for the kill, 'INT' by default.
 */
Adb.prototype.scheduleKill = function(processName, signal) {
  'use strict';
  this.getPidsOfProcess(processName).then(function(pids) {
    pids.forEach(function(pid) {
      this.su(['kill', '-' + (signal || 'SIGINT'), pid]);
    }.bind(this));
  }.bind(this));
};

/**
 * Schedules a promise resolved with matching process names.
 *
 * More precisely, matches ps output lines starting with the process name.
 *
 * @param {string} nameRegex  the regular expression to match for.
 * @return {webdriver.promise.Promise} Resolves to Array of strings.
 */
Adb.prototype.getMatchingProcessNames = function(nameRegex) {
  'use strict';
  return this.shell(['ps']).then(function(stdout) {
    var processNames = [];
    var lines = stdout.split(/\r?\n/);
    if (lines.length === 0 || lines[0].indexOf('USER ') !== 0) {  // Heading.
      throw new Error(util.format('ps command failed, output: %j', stdout));
    }
    lines.forEach(function(line) {
      // Extract the 9th element of the ps output line, if it has no spaces.
      var match = line.match(/(?:\s*\S+\s+){8}(\S+)$/);
      if (match && nameRegex.test(match[1])) {
        processNames.push(match[1]);
      }
    }.bind(this));
    return processNames;
  }.bind(this));
};

/**
 * Runs adb force-stop for all running packages mathcing the given regex.
 *
 * @param {string} nameRegex
 */
Adb.prototype.scheduleForceStopMatchingPackages = function(nameRegex) {
  'use strict';
  this.getMatchingProcessNames(nameRegex).then(function(packageNames) {
    packageNames.forEach(function(packageName) {
      this.shell(['am', 'force-stop', packageName.trim()]);
    }.bind(this));
  }.bind(this));
};

/**
 * Returns the network interfaces and their state.
 *
 * Output format up to Honeycomb:
 *   usb0 UP 192.168.1.67 255.255.255.192 0x00001043
 * IceCreamSandwich+:
 *   usb0 UP 192.168.1.68/28 0x00001002 02:00:00:00:00:01
 *
 * @return {webdriver.promise.Promise} Resolves to an Array of Objects, e.g.:
 *    [{name: 'wlan0', isUp: true, ip: '1.2.3.4', mac: ...}, ...]
 */
Adb.prototype.scheduleGetNetworkConfiguration = function() {
  'use strict';
  return this.shell(['netcfg']).then(function(stdout) {
    var ret = [];
    stdout.split(/[\r\n]+/).forEach(function(line, lineNumber) {
      line = line.trim();
      if (!line) {
        return;  // Skip empty lines.
      }
      var fields = line.split(/\s+/);
      if (fields.length !== 5) {
        throw new Error(util.format('netcfg output unrecognized at line %d: %j',
            lineNumber, stdout));
      }
      var ifc = {};
      ifc.name = fields[0];
      ifc.isUp = (fields[1] == 'UP');
      var ip = fields[2].replace(/\/\d+$/, '');
      if (ip !== '0.0.0.0') {
        ifc.ip = ip;
      }
      if (/^0x/.test(fields[3])) {
        ifc.mac = fields[4];
      }
      ret.push(ifc);
    }.bind(this));
    return ret;
  }.bind(this));
};

/**
 * Returns the name of the single currently-connected interface.
 *
 * @return {webdriver.promise.Promise} Resolves to the interface name, or
 *    an error if zero or more than one interface is connected.
 */
Adb.prototype.scheduleDetectConnectedInterface = function() {
  'use strict';
  return this.scheduleGetNetworkConfiguration().then(function(netcfg) {
    var ifnames = netcfg.filter(function(ifc) {
      return (ifc.isUp && 'lo' !== ifc.name && !!ifc.ip);
    }).map(function(ifc) {
      return ifc.name;
    });
    if (ifnames.length !== 1) {
      throw new Error(util.format(
          '%s connected interfaces detected: %j',
          (ifnames.length === 0 ? 'Zero' : 'More than one'), ifnames));
    }
    return ifnames[0];
  }.bind(this));
};

/**
 * Throws an error if the battery temperature is greater than maxTemp.
 *
 * @param {number} maxTemp Celsius, e.g. 39.0 (== 102F).
 */
Adb.prototype.scheduleCheckBatteryTemperature = function(maxTemp) {
  'use strict';
  this.shell(['cat', '/sys/class/power_supply/battery/temp']).then(
      function(stdout) {
    if ((/^\d+$/).test(stdout.trim())) {
      var deviceTemp = parseInt(stdout.trim(), 10) / 10.0;
      if (deviceTemp > maxTemp) {
        throw new Error('Temperature ' + deviceTemp + ' > ' + maxTemp);
      }
    } else {
      throw new Error('Device temperature not available');
    }
  }.bind(this));
};

/**
 * Checks for the application error dialog or USB debugging dialog and send
 * keyboard commands to dismiss it.
 */
Adb.prototype.scheduleDismissSystemDialog = function() {
  'use strict';
  this.shell(['dumpsys', 'window', 'windows']).then(function(stdout) {
    var appError = /Window #[^\n]*Application Error\:/;
    var usbDebugging = /Window #[^\n]*systemui\.usb\.UsbDebuggingActivity/;
    if (appError.test(stdout) || usbDebugging.test(stdout)) {
      logger.warn('System dialog detected, dismissing it.');
      this.shell(['input', 'keyevent', 'KEYCODE_DPAD_RIGHT']);
      this.shell(['input', 'keyevent', 'KEYCODE_DPAD_RIGHT']);
      this.shell(['input', 'keyevent', 'KEYCODE_ENTER']);
    }
  }.bind(this));
};

/**
 * Returns a MAC address based on our device's serial id.
 *
 * Our only requirements are that the returned MAC address must be
 *   (1) deterministic (to support lease renewal and static DHCP), and
 *   (2) unique (impossible in theory, but works fine in practice).
 * so we use a hash, e.g.:
 *   serial='HT7c123abcf7'
 *   h="$(echo -n $serial | md5sum -)"  # ffd8c274e4...; on Mac use |md5)"
 *   mac="02:00:${h::2}:${h:2:2}:${h:4:2}:${h:6:2}"  # '02:00:ff:d8:c2:74'
 *
 * @return {string} A MAC address.
 * @private
 */
Adb.prototype.computeMacForRndis_ = function() {
  'use strict';
  // e.g. serial = '05912b170024c3bd'
  var hc = murmurhash(this.serial, 0);
  // e.g. hc = 113472323
  var s = hc.toString(16);
  // e.g. s = '6c37343'
  while (s.length < 8) {
    s = '0' + s;
  }
  // e.g. s = '06c37343'
  var ret = '';
  var i;
  for (i = 6; i >= 0; i -= 2) {
    ret += ':' + s.substring(i, i + 2);
  }
  // e.g. s = ':43:73:c3:06'
  ret = '02:00' + ret;
  // e.g. s = '02:00:43:73:c3:06'
  return ret;
};

/**
 * Returns the RNDIS entry.
 *
 * @param {Array.<Object>} netcfg from scheduleGetNetworkConfiguration().
 * @return {Object} member of netcfg, or undefined.
 * @private
 */
Adb.prototype.getRndisIfc_ = function(netcfg) {
  'use strict';
  var ret;
  netcfg.forEach(function(ifc) {
    if ('rndis0' === ifc.name ||  // Prefer rndis0 over usb0.
        ('usb0' === ifc.name && undefined === ret)) {
      ret = ifc;
    }
  });
  return ret;
};

/**
 * Verifies that RNSID is correctly enabled.
 *
 * @return {webdriver.promise.Promise} resolve() for addErrback.
 */
Adb.prototype.scheduleAssertRndisIsEnabled = function() {
  'use strict';
  return this.scheduleGetNetworkConfiguration().then(function(netcfg) {
    var ifc = this.getRndisIfc_(netcfg);
    var mac = this.computeMacForRndis_();
    var badNames = netcfg.filter(function(o) {
      return (o.isUp && 'lo' !== o.name && (!ifc || ifc.name !== o.name));
    }).map(function(o) { return o.name; });
    var err = (
        badNames.length !== 0 ? 'Non-rndis ' + badNames.join(' ') + ' is UP' :
        !ifc ? 'netcfg lacks rndis interface' :
        !ifc.isUp ? ifc.name + ' is DOWN' :
        !ifc.ip ? ifc.name + ' lacks IP address' :
        mac !== ifc.mac ? ifc.name + ' MAC ' + ifc.mac + ' != ' + mac :
        undefined);
    if (undefined !== err) {
      throw new Error(err);
    }
  }.bind(this));
};

/**
 * Enables Reverse USB Tethering via RNDIS.
 *
 * @return {webdriver.promise.Promise} resolve() for addErrback.
 */
Adb.prototype.scheduleEnableRndis = function() {
  'use strict';
  return this.app_.schedule('Enable rndis', function() {
    this.shell(['getprop', 'sys.usb.config']).then(function(stdout) {
      if ('rndis,adb' !== stdout.trim()) {
        // Enable rndis property.
        this.su(['setprop', 'sys.usb.config', 'rndis,adb']);

        // Wait for device to come back online (<1s).
        this.adb(['wait-for-device']);
      }
    }.bind(this));

    this.scheduleGetNetworkConfiguration().then(function(netcfg) {
      var ifc = this.getRndisIfc_(netcfg);
      if (!ifc) {
        throw new Error('netcfg lacks rndis interface');
      }
      var ifname = ifc.name;

      // Stop WiFi if enabled.
      var hasWifi = netcfg.some(function(ifc2) {
        return ifc2.isUp && (/^wlan\d+$/).test(ifc2.name);
      });
      if (hasWifi) {
        //this.su(['wpa_cli', 'terminate']);
        this.su(['svc', 'wifi', 'disable']);
      }

      // Take all other interfaces down.
      netcfg.forEach(function(ifc2) {
        if (ifc2.isUp && 'lo' !== ifc2.name && ifname !== ifc2.name) {
          this.su(['ifconfig', ifc2.name, 'down']);
        }
      }.bind(this));

      // Set MAC address.
      this.su(['ifconfig', ifname, 'down']);
      this.su(['netcfg', ifname, 'hwaddr', this.computeMacForRndis_()]);
      this.su(['ifconfig', ifname, 'up']);

      // Enable DHCP -- this will timeout after 10s.
      this.su(['netcfg', ifname, 'dhcp']).addErrback(function(e) {
        throw new Error('Offline or no DHCP offer: ' + e.message);
      });

      // Configure DNS.
      this.shell(['getprop', 'net.' + ifname + '.dns1']).then(function(s1) {
        this.shell(['getprop', 'net.' + ifname + '.dns2']).then(function(s2) {
          var ips = [s1.trim(), s2.trim()].filter(
              /./.test.bind(/^\d+(\.\d+)+$/));
          this.su(['ndc', 'resolver', 'setifdns', ifname].concat(ips));
        }.bind(this));
      }.bind(this));
      this.su(['ndc', 'resolver', 'setdefaultif', ifname]);
    }.bind(this));

    // Sanity check -- sometimes the above 'up' and/or 'dhcp' commands randomly
    // fail.  We'll let our caller retry if desired.
    this.scheduleAssertRndisIsEnabled();
  }.bind(this));
};

/**
 * Disables Reverse USB Tethering via RNDIS.
 */
Adb.prototype.scheduleDisableRndis = function() {
  'use strict';
  this.su(['setprop', 'sys.usb.config', 'adb']);
};

/**
 * Returns the gateway's IP, which should always be pingable.
 *
 * @param {string=} ifname expected interface name, defaults to any.
 * @return {webdriver.promise.Promise} Resolves to the gateway ip.
 */
Adb.prototype.scheduleGetGateway = function(ifname) {
  'use strict';
  // Could use `ip route show`, but that's JB+ only.
  return this.shell(['cat', '/proc/net/route']).then(function(stdout) {
    var ret = null;
    stdout.split(/[\r\n]+/).forEach(function(line) {
      var m = line.match(/^\s*(\S+)\s+00000000\s+([0-9a-fA-F]{8})\s/);
      if (m && (!ifname || m[1] === ifname)) {
        var hexIp = m[2];
        // Decode '4E38220C' to '12.34.56.78' -- there's likely a better way:
        ret = util.format('%d.%d.%d.%d',
            parseInt(hexIp.substr(6, 2), 16),
            parseInt(hexIp.substr(4, 2), 16),
            parseInt(hexIp.substr(2, 2), 16),
            parseInt(hexIp.substr(0, 2), 16));
      }
    });
    if (!ret) {
      throw new Error(
          'Unable to find' + (!ifname ? '' : (' ' + ifname + '\'s')) +
          ' gateway: ' + stdout);
    }
    return ret;
  });
};

/**
 * @param {string} ip address to ping.
 * @return {webdriver.promise.Promise} Resolves to the average round trip
 * time in seconds, or an error if all pings failed.
 */
Adb.prototype.schedulePing = function(ip) {
  'use strict';
  // Send 3 pings, 0.2s apart, 5s deadline (could add '-r' for LAN-only)
  return this.shell(['ping', '-c3', '-i0.2', '-w5', ip]).then(
      function(stdout) {
    var ret;
    stdout.split(/[\r\n]+/).forEach(function(line) {
      var m = line.match(/^\s*rtt\s[^=]*=[^\/]*\/(\d+\.\d+)\/.*$/);
      if (m) {
        ret = parseFloat(m[1]) / 1000.0;
      }
    });
    if (undefined === ret) {
      throw new Error('Unexpected ping output: ' + stdout);
    }
    return ret;
  }, function(e) {
    throw new Error('Unable to ping ' + ip + ': ' + e.message);
  });
};
