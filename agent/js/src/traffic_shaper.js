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

var fs = require('fs');
var logger = require('logger');
var process_utils = require('process_utils');

var MIN_RULE_ID = 10000;
var MAX_RULE_ID = 20000;

/**
 * @param {webdriver.promise.ControlFlow=} app the scheduler.
 * @param {Object.<string>} args options with string values:
 *   #param {string=} deviceAddr IP or MAC address, defaults to 'any'.
 *   #param {string=} ipfwCommand ipfw command, defaults to '/sbin/ipfw'.
 * @constructor
 */
function TrafficShaper(app, args) {
  'use strict';
  this.app_ = app;
  this.deviceAddr_ = (args.deviceAddr || 'any');
  this.idLocks_ = [];
  this.ipfwCommand_ = (args.ipfwCommand || '/sbin/ipfw');
}
/** Export class. */
exports.TrafficShaper = TrafficShaper;

//
// We'll assume the default configuration is:
//   65535 allow ip from any to any
// plus any user-defined rules, e.g.:
//   add 1000 allow ip from 172.31/24 to me
//   add 1000 allow ip from me to 172.31/24
//
// Our old "ipfw_config.sh" contained the following commands, which might be
// useful someday:
//   queue 1 config pipe 1 queue 100 noerror mask dst-port 0xffff
//   queue 2 config pipe 2 queue 100 noerror mask src-port 0xffff
//   add skipto 60000 proto tcp src-port 80 out
//   add skipto 60000 proto tcp dst-port 80 in
//   add skipto 60000 proto tcp src-port 445 out
//   add skipto 60000 proto tcp dst-port 445 in
//   add skipto 60000 proto tcp src-port 3389 out
//   add skipto 60000 proto tcp dst-port 3389 in
//   ipfw add queue 1 ip from any to any in
//   ipfw add queue 2 ip from any to any out
//   ipfw add 60000 allow ip from any to any
//

/**
 * @return {webdriver.promise.Promise} resolve({boolean} isSupported).
 * @private
 */
