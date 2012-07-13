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
var nopt = require('nopt');
var path = require('path');

var flagDefs = {
  knownOpts: {
    devtools2har_jar: [String, null],
    devtools_log: [String, null]
  },
  shortHands: {}
};

var JAVA_COMMAND_ = 'java';
var devToolsToHarJar_;


function devToolsToHar(devToolsLogPath, harPath, callback) {
  'use strict';
  if (!devToolsToHarJar_) {
    throw new Error('Internal error: devtools2har.jar path is not set.');
  }

  var javaArgs = [
      '-jar', devToolsToHarJar_,
      devToolsLogPath,
      harPath
  ];
  console.log('Starting devtools2har: %s %s',
      JAVA_COMMAND_, javaArgs.join(' '));
  var serverProcess = child_process.spawn(JAVA_COMMAND_, javaArgs);
  serverProcess.on('exit', function(code, signal) {
    console.log('devtools2har exit code %s, signal %s', code, signal);
    if (code === 0) {
      callback();
    } else {
      throw new Error(
          'devtools2har failed, exit code ' + code + ', signal ' + signal);
    }
  });
  serverProcess.stdout.on('data', function(data) {
    console.log('devtools2har STDOUT: %s', data);
  });
  serverProcess.stderr.on('data', function(data) {
    console.log('devtools2har  STDERR: %s', data);
  });
}
exports.devToolsToHar = devToolsToHar;

function setDevToolsToHarJar(devToolsToHarJar) {
  'use strict';
  devToolsToHarJar_ = devToolsToHarJar;
}
exports.setDevToolsToHarJar = setDevToolsToHarJar;

function main(flags) {
  'use strict';
  
  setDevToolsToHarJar(flags.devtools2har_jar);
  devToolsToHar(flags.devtools_log, 'out.har', function() {
    console.log('converted to out.har');
  });
}

if (require.main === module) {
  main(nopt(flagDefs.knownOpts, flagDefs.shortHands, process.argv, 2));
}
