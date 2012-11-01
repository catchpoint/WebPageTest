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

var child_process = require('child_process');
var logger = require('logger');
var system_commands = require('system_commands');


/**
 * commandExists checks if the command is on the system path.
 * If it is, it calls callback, otherwise it calls errback.
 *
 * @param  {String} command the command to check.
 * @param  {Function} callback called if the command is on the path.
 * @param  {Function} errback called if the command is not on the path.
 */
exports.commandExists = function(command, callback, errback)  {
  'use strict';
  system_commands.set(
      'command not found', 'bash: $0: command not found', 'linux');
  system_commands.set(
      'command not found', '\'$0\' is not recognized as an ' +
      'internal or external command, operable or batch file.', 'win32');

  child_process.exec(command, function(error, stdout, stderr) {
    if (error !== system_commands.get('command not found')) {
      callback(stdout, stderr);
    } else if (errback) {
      errback(error, stdout, stderr);
    } else {
      logger.error(
          'Command %s failed with error %s stdout:\n%s\nstderr:\n%s',
          command, error, stdout, stderr);
    }
  });
};
