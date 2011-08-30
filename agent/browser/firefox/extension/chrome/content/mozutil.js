/**
 * Copyright 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file defines a namespace wpt.moz, which holds mozilla-specific
 * menthods used by webpagetest.
 */

// Namespace wpt.moz:
window['wpt'] = window['wpt'] || {};
window.wpt['moz'] = window.wpt['moz'] || {};

(function() {  // Begin closure

var CI = Components.interfaces;
var CC = Components.classes;
var CU = Components.utils;

wpt.moz.createInst = function(mozClass, mozInstance) {
  return CC[mozClass].createInstance(CI[mozInstance]);
};

wpt.moz.getService = function(mozClass, mozInterface) {
  return CC[mozClass].getService().QueryInterface(CI[mozInterface]);
};

/**
 * Mozilla interfaces often have bitflags.  This function takes an integer
 * and an interface with bitmasks, and turns it into an array of the string
 * name of the bitmasks that are set.
 *
 * Example:
 *   var bitsSet = wpt.moz.stringifyFlags(
 *       'nsIWebProgressListener',  // Bit masks are defined on this interface
 *       /^STATE/,                  // and their names match STATE_*
 *       aFlag);                    // The value whose bits will be parsed.
 *   dump('Here are the flags in |aFlag|: ' + bitsSet.join(' | ') + '\n');
 */
wpt.moz.stringifyFlags = function(interfaceName, flagMatcher, flagValue) {
  var result = [];
  var baseInterface = CI[interfaceName];
  var printAndClear = function(flagName) {
    var mask = baseInterface[flagName];
    if (flagValue & mask) {
      result.push(flagName);
      flagValue = flagValue & ~mask;
    }
  };

  for (var key in baseInterface) {
    if (flagMatcher.test(key)) {
      printAndClear(key);
    }
  }

  // We masked out all the bits that were printed.  If any are left,
  // add a string that shows them in hex.
  if (flagValue != 0)
    result.push('<Leftover bits: '+ flagValue.toString(16) + '>');
  return result;
};

wpt.moz.allBitsSet = function(bitmask, data) {
  return ((data & bitmask) == bitmask);
};

/**
 * Take an object with parameters that specify a cookie, and set it.
 * The format of the object is the same as the object passed to
 * chrome.cookies.set() in a chrome extension.
 * @param {Object} cookieObj
 */
wpt.moz.setCookie = function(cookieObj) {
  var uri = wpt.moz.createInst('@mozilla.org/network/standard-url;1',
                               'nsIURI');
  uri.spec = cookieObj.url;

  var cookieString = (cookieObj.name + '=' + cookieObj.value + ';');

  // If there is an expiration date, append it to the cookie string.
  // Example: 'name=value; expires=Wed, 10 Aug 2011 18:33:05 GMT'.
  if (cookieObj['expirationDate']) {
    cookieString = [
        cookieString,
        ' expires = ',
        new Date(cookieObj['expirationDate']).toUTCString()
        ].join('');
  }

  var cookieService = wpt.moz.getService('@mozilla.org/cookieService;1',
                                         'nsICookieService');
  cookieService.setCookieString(
      uri,  // The URI of the document for which cookies are being queried.
      null,  // The prompt to use for all user-level cookie notifications.
      cookieString,  // The cookie string to set.
      null);  // The channel used to load the document.
};

wpt.moz.execScriptInSelectedTab = function(scriptText, exportedFunctions) {
  // Mozilla's Components.utils.sandbox object allows javascript to be run
  // with limited privlages.  Any javascript we run directly can do anything
  // extension javascript can do, including reading and writing to the
  // filesystem.  The sandbox imposes a the same limits on javascript that
  // the page has.  Docs are here:
  // https://developer.mozilla.org/en/Components.utils.evalInSandbox .

  // Get the window object of the foremosst tab.
  var wrappedWindow = gBrowser.contentWindow;
  var sandbox = new CU.Sandbox(
      wrappedWindow,  // Same limitations as the javascript in the window.
      {sandboxPrototype: wrappedWindow});  // Window is the prototype of the global
                                           // object.  A global reference that is
                                           // not defined on the sandbox will refer
                                           // to the item on the window.

  for (var fnName in exportedFunctions) {
    sandbox[fnName] = exportedFunctions[fnName];
  }

  // If the script we are running throws, we need some way to see the exception.
  // Wrap the script in a try block, and dump any exceptions we catch.
  var scriptWithExceptionDumping = [
      'try {',
      '  (function() {',
      scriptText,
      '  })();',
      '} catch (ex) {',
      '  dump("\\n\\nUncaught exception in exec script: " + ex + "\\n\\n");',
      '}'].join('\n');

  CU.evalInSandbox(scriptWithExceptionDumping, sandbox);
};

wpt.moz.clearAllBookmarks = function() {
  var bookmarksService = wpt.moz.getService(
      '@mozilla.org/browser/nav-bookmarks-service;1',
      'nsINavBookmarksService');

  bookmarksService.removeFolderChildren(bookmarksService.toolbarFolder);
  bookmarksService.removeFolderChildren(bookmarksService.bookmarksMenuFolder);
  bookmarksService.removeFolderChildren(bookmarksService.tagsFolder);
  bookmarksService.removeFolderChildren(bookmarksService.unfiledBookmarksFolder);
};

wpt.moz.nsUriIsWptController = function(uri) {
  if (uri.host != '127.0.0.1' && uri.host != 'localhost')
    return false;

  if (uri.scheme != 'http')
    return false;

  // Checking the port matters because we might be testing a dev server
  // running on the same machine.
  if (uri.port != 8888)
    return false;

  return true;
};

/**
 * The following object observes all http requests.
 */
wpt.moz.RequestBlockerSinglton_ = {
  isObserving: false,  // Set to true when installed and observing.

  // Add strings to block by pushing into this array.
  UrlBlockStrings: [],

  observe: function(subject, topic, data) {
    if (topic != 'http-on-modify-request')
      return;

    // Get the original URI (before redirects).
    var httpChannel = subject.QueryInterface(CI.nsIHttpChannel);
    var originalUri = httpChannel.originalURI.spec;

    // Get the final URI (after redirects).
    var chanel = subject.QueryInterface(CI.nsIChannel);
    var currentUri = chanel.URI.spec;

    // We shoudl never block XHRs to webpagetest.  Because the hook is in-process,
    // these requests will always be to localhost.
    if (wpt.moz.nsUriIsWptController(httpChannel.originalURI)) {
      //dump('Saw WPT traffic.  Do not block.  url = ' + originalUri + '\n');
      return;
    }

    for (var i = 0, ie = wpt.moz.RequestBlockerSinglton_.UrlBlockStrings.length;i < ie; ++i) {
      var blockString = wpt.moz.RequestBlockerSinglton_.UrlBlockStrings[i];
      if (originalUri.indexOf(blockString) != -1) {
        dump('BLOCK original URI ' + originalUri + ' because it matched block string ' +
             blockString + '\n');
        subject.cancel(Components.results.NS_BINDING_ABORTED);
        return;
      }

      if (currentUri.indexOf(blockString) != -1) {
        dump('BLOCK current URI ' + currentUri + ' because it matched block string ' +
             blockString + '\n');
        subject.cancel(Components.results.NS_BINDING_ABORTED);
        return;
      }
    }
  }
};

/**
 * Observe network retuests, and block requests that have |blockString| in
 * their URI.
 */
wpt.moz.blockContentMatching = function(blockString) {
  // Install the observer if it is not already installed.
  if (!wpt.moz.RequestBlockerSinglton_.isObserving) {
    wpt.moz.RequestBlockerSinglton_.isObserving = true;

    var observerService = wpt.moz.getService('@mozilla.org/observer-service;1',
                                             'nsIObserverService');
    observerService.addObserver(wpt.moz.RequestBlockerSinglton_,
                                'http-on-modify-request',
                                false);
  }

  wpt.moz.RequestBlockerSinglton_.UrlBlockStrings.push(blockString);
};

})();  // End closure
