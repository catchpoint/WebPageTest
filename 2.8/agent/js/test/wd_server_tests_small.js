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

var sinon = require('sinon');
var should = require('should');
var child_process = require('child_process');
var vm = require('vm');
var devtools = require('devtools');
var devtools2har = require('devtools2har');
var devtools_network = require('devtools_network');
var devtools_page = require('devtools_page');
var devtools_timeline = require('devtools_timeline');
var webdriver = require('webdriver');
var logger = require('logger');
var system_commands = require('system_commands');
var agent_main = require('agent_main');
var wd_server = require('wd_server');
var wd_sandbox = require('wd_sandbox');
var wpt_client = require('wpt_client');
var test_utils = require('./test_utils.js');

var WPT_SERVER = process.env.WPT_SERVER || 'http://localhost:8888';
var LOCATION = process.env.LOCATION || 'TEST';

describe('wd_server small', function() {
  afterEach(function() {
    test_utils.restoreStubs();
  });

  before(function() {
    agent_main.setSystemCommands();
    // Needed because in the local context process has no send method
    process.send = function(m, args) { }
  });

  //TODO (gpeal): remove sinon.test?
  it('should require selenium jar and devtools2har jar', sinon.test(function() {
    var mainRunStub = sinon.stub(agent_main, 'run', function() { });
    test_utils.registerStub(mainRunStub);
    var clientStub = sinon.stub(wpt_client, 'Client', function() { });
    test_utils.registerStub(clientStub);


    var flags = {};
    var runMainWithFlags = function() {
      agent_main.main(flags);
    };

    runMainWithFlags.should.throw();


    flags.selenium_jar = 'jar';
    runMainWithFlags.should.throw();

    flags.selenium_jar = undefined;
    flags.devtools2har_jar = 'jar';
    runMainWithFlags.should.throw();

    flags.selenium_jar = 'jar';

    agent_main.main(flags);
    agent_main.run.called.should.be.ok;
  }));

  it('should be able to run a script', function() {
    var script_ = '/*navigate  google.com*/' +
      'driver  = new webdriver.Builder().build();' +
      'driver.get("http://www.google.com");' +
      'driver.findElement(webdriver.By.name("q")).sendKeys("webdriver");' +
      'driver.findElement(webdriver.By.name("btnG")).click();' +
      'driver.wait(function()  {return  driver.getTitle();' +
      '});';
    var sandbox_ = {a: function() {}, b: 10, c: 'abc'};
    var description_ = 'WPT Job Script';
    var vmStub = sinon.stub(vm, 'runInNewContext',
        function(script, sandbox, description) {
      should.equal(script_, script);
      should.equal(sandbox_, sandbox_);
      should.equal(description_, description);
    });
    test_utils.registerStub(vmStub);

    wd_server.WebDriverServer.runScript_(script_, sandbox_, description_);
  });

  it('should be able to schedule a timeout to let the browser coalesce',
      function() {
    var description_ = 'Wait to let the browser coalesce';
    var timeout_ = 1337;
    var sandboxWdApp = {
      scheduleTimeout: function(description, timeout) {
        should.equal(description_, description);
        should.equal(timeout_, timeout);
      }
    };

      wd_server.WebDriverServer.waitForCoalesce(sandboxWdApp, timeout_);
  });

  it('should be able to receive devtools messages ' +
    'and devtools timeline messages', function() {
    var devToolsTimelineMessage = {method: 'Timeline.eventRecorded',
                                   params: {record:
                                               {startTime: 1344629182997.628,
                                                data: {},
                                                type: 'BeginFrame',
                                                'usedHeapSize': 16067872,
                                                'totalHeapSize': 23725824
                                               }
                                             }
                                  };
    var devToolsMessage = {method: 'Network.dataReceived',
                           params: {requestId: '9.17',
                                     'timestamp': 1344629364.669511,
                                     'dataLength': 22,
                                     'encodedDataLength': 1208
                                    }
                          };

    wd_server.WebDriverServer.init();

    wd_server.WebDriverServer.onDevToolsMessage_(devToolsTimelineMessage);
    wd_server.WebDriverServer.onDevToolsMessage_(devToolsMessage);
    wd_server.WebDriverServer.onDevToolsMessage_(devToolsMessage);
    wd_server.WebDriverServer.onDevToolsMessage_(devToolsTimelineMessage);

    should.equal(wd_server.WebDriverServer.devToolsTimelineMessages_[0],
      devToolsTimelineMessage);
    should.equal(wd_server.WebDriverServer.devToolsTimelineMessages_[1],
      devToolsTimelineMessage);
    should.equal(wd_server.WebDriverServer.devToolsTimelineMessages_[2],
      undefined);

    should.equal(wd_server.WebDriverServer.devToolsMessages_[0],
      devToolsMessage);
    should.equal(wd_server.WebDriverServer.devToolsMessages_[1],
      devToolsMessage);
    should.equal(wd_server.WebDriverServer.devToolsMessages_[2],
      undefined);
  });

  it('should be able to make a sandbox with console, ' +
     'setTimeout, and arbitrary seeds', function() {
    var seedFunction1 = function() {
      return '1';
    };
    var seedFunction2 = function() {
      return '2';
    };
    var seeds = {seedFunction1: seedFunction1, seedFunction2: seedFunction2,
      seed3: 'abc', seed4: 123};

    var sandbox = wd_server.WebDriverServer.createSandbox_(seeds);
    should.equal(typeof sandbox.console, 'object');
    should.equal(typeof sandbox.setTimeout, 'function');
    should.equal(sandbox.seedFunction1, seedFunction1);
    should.equal(sandbox.seedFunction2, seedFunction2);
    should.equal(sandbox.seed3, 'abc');
    should.equal(sandbox.seed4, 123);
  });

  it('should fail if you try to start the webdriver server before ' +
     'setting the server jar', function() {
    wd_server.WebDriverServer.selenium_jar = undefined;
    wd_server.WebDriverServer.startServer_.should.throw();
  });

  it('should be able to set the driver', function() {
    var wdNamespace = 'chrome wd namespace';
    var driver = 'this is a driver';
    var connectDevToolsSpy = sinon.spy();
    var connectDevToolsStub = sinon.stub(wd_server.WebDriverServer,
        'connectDevTools_', connectDevToolsSpy);
    test_utils.registerStub(connectDevToolsStub);


    wd_server.WebDriverServer.onDriverBuild_(driver, { browserName: 'chrome' },
        wdNamespace);

    should.ok(connectDevToolsSpy.withArgs(wdNamespace).calledOnce);
    should.equal(wd_server.WebDriverServer.driver_, driver);
  });

  it('should stop and emit error on onError_',
      function(done) {
    var error = 'this is an error';
    var stopSpy = sinon.spy();
    var stopStub = sinon.stub(wd_server.WebDriverServer, 'stop', stopSpy);
    test_utils.registerStub(stopStub);

    var processSendStub = sinon.stub(process, 'send', function(m) {
      should.equal(m.cmd, 'error');
      should.equal(m.e, error);
      done();
    });
    test_utils.registerStub(processSendStub);

    wd_server.WebDriverServer.onError_(error);

    should.ok(stopSpy.calledOnce);
  });

  it('should try to quit the driver and kill the server process on stop',
      function() {
    var quitDriverTimesCalled = 0;
    var quitDriver = function() {
      quitDriverTimesCalled++;
      return { then: function(callback, callback2) { callback(); } };
    }
    wd_server.WebDriverServer.driver_ = { quit: quitDriver };

    wd_server.WebDriverServer.serverProcess_ = {};
    var handler = function() { return 'this is the exception handler'; };
    wd_server.WebDriverServer.uncaughtExceptionHandler_ = handler;


    var removeListenerSpy = sinon.spy();
    var removeListenerStub = sinon.stub(process, 'removeListener',
        removeListenerSpy);
    test_utils.registerStub(removeListenerStub);


    var killServerProcessSpy = sinon.spy();
    var killServerProcessStub = sinon.stub(wd_server.WebDriverServer,
        'killServerProcess', killServerProcessSpy);
    test_utils.registerStub(killServerProcessStub);

    wd_server.WebDriverServer.stop();

    should.ok(removeListenerSpy.calledOnce);
    should.ok(removeListenerSpy.calledWith('uncaughtException', handler));
    should.equal(quitDriverTimesCalled, 1);
    should.ok(killServerProcessSpy.calledOnce);
  });

  it('should correctly handle uncaught exceptions', function() {
    var e = 'this is an error';
    var processSendStub = sinon.stub(process, 'send', function(m) {
      should.equal(m.cmd, 'error');
      should.equal(m.e, e);
    });
    var stopSpy = sinon.spy();
    var stopStub = sinon.stub(wd_server.WebDriverServer, 'stop', stopSpy);
    test_utils.registerStub(stopStub);

    wd_server.WebDriverServer.onUncaughtException_(e);
    should.ok(stopSpy.calledOnce);
  });

  it('should properly try to connect the devtools', function() {
    var wdNamespace = {
      promise: {
        Application: {
          getInstance: function() {
            return {
              scheduleWait: function(desription, callback) { callback(); }
            };
          }
        },
        Deferred: function() { return { resolve: function() { } }; }
      }
    };

    var devtoolsConnectSpy = sinon.spy();
    var devtoolsConnectStub = sinon.stub(devtools.DevTools.prototype, 'connect',
        function() {
          this.emit('connect');
          this.emit('message');
        });
    test_utils.registerStub(devtoolsConnectStub);

    var networkToolsEnableSpy = sinon.spy();
    var networkToolsEnableStub = sinon.stub(devtools_network.Network.prototype,
        'enable', networkToolsEnableSpy);
    test_utils.registerStub(networkToolsEnableStub);

    var pageToolsEnableSpy = sinon.spy();
    var pageToolsEnableStub = sinon.stub(devtools_page.Page.prototype,
        'enable', pageToolsEnableSpy);
    test_utils.registerStub(pageToolsEnableStub);

    var timelineToolsEnableSpy = sinon.spy();
    var timelineToolsEnableStub =
        sinon.stub(devtools_timeline.Timeline.prototype,
        'enable', timelineToolsEnableSpy);
    test_utils.registerStub(timelineToolsEnableStub);

    var timelineToolsStartSpy = sinon.spy();
    var timelineToolsStartStub =
        sinon.stub(devtools_timeline.Timeline.prototype,
        'start', timelineToolsStartSpy);
    test_utils.registerStub(timelineToolsStartStub);

    var onDevtoolsMessageSpy = sinon.spy();
    var onDevtoolsMessageStub = sinon.stub(wd_server.WebDriverServer,
        'onDevToolsMessage_', onDevtoolsMessageSpy);

    wd_server.WebDriverServer.connectDevTools_(wdNamespace);

    should.ok(networkToolsEnableSpy.calledOnce);
    should.ok(pageToolsEnableSpy.calledOnce);
    should.ok(timelineToolsEnableSpy.calledOnce);
    should.ok(timelineToolsStartSpy.calledOnce);
    should.ok(onDevtoolsMessageSpy.calledOnce);
  });
});
