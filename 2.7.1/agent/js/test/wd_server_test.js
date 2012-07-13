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
/*jslint nomen:false*/
/*global assertEquals: true, assertFalse: true, assertMatch: true, assertNotNull: true, assertTrue: true */

var wd_server = require('wd_server');
var wd_sandbox = require('wd_sandbox');
var webdriver = require('webdriver');

wd_sandbox.createSandboxedWdNamespace = function(
    serverUrl, capabilities, afterBuildCb) {
  'use strict';

  var mainWdApp = webdriver.promise.Application.getInstance();
  mainWdApp.schedule('Create sandbox', function() {
    var isDriverBuilt = false;

    var operationNotPermitted = function(key) {
      throw new Error('Operation is not permitted: ' + key);
    };

    /**
     * A proxy for restricting access to Builder operations.
     * NOTE: the WebDriver instances returned by #build could
     * also be proxied to restrict access to internal state while
     * I work on refactoring the code.
     * @constructor
     */
    function ProtectedBuilder() {
      var builder = new webdriver.Builder()
          .usingServer(serverUrl)
          .withCapabilities(capabilities);

      for (var key in builder) {
        if (typeof builder[key] === 'function') {
          this[key] = operationNotPermitted.bind(key);
        }
      }

      this.build = function() {
        if (isDriverBuilt) {
          throw new Error('You may only create one driver');
        }
        var builtWd = builder.build();
        isDriverBuilt = true;
        afterBuildCb(builtWd, webdriver);
        return builtWd;
      };
    }

    return {
      Builder: ProtectedBuilder,
      By: webdriver.By,
      Key: webdriver.Key,
      promise: webdriver.promise,
      process: webdriver.process
    };
  });
};

var WebDriverServerTest = TestCase('WebDriverServerTest');

WebDriverServerTest.prototype.setUp = function() {
  'use strict';

  // browserName *not* 'chrome' to suppress not-yet-tested DevTools interaction
  this.server = new wd_server.WebDriverServer({browserName: 'lynx'});
};

WebDriverServerTest.prototype.mockWdResponse = function() {
  'use strict';
};

WebDriverServerTest.prototype.testRun_once = function() {
  'use strict';
  this.mockWdResponse();
  this.server.connect();
  callRemainingTimeoutCallbacks();
};
