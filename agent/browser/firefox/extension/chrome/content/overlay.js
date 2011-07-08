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
 * Run webpagetest.org tests.
 *
 * The page load is timing is based on the Page Speed Firefox extension.
 * http://code.google.com/p/page-speed/source/browse/firefox_addon/trunk/src/pagespeed_firefox/js/pagespeed/pageLoadTimer.js
 */

var WPTDRIVER = {};

(function() {  // Begin closure

var STARTUP_DELAY = 5000;
var TASK_INTERVAL = 1000;
var g_active = false;
var g_tabId = -1;
var g_start = 0;
var g_requesting_task = false;


// Load a task.
setTimeout("WPTDRIVER.getTask()", STARTUP_DELAY);

// Get the next task from the wptdriver.
WPTDRIVER.getTask = function() {
  if (!g_requesting_task) {
    g_requesting_task = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "http://127.0.0.1:8888/task", true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.responseText.length > 0) {
            try {
              var resp = JSON.parse(xhr.responseText);
            } catch(err) {
              throw('Error parsing response as JSON: ' +
                    xhr.responseText.substr(0, 120) + "[...]\n");
            }
            if (resp.statusCode == 200) {
              wptExecuteTask(resp.data);
            }
          }
        }
      }
      xhr.send();
    } catch(err) {}
    g_requesting_task = false;
  }
}

// notification that navigation started
function wptOnNavigate() {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8888/event/navigate", true);
    xhr.send();
  } catch(err) {}
}

// notification that the page loaded
function wptOnLoad(load_time) {
  try {
    g_active = false;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8888/event/load?load_time=" + load_time,
             true);
    xhr.send();
  } catch(err) {}
}

// Start timing on a start event that applies to a document.
var START_FILTER = (
    Components.interfaces.nsIWebProgressListener.STATE_START |
    Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT);

// Stop timing on a stop event that ends a network event from a window.
var STOP_FILTER = (
    Components.interfaces.nsIWebProgressListener.STATE_STOP |
    Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK |
    Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW);

var wptListener = {
  QueryInterface: function(aIID) {
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
        aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },
  onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
    // If you used for more than one tab/window, use aWebProgress.DOMWindow
    // to obtain the tab/window which triggers the state change.
    if (aRequest && (!aRequest.name || !/^https?:/.test(aRequest.name)))
      return;
    if ((aFlag & START_FILTER) == START_FILTER)
      wptExtension.loadStart();
    if ((aFlag & STOP_FILTER) == STOP_FILTER)
      wptExtension.loadStop();
  },
  onLocationChange: function(aProgress, aRequest, aURI) {return;},
  onProgressChange: function(a, b, c, d, e, f) {return;},
  onStatusChange: function(a, b, c, d) {return;},
  onSecurityChange: function(a, b, c) {return;}
};

var wptExtension = {
  oldURL: null,
  startTime: null,
  init: function() {
    gBrowser.addProgressListener(
        wptListener,
        Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
  },
  uninit: function() {
    gBrowser.removeProgressListener(wptListener);
  },
  loadStart: function() {
    if (g_active) {
      this.startTime = (new Date()).getTime();
      wptOnNavigate();
    }
  },
  loadStop: function() {
    if (g_active) {
      var loadTime = (new Date()).getTime() - this.startTime;
      wptOnLoad(loadTime);
      dump("load time:  " + loadTime + "\n");
    }
  }
};
window.addEventListener("load", function() {wptExtension.init()}, false);
window.addEventListener("unload", function() {wptExtension.uninit()}, false);


/***********************************************************
                      Utility Functions
***********************************************************/
function trim(stringToTrim) {
  return stringToTrim.replace(/^\s+|\s+$/g,"");
}

/***********************************************************
                      Script Commands
***********************************************************/

// execute a single task/script command
function wptExecuteTask(task) {
  if (task.action.length) {
    g_active = Boolean(task.record);

    // decode and execute the actual command
    if (task.action == "navigate")
      wptNavigate(task.target);
    else if (task.action == "exec")
      wptExec(task.target);
    else if (task.action == "setcookie")
      wptSetCookie(task.target, task.value);

    if (!g_active) {
      setTimeout("wptGetTask()", TASK_INTERVAL);
    }
  }
}

// exec
function wptExec(script) {
  // TODO(slamm): Port wptExec to firefox.
  //chrome.tabs.executeScript(null, {code:script});
}

// navigate
function wptNavigate(url) {
  var where = "current";  // current tab
  var isThirdPartyFixupAllowed = false;
  var postData = {};
  var referrerUrl = "";
  openUILink(url, where, isThirdPartyFixupAllowed, postData, referrerUrl);
}

function wptSetCookie(cookie_path, data) {
  // TODO(slamm): port wptSetCooke to firefox
  return;
  var pos = data.indexOf(';');
  var val = data;
  var cookie_expires = '';
  if (pos > 0) {
    val = data.substring(0,pos);
    var exp = trim(data.substring(pos + 1));
    pos = exp.indexOf('=');
    if (pos > 0) {
      cookie_expires = trim(exp.substring(pos + 1));
    }
  }
  pos = val.indexOf('=');
  if (pos > 0) {
    var cookie_name = trim(val.substring(0,pos));
    var cookie_value = trim(val.substring(pos + 1));
    if (cookie_name.length && cookie_value.length && cookie_path.length) {
      var cookie = {url:cookie_path, name:cookie_name, value: cookie_value};
      if (cookie_expires.length) {
        var date = new Date(cookie_expires);
        cookie.expirationDate = date.getTime();
      }
      chrome.cookies.set(cookie);
    }
  }
}

})();  // End closure
