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

// Namespace wpt.moz.main:
window['wpt'] = window['wpt'] || {};
window.wpt['moz'] = window.wpt['moz'] || {};
window.wpt.moz['main'] = window.wpt.moz['main'] || {};

(function() {  // Begin closure

var STARTUP_DELAY = 5000;
var TASK_INTERVAL = 1000;
var TASK_INTERVAL_SHORT = 0;

var g_active = false;
var g_tabId = -1;
var g_start = 0;
var g_requesting_task = false;


// Set to true to pull commands from a static list in fakeCommandSource.js.
var RUN_FAKE_COMMAND_SEQUENCE = false;

// nuke all of the bookmarks to prevent any live feeds from updating
// TODO: possibly be more forgiving and query for a list of live bookmarks
wpt.moz.clearAllBookmarks();

wpt.moz.main.onStartup = function() {
  if (RUN_FAKE_COMMAND_SEQUENCE) {
    // Run the tasks in FAKE_TASKS.
    window.setInterval(function() {
      var nextCommand = wpt.fakeCommandSource.next();
      if (nextCommand)
        wpt.moz.main.executeTask(nextCommand);
    }, TASK_INTERVAL);
  } else {
    // Fetch tasks from wptdriver.exe .
    window.setInterval(function() {wpt.moz.main.getTask();}, TASK_INTERVAL);
  }
};

function wptFeedFakeTasks() {
  if (FAKE_TASKS.length == FAKE_TASKS_IDX) {
    return;
  }
  wpt.moz.main.executeTask(FAKE_TASKS[FAKE_TASKS_IDX++]);
};

// Load a task.
setTimeout(function() {wpt.moz.main.onStartup();}, STARTUP_DELAY);

// monitor for page title changes
// TODO: only track changes for the main browser window (alert boxes will fire as well)
(function() {
  var windowMediator = wpt.moz.getService('@mozilla.org/appshell/window-mediator;1',
                                          'nsIWindowMediator');
  var listener = {
    onWindowTitleChange: function(aWindow, aNewTitle) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://127.0.0.1:8888/event/title?title='+encodeURIComponent(aNewTitle), true);
        xhr.send();
      } catch(err) {}
    },
    onOpenWindow: function( aWindow ) {
    },
    onCloseWindow: function( aWindow ) {
    }
  }
  windowMediator.addListener(listener);
})();

// Get the next task from the wptdriver.
wpt.moz.main.getTask = function() {
  if (!g_requesting_task) {
    g_requesting_task = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://127.0.0.1:8888/task', true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.responseText.length > 0) {
            try {
              var resp = JSON.parse(xhr.responseText);
            } catch(err) {
              alert('Error parsing response as JSON: ' +
                    xhr.responseText.substr(0, 120) + '[...]\n');
            }
            if (resp.statusCode == 200 && resp.data) {
              wpt.moz.main.executeTask(resp.data);
            }
          }
        }
      };
      xhr.send();
    } catch(err) {}
    g_requesting_task = false;
  }
};

// notification that navigation started
wpt.moz.main.onNavigate = function() {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://127.0.0.1:8888/event/navigate', true);
    xhr.send();
  } catch(err) {}
}

// notification that the page loaded
wpt.moz.main.onLoad = function() {
  try {
    g_active = false;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://127.0.0.1:8888/event/load', true);
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
      wpt.moz.main.onNavigate();
    }
  },
  loadStop: function() {
    if (g_active) {
      wpt.moz.main.onLoad();
    }
  }
};
window.addEventListener('load', function() {wptExtension.init()}, false);
window.addEventListener('unload', function() {wptExtension.uninit()}, false);


/***********************************************************
                      Utility Functions
***********************************************************/
function trim(stringToTrim) {
  return stringToTrim.replace(/^\s+|\s+$/g,'');
}

/***********************************************************
                      Script Commands
***********************************************************/

