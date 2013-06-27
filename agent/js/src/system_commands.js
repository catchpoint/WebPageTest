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

/** @private */
var UNIX_ = 0;
/** @private */
var WIN32_ = 1;
/** @private */
var PLATFORM_TYPES_ = {
  'darwin': UNIX_,
  'freebsd': UNIX_,
  'linux': UNIX_,
  'unix': UNIX_,
  'win32': WIN32_
};

var commands = {};


/**
 * set sets a native platform dependent command.
 *
 * @param {string} desc a human readable description of the command.
 * @param {string} command the platform dependent command.
 * @param {string} platform name, one of: darwin, linux, unix, win32.
 */
exports.set = function(desc, command, platform) {
  'use strict';
  var platformId = PLATFORM_TYPES_[platform];
  if (undefined === platformId) {
    throw new Error('Unknown platform: ' + platform);
  }
  if (undefined === commands[desc]) {
    commands[desc] = {};
  }

  commands[desc][platformId] = command;
};

/**
 * get returns the correct platform dependent command for the current platform.
 *
 * @param {string} desc the human readable description of the command.
 * @param {string[]} args an array of arguments which will be parsed and
 *   inserted into the command for $0, $1, etc.
 * @return {string} the command.
 */
exports.get = function(desc, args) {
  'use strict';
  var platformId = PLATFORM_TYPES_[process.platform];
  if (undefined === platformId) {
    throw new Error('Unknown process.platform: ' + process.platform);
  }
  var command = commands[desc][platformId];
  if (undefined === command) {
    throw new Error(
        'Unknown command ' + desc + ' for platform ' + process.platform);
  }

  // Positional arg substitution, count backward to avoid overlap of $10 and $1.
  if (args) {
    var iArg;
    for (iArg = args.length - 1; iArg >= 0; iArg -= 1) {
      command = command.replace('$' + iArg, args[iArg]);
    }
  }

  return command;
};
