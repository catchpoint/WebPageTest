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

var vm = require('vm');
var webdriver = require('webdriver');
console.log('During import promise.Application: %s',
    JSON.stringify(webdriver.promise.Application));

/**
 * Returns a new copy of the webdriver namespace in a secure sandbox.
 */
function createSandboxedWebDriverModule() {
  'use strict';
  var result = new webdriver.promise.Deferred();

  if (webdriver.process.isNative()) {
    // Running in Node.js -- reload the module in a more restricted context.
    webdriver.node.toSource(function(e, wdModuleSource) {
      if (e) {
        result.reject(e);
      }

      // Give WebDriver the info it needs to compile.
      var wdModuleSandbox = {
        setTimeout: global.setTimeout,
        setInterval: global.setInterval,
        clearTimeout: global.clearTimeout,
        clearInterval: global.clearInterval,
        require: require,
        // Define a dummy process object so the user can use
        // webdriver.process.  Feel free to copy over whitelisted
        // ENV variables from our process.env - just don't give them
        // the real deal :)
        process: {env:{}}
      };

      // This is actually how node loads modules.
      // TODO(jleyba): Investigate whether node offers a way
      //    to reload a module into a unique context.
      var wdSourceWithExports =
          '(function(exports) {' + wdModuleSource + '\n});';
      var wdModuleSandboxed = vm.runInNewContext(
          wdSourceWithExports, wdModuleSandbox, 'sandboxed webdriver module');
      var wdNamespaceSandboxed = {};
      wdModuleSandboxed.call(wdNamespaceSandboxed, wdNamespaceSandboxed);
      result.resolve(wdNamespaceSandboxed);
    });
  } else {
    // Running in a browser, cannot re-read the module, and no need as well.
    result.resolve(webdriver);
  }

  return result.promise;
}

/**
 * Returns a sandboxed webdriver namespace safe for user script execution.
 */
function createSandboxedWdNamespace(serverUrl, capabilities, afterBuildCb) {
  'use strict';
  return createSandboxedWebDriverModule().then(function(wdSandbox) {
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
      // You can't use our webdriver.Builder() here because you'd
      // leak our promise system into theirs. They'd play well
      // together, but you'd end up with weird synchronization
      // issues.  Avoiding those is the whole point of all this!
      var builder = new wdSandbox.Builder()
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
        afterBuildCb(builtWd, wdSandbox);
        return builtWd;
      };
    }

    return {
        Builder: ProtectedBuilder,
        By: wdSandbox.By,
        Key: wdSandbox.Key,
        promise: wdSandbox.promise,
        process: wdSandbox.process
    };
  });
}

exports.createSandboxedWdNamespace = createSandboxedWdNamespace;
