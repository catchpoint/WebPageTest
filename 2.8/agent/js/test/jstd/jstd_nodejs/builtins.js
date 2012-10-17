// JSTD runs the tests under the browser. Stubs for Node.js code to work.
var global = window;
window.global = window;
module = {filename: window.location};
__filename = 'NodeJS stubbed out in a browser';
var exports = {};
var timeoutCallbacks = [];

// require(...) will return undefined for all modules under test.
// The test code, e.g. setUp(), must explicitly override all module objects.
var nodeJsModules_ = {};

function registerFakeNodeModule(moduleName, moduleObject) {
  'use strict';
  nodeJsModules_[moduleName] = moduleObject;
}

function require(moduleName) {
  'use strict';
  if (moduleName in nodeJsModules_) {
    return nodeJsModules_[moduleName];
  } else {
    // Modules read by JSTD put all their stuff into exports,
    // which in a browser is one global map and serves as a substitute
    // for any arbitrary module object.
    return exports;
  }
}

global.setTimeout = function(closure, timeout) {
  'use strict';
  timeoutCallbacks.push(closure);
  return closure;
};

global.clearTimeout = function(closure) {
  'use strict';
  var index = timeoutCallbacks.indexOf(closure);
  if (index !== -1) {
    timeoutCallbacks.splice(index, 1);
  }
};

function callNextTimeoutCallback() {
  'use strict';
  var cb = timeoutCallbacks.pop();
  if (cb) {
    cb();
    return true;
  }
  return false;
}

function callRemainingTimeoutCallbacks() {
  'use strict';
  while (callNextTimeoutCallback()) {
  }
}
