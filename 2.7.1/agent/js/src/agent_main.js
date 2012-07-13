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

var devtools2har = require('devtools2har');
var fs = require('fs');
var nopt = require('nopt');
var wd_server = require('wd_server');
var wpt_client = require('wpt_client');
var vm = require('vm');

var flagDefs = {
  knownOpts: {
    wpt_server: [String, null],
    location: [String, null],
    java: [String, null],
    selenium_jar: [String, null],
    chromedriver: [String, null],
    devtools2har_jar: [String, null],
  },
  shortHands: {}
};

var HAR_FILE_ = './results.har';
var DEVTOOLS_EVENTS_FILE_ = './devtools_events.json';


/**
 * Creates a sandbox (map) in which to run a user script.
 *
 * @param seeds a map of additional stuff to put in the sandbox.
 * @return a map to use as the sandbox for the vm API.
 */
function createSandbox(seeds) {
  'use strict';
  var sandbox = {
    'console': console,
    'setTimeout': global.setTimeout
  };
  for (var property in seeds) {
    if (seeds.hasOwnProperty(property)) {
      console.log('Copying seed property into sandbox: %s', property);
      sandbox[property] = seeds[property];
    }
  }
  return sandbox;
}


function deleteHarTempFiles() {
  'use strict';
  for (var path in [DEVTOOLS_EVENTS_FILE_, HAR_FILE_]) {
    try {
      fs.unlinkSync(path);
    } catch (e) {
      // Ignore exception if the file does not exist
    }
  }
}

function convertDevToolsToHar(devToolsMessages, harCallback) {
  'use strict';
  deleteHarTempFiles();
  fs.writeFileSync(
      DEVTOOLS_EVENTS_FILE_, JSON.stringify(devToolsMessages), 'UTF-8');
  devtools2har.devToolsToHar(DEVTOOLS_EVENTS_FILE_, HAR_FILE_, function() {
    var harContent = fs.readFileSync(HAR_FILE_, 'UTF-8');
    deleteHarTempFiles();
    harCallback(harContent);
  });
}

function run(client) {
  'use strict';
  var wdServer;

  client.on('job', function(job) {
    console.log('Running job: %s', job.id);
    if ('script' in job.task) {
      console.log('Running script: %s', job.task.script);
      wdServer = new wd_server.WebDriverServer({
          browserName: job.task.browser
      });
      wdServer.on('connect', function(webdriverNamespace) {
        var sandbox = createSandbox({
          'webdriver': webdriverNamespace
        });

        console.log('sandbox: %s', JSON.stringify(sandbox));
        // TODO(klm): fork() and run in a separate process, kill on timeout,
        // communicate job events via the fork() communication channel.
        vm.runInNewContext(job.task.script, sandbox, 'WPT Job Script');
      });
      wdServer.on('done', function(devToolsMessages, devToolsTimelineMessages) {
        if (devToolsTimelineMessages) {
          var timelineResult = new wpt_client.ResultFile(
              wpt_client.ResultFile.ResultType.TIMELINE,
              'timeline.json',
              'application/json',
              JSON.stringify(devToolsTimelineMessages));
          job.resultFiles.push(timelineResult);
        }
        if (devToolsMessages) {
          convertDevToolsToHar(devToolsMessages, function(harContent) {
            var harResult = new wpt_client.ResultFile(
                wpt_client.ResultFile.ResultType.HAR,
                'results.har',
                'application/json',
                harContent);
            job.resultFiles.push(harResult);
            job.done();
          });
        } else {
          job.done();
        }
      });
      wdServer.on('error', function(e) {
        job.error = e;
        job.done();
      });
      wdServer.connect();
    }
  });

  client.on('timeout', function(job) {
    console.error('Stopping WD server for timed out job %s', job.id);
    if (wdServer) {
      wdServer.stop();
    }
  });

  client.run(/*forever=*/true);
}

function main(flags) {
  'use strict';
  if (flags.java) {
    wd_server.setJavaCommand(flags.java);
  }
  if (flags.selenium_jar) {
    wd_server.setServerJar(flags.selenium_jar);
  } else {
    throw new Error('Flag --selenium_jar is required');
  }
  if (flags.chromedriver) {
    wd_server.setChromeDriver(flags.chromedriver);
  }
  if (flags.devtools2har_jar) {
    devtools2har.setDevToolsToHarJar(flags.devtools2har_jar);
  } else {
    throw new Error('Flag --devtools2har_jar is required');
  }
  var client = new wpt_client.Client(flags.wpt_server, flags.location);
  run(client);
}

if (require.main === module) {
  main(nopt(flagDefs.knownOpts, flagDefs.shortHands, process.argv, 2));
}
