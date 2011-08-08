// Web performance timers: http://w3c-test.org/webperf/tests/
var performance = {
  memory: {},
  navigation: {},
  timing: {}
};

// Some experimental APIs are not yet in
// third_party/closure-compiler/contrib/externs/chrome_extensions.js .

// TODO(skerner): Define RequestFilter.
///**
// * @constructor
// */
//function RequestFilter() {}
///** @type {Array.<string>} */
//RequestFilter.prototype.urls;
///** @type {Array.<string>} */
//RequestFilter.prototype.types;
///** @type {number} */
//RequestFilter.prototype.tabId;
///** @type {number} */
//RequestFilter.prototype.windowId;


/**
 * @see http://code.google.com/chrome/extensions/trunk/experimental.webRequest.html
 * @constructor
 */
function ChromeWebRequestEvent() {}
/**
 * @param {Function} callback
 * @param {Object} opt_filter,
 * @param {Array.<string>} opt_extraInfoSpec
 */
ChromeWebRequestEvent.prototype.addListener = function(
    callback, opt_filter, opt_extraInfoSpec) {};
/** @param {Function} callback */
ChromeWebRequestEvent.prototype.removeListener = function(callback) {};
/** @param {Function} callback */
ChromeWebRequestEvent.prototype.hasListener = function(callback) {};
/** @param {Function} callback */
ChromeWebRequestEvent.prototype.hasListeners = function(callback) {};


chrome.experimental.webRequest = {};

/** @type {ChromeWebRequestEvent} */
chrome.experimental.webRequest.onBeforeNavigate;

/** @type {ChromeWebRequestEvent} */
chrome.experimental.webRequest.onBeforeRequest;


chrome.experimental.webNavigation = {};
