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

wpt.moz.clearAllBookmarks = function() {
  var bookmarksService = wpt.moz.getService(
      '@mozilla.org/browser/nav-bookmarks-service;1',
      'nsINavBookmarksService');

  bookmarksService.removeFolderChildren(bookmarksService.toolbarFolder);
  bookmarksService.removeFolderChildren(bookmarksService.bookmarksMenuFolder);
  bookmarksService.removeFolderChildren(bookmarksService.tagsFolder);
  bookmarksService.removeFolderChildren(bookmarksService.unfiledBookmarksFolder);
};

})();  // End closure