TrafficShaper.prototype.scheduleIsSupported_ = function() {
  'use strict';
  return this.app_.schedule('isSupported', function() {
    if (undefined !== this.isSupported_) {
      return this.isSupported_;
    }
    // Only test if the ipfw command exists if it has a '/' path; on NetBSD
    // the ipfw command is built-in and doesn't have a path.
    var testIfExists = (-1 !== this.ipfwCommand_.indexOf('/'));
    var commandExists = true;
    if (testIfExists) {
      process_utils.scheduleFunction(this.app_, 'Test if exists', fs.exists,
          this.ipfwCommand_).then(function(exists) {
        commandExists = exists;
      });
    }
    this.app_.schedule('Test ipfw list', function() {
      // If testIfExists, we get here only after the fs.exists() callback fired.
      if (!commandExists) {
        this.isSupported_ = false;
        return false;
      } else {
        return process_utils.scheduleExec(this.app_, this.ipfwCommand_,
            ['list']).then(function() {
          this.isSupported_ = true;
          return true;
        }.bind(this), function(e) {
          if (testIfExists) {
            var isPermit = (/not\s+permitted/i.test(e.message));
            logger.warn('%s exists but "list" fails: %s%s%s', this.ipfwCommand_,
                e.message, (isPermit ? '\nPossible fix:  sudo chmod +s ' : ''),
                (isPermit ? this.ipfwCommand_ : ''));
          }
          this.isSupported_ = false;
          return false;
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
};

/**
 * Apply shaping options.
 *
 * @param {Object} opts Traffic shaping options:
 *   #param {string=} dir 'in' or 'out'.
 *   #param {string} from 'any', MAC, or IP.
 *   #param {string} to 'any', MAC, or IP.
 *   #param {number} ruleId
 *   #param {number} pipeId
 *   #param {number=} bw in Kbit/s.
 *   #param {number=} latency in ms.
 *   #param {number=} plr output packet loss rate [0..1].
 * @private
 */
TrafficShaper.prototype.scheduleIpfw_ = function(opts) {
  'use strict';
  this.scheduleIsSupported_().then(function(isSupported) {
    if (!isSupported) {
      throw new Error(this.ipfwCommand_ + ' not found.' +
        ' To disable traffic shaping, re-run your test with ' +
        '"Advanced Settings > Test Settings > Connection = Native Connection"' +
        ' or add "connectivity=WiFi" to this location\'s WebPagetest config.');
    }
  }.bind(this));
  // ipfw add 100 pipe 1 ip from any to ip in
  var addr = (opts.from === 'any' ? opts.to : opts.from);
  // TODO for now we support both IP and MAC, but in practice we only use the
  // IP, so MAC support may be deprecated and removed in a future release.
  var proto = (
      'any' === addr ? 'ip' :
      /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(addr) ? 'mac' :
      /^[0-9a-f\.:\$\/]+$/i.test(addr) ? 'ip' : undefined);
  process_utils.scheduleExec(this.app_, this.ipfwCommand_,
      ['add', opts.ruleId, 'pipe', opts.pipeId].concat(
      'mac' === proto ? ['mac', opts.to, opts.from] :
          [proto, 'from', opts.from, 'to', opts.to]).concat(
      opts.dir ? [opts.dir] : []));
  // ipfw pipe 1 config bw 1234Kbit/s delay 1000ms plr 0.05
  process_utils.scheduleExec(this.app_, this.ipfwCommand_,
      ['pipe', opts.pipeId, 'config'].concat(
      opts.bw ? ['bw', opts.bw + 'Kbit/s'] : []).concat(
      opts.latency ? ['delay', opts.latency + 'ms'] : []).concat(
      opts.plr ? ['plr', opts.plr.toString()] : []));
};

/**
 * Starts traffic shaping.
 *
 * @param {number=} bwIn in Kbit/s.
 * @param {number=} bwOut in Kbit/s.
 * @param {number=} latency in ms.
 * @param {number=} plr output packet loss rate [0..1].
 */
TrafficShaper.prototype.scheduleStart = function(bwIn, bwOut, latency, plr) {
  'use strict';
  // Cleanup
  this.scheduleStop();

  var inOpts = {dir: 'in', from: 'any', to: this.deviceAddr_, bw: bwIn};
  var outOpts = {dir: 'out', from: this.deviceAddr_, to: 'any', bw: bwOut};

  // Divide latency equally
  if (latency) {
    inOpts.latency = Math.floor(latency / 2);
    outOpts.latency = latency - inOpts.latency;
  }

  // Incur all packet-loss-rate on the output.
  outOpts.plr = plr;

  [inOpts, outOpts].forEach(function(opts) {
    if (opts.bw || opts.latency || opts.plr) {
      if ('any' === this.deviceAddr_) {
        // Use the max ruleId & portId, to avoid non-'any' conflicts.
        opts.ruleId = MAX_RULE_ID - (opts === inOpts ? 1 : 0);
        opts.pipeId = opts.ruleId;
        this.scheduleIpfw_(opts);
      } else {
        // Select a unique ruleId, to avoid conflicts with other devices.
        // We could hash our deviceAddr_, but it's safer to use a port lock.
        // The selection can be non-deterministic.
        process_utils.scheduleAllocatePort(this.app_, 'Select IPFW ID',
             MIN_RULE_ID, MAX_RULE_ID - 2).then(function(alloc) {
          var port = alloc.port;
          this.idLocks_.push(alloc);
          opts.ruleId = port;
          opts.pipeId = port;
          this.scheduleIpfw_(opts);
        }.bind(this));
      }
    }
  }.bind(this));
};

/**
 * Create an `ipfw list` line matcher.
 *
 * @param {string} addr 'any', MAC, or IP.
 * @return {RegExp}
 * @private
 */
TrafficShaper.prototype.newIpfwListRegex_ = function(addr) {
  'use strict';
  // e.g.:
  //   2 pipe 3 ip from X to any out
  //   17 pipe 42 ip from any to any MAC any X
  function join(src, sep, dest) {
    return '(' + src + sep + dest +
        (src === dest ? '' : ('|' + dest + sep + src)) + ')';
  }
  function pair(src, dest) {
    return '(\\s+ip\\s+from\\s+' + join(src, '\\s+to\\s+', dest) +
        '|\\s+mac\\s+' + join(src, '\\s+', dest) + ')';
  }
  return new RegExp(
      '^\\s*(\\d+)\\s+pipe\\s+(\\d+)' +
      pair('any', 'any') + '*' +
      ('any' === addr ? '' :
        (pair('any', addr)) + pair('any', 'any') + '*') +
      '(\\s+(in|out))?\\s*$', 'i');
};

/**
 * Stop traffic shaping.
 */
TrafficShaper.prototype.scheduleStop = function() {
  'use strict';

  // Delete all rules & pipes for our deviceAddr_.
  //
  // If our deviceAddr_ is 'any' we could do:
  //   ipfw -q flush; ipfw -q pipe flush
  // but that'd also delete all non-'any' rules!
  this.scheduleIsSupported_().then(function(isSupported) {
    if (!isSupported) {
      return;
    }
    process_utils.scheduleExec(this.app_, this.ipfwCommand_, ['list']).then(
        function(stdout) {
      var ruleIds = {};
      var pipeIds = {};
      var regex = this.newIpfwListRegex_(this.deviceAddr_);
      var lines = stdout.trim().split('\n');
      lines.forEach(function(line) {
        var m = line.match(regex);
        if (m) {
          ruleIds[m[1]] = true;
          pipeIds[m[2]] = true;
        }
      }.bind(this));
      for (var ruleId in ruleIds) {
        process_utils.scheduleExec(this.app_, this.ipfwCommand_,
            ['delete', ruleId]);
      }
      function ignoreErrors() {
      }
      for (var pipeId in pipeIds) {
        process_utils.scheduleExec(this.app_, this.ipfwCommand_,
            ['pipe', 'delete', pipeId]).addErrback(ignoreErrors);
      }
    }.bind(this));
  }.bind(this));

  this.app_.schedule('Release ipfw ids', function() {
    var locks = this.idLocks_;
    this.idLocks_ = [];
    locks.forEach(function(lock) {
      lock.release();
    });
  }.bind(this));
};

