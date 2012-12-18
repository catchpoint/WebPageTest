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
/*global after: true, describe: true, before: true, afterEach: true, it: true*/

var sinon = require('sinon');
var should = require('should');
var webdriver = require('webdriver');
var devtools2har = require('devtools2har');
var system_commands = require('system_commands');
var agent_main = require('agent_main');
var wd_server = require('wd_server');
var wpt_client = require('wpt_client');
var test_utils = require('./test_utils.js');
var logger = require('logger');

var stubs = [];
var WPT_SERVER = process.env.WPT_SERVER || 'http://localhost:8888';
var LOCATION = process.env.LOCATION || 'TEST';

describe('wd_server large', function() {
  'use strict';

  afterEach(function() {
    test_utils.restoreStubs();
  });

  before(function(done) {
    agent_main.setSystemCommands();
    this.timeout(6000);

    // paths are normally set by flags in the run script but it isn't
    // in the test script so it needs to be set here
    system_commands.set('devtools2har path',
        '$0/webpagetest/lib/dt2har/target/' +
        'dt2har-1.0-SNAPSHOT-jar-with-dependencies.jar', 'linux');
    system_commands.set('devtools2har path',
        '$0\\webpagetest\\lib\\dt2har\\target\\' +
        'dt2har-1.0-SNAPSHOT-jar-with-dependencies.jar', 'win32');

    system_commands.set('selenium jar', process.env.SELENIUM_JAR, 'linux');
    system_commands.set('selenium jar', process.env.SELENIUM_JAR, 'win32');

    system_commands.set('chromedriver path', process.env.CHROMEDRIVER, 'linux');
    system_commands.set('chromedriver path', process.env.CHROMEDRIVER, 'win32');

    // Needed because in the local context process has no send method
    process.send = function(/*m, args*/) {};
    agent_main.cleanupJob();
    // Let cleanupJob finish
    setTimeout(function() {
      done();
    }, 2000);
  });

  it('should be able to start a server when the server jar is set',
      function(done) {
    this.timeout(120000);
    var existingServerProcessKilled = false;

    wd_server.WebDriverServer.seleniumJar_ = system_commands.get(
        'selenium jar');
    wd_server.WebDriverServer.javaCommand_ = 'java';
    wd_server.WebDriverServer.chromedriver_ = 'abc';

    wd_server.WebDriverServer.serverProcess_ = {
      kill: function() { existingServerProcessKilled = true; }
    };


    wd_server.WebDriverServer.startServer_.bind(wd_server.WebDriverServer)
        .should.not.throw();

    var wdApp = webdriver.promise.Application.getInstance();
    wdApp.schedule('Waiting for WD server to be ready', function() {
      if (!existingServerProcessKilled) {
        test_utils.failTest(
            "startServer should have killed an existing server but didn't");
      }
      wd_server.WebDriverServer.seleniumJar_ = undefined;
      wd_server.WebDriverServer.javaCommand_ = undefined;
      wd_server.WebDriverServer.chromedriver_ = 'def';
      wd_server.WebDriverServer.killServerProcess();
      logger.info('Waiting for server process to die');

      // Ensure the server process has died both for the completeness of this
      // test and to prevent it from interfering with other tests.
      // First condition handles short circuiting.
      if (wd_server.WebDriverServer.serverProcess_ &&
          wd_server.WebDriverServer.serverProcess_.killed) {
        done();
      } else {
        setTimeout(function() {
          if (wd_server.WebDriverServer.serverProcess_ &&
              !wd_server.WebDriverServer.serverProcess_.killed) {
            test_utils.failTest('Webdriver server started but could not ' +
                'be killed');
          } else {
            done();
          }
        }, 2000);
      }
    });
  });

  it('should be able to run an entire job', function(done) {
    this.timeout(120000);

    var responseBody = '{"Test ID":"120810_4P_D","url":"script:' +
        '\\/\\/120810_4P_D.pts","runs":1,"bwIn":0,"bwOut":0,"latency":0,' +
        '"plr":0,"browser":"chrome","script":"\\/*\\r\\nnavigate\\tgoogle.com' +
        '\\r\\n*\\/\\r\\ndriver\\t= new webdriver.Builder().build();' +
        '\\r\\ndriver.get(\'http:\\/\\/www.google.com\');' +
        '\\r\\ndriver.findElement(webdriver.By.name(\'q\'))' +
        '.sendKeys(\'webdriver\');' +
        '\\r\\ndriver.findElement(webdriver.By.name(\'btnG\')).click();' +
        '\\r\\ndriver.wait(function()\\t{\\r\\nreturn\\tdriver.getTitle();' +
        '\\r\\n});"}';
    var devtools2harJar = system_commands.get(
        'devtools2har path', [process.env.PROJECT_ROOT]);
    var flags = {
        wpt_server: WPT_SERVER,
        location: LOCATION,
        job_timeout: 60000
    };
    var jobCompleted = false;
    var responseCallbackCalled = false;
    agent_main.seleniumJar = system_commands.get('selenium jar');
    agent_main.chromedriver = system_commands.get('chromedriver path');

    // to begin the job
    var processResponseStub = sinon.stub(wpt_client, 'processResponse',
        function(response, callback) {
      if (!responseCallbackCalled) {
        responseCallbackCalled = true;
        callback(responseBody);
      }
    });
    test_utils.registerStub(processResponseStub);

    var cleanupJobStub = sinon.stub(agent_main, 'cleanupJob', function() {
      should.ok(jobCompleted);
      done();
    });
    test_utils.registerStub(cleanupJobStub);

    var client = new wpt_client.Client(
        flags.wpt_server, flags.location, undefined, flags.job_timeout);

    var jobFinished_ = client.jobFinished_;
    var jobFinishedStub = sinon.stub(client, 'jobFinished_',
        function(job, resultFile, isDone, callback) {
      if (typeof job.error !== 'undefined') {
        test_utils.failTest('Job failed with error: ' + job.error);
      }
      jobFinished_.call(job.client_, job, resultFile, isDone, callback);
      jobCompleted = true;
    });
    test_utils.registerStub(jobFinishedStub);

    devtools2har.setDevToolsToHarJar(devtools2harJar);
    agent_main.run(client);
  });

  after(function(done) {
    this.timeout(6000);
    agent_main.cleanupJob();
    setTimeout(function() {
      done();
    }, 2000);
  });
});
