var child_process = require('child_process');
var nopt = require('nopt');
var path = require('path');

var flagDefs = {
  knownOpts: {
    devtools2har_jar: [String, null],
    devtools_log: [String, null],
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