// execute a single task/script command
wpt.moz.main.executeTask = function(task) {
  dump('Exec: ' + JSON.stringify(task, null, 2) + '\n');

  if (task.action && task.action.length) {
    g_active = !!task.record;  // "record" should be named "blocking".  If true, don't ask for another command.
    switch (task.action) {
      case 'navigate':
        wpt.moz.main.navigate(task.target);
        break;
      case 'exec':
        wpt.moz.main.exec(task.target);
        break;
      case 'setcookie':
        wpt.moz.main.setCookie(task.target, task.value);
        break;
      case 'setvalue':
        wpt.moz.main.setValue(task.target, task.value);
        break;
      case 'submitform':
        wpt.moz.main.submitform(task.target);
        break;
      case 'click':
        wpt.moz.main.click(task.target);
        break;
      case 'setinnerhtml':
        wpt.moz.main.setInnerHtml(task.target, task.value);
        break;
      case 'setinnertext':
        wpt.moz.main.setInnerText(task.target, task.value);
        break;
      case 'block':
        wpt.moz.main.block(task.target);
        break;

      default:
        dump('Unknown command: ' + JSON.stringify(task, null, 2) + '\n');
    }

    if (!g_active) {
      setTimeout(function() {wpt.moz.main.getTask();}, TASK_INTERVAL_SHORT);
    }
  }
};

// exec
wpt.moz.main.exec = function(script) {
  wpt.moz.execScriptInSelectedTab(script);
};

// navigate
wpt.moz.main.navigate = function(url) {
  var where = 'current';  // current tab
  var isThirdPartyFixupAllowed = false;
  var postData = {};
  var referrerUrl = '';
  openUILink(url, where, isThirdPartyFixupAllowed, postData, referrerUrl);
};

wpt.moz.main.setCookie = function(cookie_path, data) {
  var pos = data.indexOf(';');
  var val = data;
  var cookie_expires = '';

  if (pos > 0) {
    val = data.substring(0, pos);
    var exp = trim(data.substring(pos + 1));
    pos = exp.indexOf('=');
    if (pos > 0) {
      cookie_expires = trim(exp.substring(pos + 1));
    }
  }
  pos = val.indexOf('=');
  if (pos > 0) {
    var cookie_name = trim(val.substring(0, pos));
    var cookie_value = trim(val.substring(pos + 1));
    if (cookie_name.length && cookie_value.length && cookie_path.length) {
      var cookie = {
        'url': cookie_path,
        'name': cookie_name,
        'value': cookie_value
      };

      if (cookie_expires.length) {
        var date = new Date(cookie_expires);
        cookie['expirationDate'] = date.getTime();
      }
      wpt.moz.setCookie(cookie);
    }
  }
};

/**
 * Run a command that touches the DOM of a page.  The work is done
 * by code in class wpt.contentScript.InPageCommandRunner.  This
 * function should be called within a sandbox, limited to the context
 * of a selected tab.  DON'T use this directly:  Use it by calling
 * SendCommandToContentScript(), which runs it in a sandbox.
 */
function RunCommand_(doc, commandObj) {
  var ipcr = new wpt.contentScript.InPageCommandRunner(
      doc,
      null,  // No chrome API.
      {
        success: function() { dump('SUCCESS\n'); },
        warn: function() {
          dump('Warn: ' + Array.prototype.slice.call(arguments).join('') + '\n');
        },
        error: function() {
          dump('Error: ' + Array.prototype.slice.call(arguments).join('') + '\n');
        }
      });
  ipcr.RunCommand(commandObj);
}

/**
 * Run a command by instantiating an InPageCommandRunner()
 * in a sandbox scoped to the window of the current tab,
 * and passing it an object that specifies a command to invoke.
 */
function SendCommandToContentScript_(commandObj) {
  var exportedFunctions = {
    'RunCommand_': RunCommand_
  };

  var inPageScript = [
      'RunCommand_(window.document, ', JSON.stringify(commandObj), ');'
  ].join('');

  wpt.moz.execScriptInSelectedTab(inPageScript, exportedFunctions);
}

wpt.moz.main.setValue = function(target, value) {
  SendCommandToContentScript_({
      'command': 'setValue',
      'target': target,
      'value': value
  });
};

wpt.moz.main.submitform = function(target) {
  SendCommandToContentScript_({
      'command': 'submitForm',
      'target': target
  });
};

wpt.moz.main.click = function(target, value) {
  SendCommandToContentScript_({
      'command': 'click',
      'target': target,
      'value': value
  });
};

wpt.moz.main.setInnerText = function(target, value) {
  SendCommandToContentScript_({
      'command': 'setInnerText',
      'target': target,
      'value': value
  });
};

wpt.moz.main.setInnerHtml = function(target, value) {
  SendCommandToContentScript_({
      'command': 'setInnerHTML',
      'target': target,
      'value': value
  });
};

wpt.moz.main.block = function(target) {
  wpt.moz.blockContentMatching(target);
};

})();  // End closure
