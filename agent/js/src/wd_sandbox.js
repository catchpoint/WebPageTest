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

var vm = require('vm');
var logger = require('logger');
var webdriver = require('selenium-webdriver');

/**
 * createSandboxedWebDriverModule creates a sandboxed webdriver Object
 *
 * @return {Object} a new copy of the webdriver namespace in a secure sandbox.
 */
exports.createSandboxedWebDriverModule = function() {
  'use strict';
  var result = new webdriver.promise.Deferred();

  if (false) {  // TODO: webdriver.node.toSource no longer available
    // Running in Node.js -- reload the module in a more restricted context.
    webdriver.node.toSource(function(e, wdModuleSource) {
      if (e) {
        result.reject(e);
      }

      var wdModuleSandbox = {
        setTimeout: global.setTimeout,
        setInterval: global.setInterval,
        clearTimeout: global.clearTimeout,
        clearInterval: global.clearInterval,
        // TODO(klm): Why? We don't want a user script to be able
        // to require arbitrary modules
        require: require,
        // Define a dummy process object so the user can use
        // webdriver.process.  Feel free to copy over whitelisted
        // ENV variables from our process.env - just don't give them
        // the real deal :)
        process: {env: {}}
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
      result.fulfill(wdNamespaceSandboxed);
    });
  } else {
    // Running in a browser, cannot re-read the module, and no need as well.
    result.fulfill(webdriver);
  }

  return result.promise;
};

function operationNotPermitted(name) {
  'use strict';
  throw new Error('Operation is not permitted: ' + name);
}

function SandboxedDriver(driver, wdSandbox, sandboxedDriverListener) {
  'use strict';
  logger.extra('Creating SandboxedDriver');

  this.quit = operationNotPermitted.bind('quit');

  var realSchedule = driver.schedule;
  driver.schedule = function(command, description) {
    logger.extra('(user script) %s', description);
    var commandArgs = arguments;
    wdSandbox.promise.controlFlow().schedule(
        'onBeforeDriverAction: ' + description, function() {
      sandboxedDriverListener.onBeforeDriverAction(
          command, commandArgs);
    });
    return realSchedule.apply(driver, arguments).then(function(result) {
      sandboxedDriverListener.onAfterDriverAction(command, commandArgs, result);
      return result;  // Don't mess with the result.
    }, function(e) {
      sandboxedDriverListener.onAfterDriverError(command, arguments, e);
      throw e;
    });
  };

  // Copy non-overridden methods
  var methodName;
  for (methodName in driver) {
    if (typeof driver[methodName] === 'function' &&
        this[methodName] === undefined) {
      this[methodName] = driver[methodName].bind(driver);
    }
  }
}

/**
 * createSandboxedWdNamespace builds the sandboxed module then adds a
 * protected builder to it
 *
 * @param {string} serverUrl the url of the webdriver server.
 * @param {Object} capabilities sandbox information such as browser, version
 *                 and platform.
 * @param {Object} sandboxedDriverListener an object with three methods:
 *     onDriverBuild -- called after the driver is built, with
 *     the driver and sandbox as args.
 *     onAfterDriverAction -- called after each WebDriver action with
 *     the driver, action name, array of args, and its result.
 *     onAfterErrorCb -- called after a WebDriver action error with
 *     the driver, action name, array of args, and the error.
 *
 * @return {Object} a sandboxed webdriver namespace for user script execution.
 */
exports.createSandboxedWdNamespace = function(
    serverUrl, capabilities, sandboxedDriverListener) {
  'use strict';
  return exports.createSandboxedWebDriverModule().then(function(wdSandbox) {
    var builder = new wdSandbox.Builder()
        .usingServer(serverUrl)
        .withCapabilities(capabilities);
    var builtDriver = null;
    var sandboxedDriver = null;

    /**
     * A proxy for restricting access to Builder operations.
     * NOTE: the WebDriver instances returned by #build could
     * also be proxied to restrict access to internal state while
     * I work on refactoring the code.
     *
     * @constructor
     */
    function ProtectedBuilder() {
      // You can't use our webdriver.Builder() here because you'd
      // leak our promise system into theirs. They'd play well
      // together, but you'd end up with weird synchronization
      // issues.  Avoiding those is the whole point of all this!
      var methodName;
      for (methodName in builder) {
        if (typeof builder[methodName] === 'function') {
          this[methodName] = operationNotPermitted.bind(methodName.toString());
        }
      }

      // The driver is a singleton -- user scripts cannot call quit(),
      // and we call quit() ourselves only at the end of last run.
      this.build = (function() {
        if (!builtDriver) {
          builtDriver = builder.build();
          sandboxedDriver = new SandboxedDriver(
              builtDriver, wdSandbox, sandboxedDriverListener);
        }
        sandboxedDriverListener.onDriverBuild(
            builtDriver, capabilities, wdSandbox);
        return sandboxedDriver;
      }.bind(this));
    }

    return {
        Builder: ProtectedBuilder,
        By: wdSandbox.By,
        Key: wdSandbox.Key,
        promise: wdSandbox.promise,
        process: wdSandbox.process
      };
  });
};
