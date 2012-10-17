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
var LINUX = 0;
var WIN32 = 1;

var commands = {};


/**
 * set sets a native platform dependent command.
 *
 * @param {String} desc a human readable description of the command.
 * @param {String} command the platform dependent command.
 * @param {String} platform name. Probably 'linux' or 'win32'.
 */
exports.set = function(desc, command, platform) {
   var platformId;
   switch (platform) {
    case 'linux':
    platformId = LINUX;
    break;
    case 'win32':
    platformId = WIN32;
    break;
    default:
    return;
  }
  if (typeof commands[desc] === 'undefined')
    commands[desc] = {};

  commands[desc][platformId] = command;
};

/**
 * get returns the correct platform dependent command for the current platform.
 *
 * @param  {String} desc the human readable description of the command.
 * @param  {String[]} args an array of arguments which will be parsed and
 *                    inserted into the command if applicable.
 *
 * @return {String} the command.
 */
exports.get = function(desc, args) {
   var platformId;
   switch (process.platform) {
    case 'linux':
    platformId = LINUX;
    break;
    case 'win32':
    platformId = WIN32;
    break;
    default:
    return '';
  }
  if (typeof commands[desc] === 'undefined')
    return '';

  var command = commands[desc][platformId] || '';

  for (var i in args)
    command = command.replace('$' + i, args[i]);

  return command;
};
