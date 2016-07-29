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
    * Neither the name of the <ORGANIZATION> nor the names of its contributors
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

 Run webpagetest.org tests.

 The page load timing code is based on the page timer within the Page Speed
 Firefox extension:
 http://code.google.com/p/page-speed/source/browse/firefox_addon/trunk/src/pagespeed_firefox/js/pagespeed/pageLoadTimer.js

******************************************************************************/

// Namespace wpt.moz.main:
window['wpt'] = window['wpt'] || {};
window.wpt['moz'] = window.wpt['moz'] || {};
window.wpt.moz['main'] = window.wpt.moz['main'] || {};

(function() {  // Begin closure

// Running test commands slowly makes debugging easier.
var TEST_TASK_INTERVAL = 5000;

var TASK_INTERVAL = 1000;
var TASK_INTERVAL_SHORT = 0;
var DOM_ELEMENT_POLL_INTERVAL = 100;
var STARTUP_FAILSAFE_INTERVAL = 5000;

var g_active = false;
var g_tabId = -1;
var g_requesting_task = false;
var g_processing_task = false;
var g_started = false;
var g_initialized = false;

// Set to true to pull commands from a static list in fakeCommandSource.js.
var RUN_FAKE_COMMAND_SEQUENCE = false;

// Nuke all of the bookmarks to prevent any live feeds from updating.
// TODO: possibly be more forgiving and query for a list of live bookmarks.
wpt.moz.clearAllBookmarks();

/**
 * Inform the driver that an event occurred.
 */
wpt.moz.main.sendEventToDriver_ = function(eventName, opt_params, opt_data) {
  var url = ('http://127.0.0.1:8888/event/' + eventName);
  if (opt_params) {
    var paramArray = [];
    for (var key in opt_params) {
      paramArray.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(opt_params[key]));
    }
    if (paramArray.length > 0) {
      url = url + '?' + paramArray.join('&');
    }
  }
  wpt.moz.logInfo('POST event:  url = ', url);

  try {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.send(opt_data);

  } catch (err) {
    wpt.moz.logInfo("Error sending dom element xhr: " + err);
  }


  if (RUN_FAKE_COMMAND_SEQUENCE) {
    // The real driver stops sending commands until an event happens in some
    // cases.  For example, after sending setdomelement, no commands are sent
    // until an event tells the driver that all dom elements loaded.
    // The fake command source needs to know about events to emulate this
    // behavior.
    wpt.fakeCommandSource.onEvent(eventName, opt_params);
  }
};

wpt.moz.main.onStartup = function() {
  if (RUN_FAKE_COMMAND_SEQUENCE) {
    // Run the tasks in FAKE_TASKS.
    window.setInterval(function() {
      var nextCommand = wpt.fakeCommandSource.next();
      if (nextCommand)
        wpt.moz.main.executeTask(nextCommand);
    }, TEST_TASK_INTERVAL);
  } else {
    // Fetch tasks from wptdriver.exe .
    window.setInterval(function() {wpt.moz.main.getTask();}, TASK_INTERVAL);
  }
};

// Monitor for page title changes
// TODO: only track changes for the main browser window (alert boxes will
// fire as well)
(function() {
  var windowMediator = wpt.moz.getService(
      '@mozilla.org/appshell/window-mediator;1',
      'nsIWindowMediator');
  var listener = {
    onWindowTitleChange: function(aWindow, aNewTitle) {
      wpt.moz.main.sendEventToDriver_('title', {'title': aNewTitle});
    },
    onOpenWindow: function(aWindow) {
    },
    onCloseWindow: function(aWindow) {
    }
  };
  windowMediator.addListener(listener);
})();

/**
 * Get notifications from the dialog overlay to log a navigation error when
 * basic auth is required and no credentials have been supplied.
 */
(function() {
  var observerService = Components.classes["@mozilla.org/observer-service;1"].
    getService(Components.interfaces.nsIObserverService);

  var observeUnauthorizedErrors = {
    observe: function(aSubject, aTopic, aData) {
			wpt.moz.main.sendEventToDriver_('navigate_error?error=401');
      g_active = false;
      wptExtension.uninit();
    }
  };

  observerService.addObserver(observeUnauthorizedErrors, "wpt-unauthorised-errors", false);
})();

// Get the next task from the wptdriver.
wpt.moz.main.getTask = function() {
  if (!g_requesting_task && !g_processing_task) {
    g_requesting_task = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://127.0.0.1:8888/task', true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.responseText.length > 0) {
            try {
              var resp = JSON.parse(xhr.responseText);
            } catch (err) {
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
    } catch (err) {}
    g_requesting_task = false;
  }
};

// Send message that navigation started.
wpt.moz.main.onNavigate = function() {
  wpt.moz.main.sendEventToDriver_('navigate');
  // We used to record the time here, so that events could send
  // a time since navigation.  This was removed: The driver computes
  // times when it receives events.  When firefox implements the web
  // timing spec, consider re-adding it.  Chrome implements the spec,
  // and the chrome extension sends times based on it.
};

// Send onload & W3C navigation timing events.
wpt.moz.main.onLoad = function(win) {
  var win = window.content.document.defaultView.wrappedJSObject;
  g_active = false;
  var fixedViewport = 0;
  if (win.document.querySelector("meta[name=viewport]"))
    fixedViewport = 1;
  var domCount = win.document.getElementsByTagName("*").length;
  wpt.moz.main.sendEventToDriver_('load?fixedViewport=' +
      fixedViewport + '&domCount=' + domCount);
};

/**
 * Fired when gBrowser receives a load event, this function
 * calls wptExtension.loadStop() when a page is ready to call onload
 * handlers.
 */
function onPageLoad(event) {
  if (!g_started) {
    g_started = true;
    wpt.moz.main.onStartup();
  } else {
    // We only care about events aimed at the document.
    if (!event.originalTarget instanceof HTMLDocument)
      return;

    // Filter events from frames by checking that this event references the top
    // window in the page.
    var win = event.originalTarget.defaultView;
    if (!win || win !== win.top)
      return;

    wptExtension.loadStop(win);
  }
}

const STATE_START = Components.interfaces.nsIWebProgressListener.STATE_START;  
const STATE_STOP = Components.interfaces.nsIWebProgressListener.STATE_STOP;  
var progressListener =  
{  
  QueryInterface: function(aIID)  
  {  
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||  
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||  
       aIID.equals(Components.interfaces.nsISupports))  
     return this;  
   throw Components.results.NS_NOINTERFACE;  
  },  
  
  onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {},  
  onLocationChange: function(aProgress, aRequest, aURI) {
		if (aRequest && !Components.isSuccessCode(aRequest.status)) {
			wpt.moz.main.sendEventToDriver_('navigate_error?error=' + aRequest.status);
		}
	},
  onProgressChange: function(aWebProgress, aRequest, curSelf, maxSelf, curTot, maxTot) { },  
  onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) { },  
  onSecurityChange: function(aWebProgress, aRequest, aState) { }  
}  

/**
 * Fired when gBrowser receives a pagehide event, this function
 * calls wptExtension.loadStart() to indicate that navigation is
 * starting.
 */
function onPageHide(event) {
  // We only care about events aimed at the document.
  if (!event.originalTarget instanceof HTMLDocument)
    return;

  var win = event.originalTarget.defaultView;
  if (!win || win !== win.top)
    return;

  wptExtension.loadStart(win);
}

var wptExtension = {
  init: function() {
    // Use the load event on the global browser object to see when the
    // page gets the onload event.
	if (!g_initialized) {
		gBrowser.addEventListener('load', onPageLoad, true);
		gBrowser.addEventListener('pagehide', onPageHide, true);
		gBrowser.addProgressListener(progressListener);
		g_initialized = true;
		setTimeout(function() {
			if (!g_started)
				onPageLoad();
		}, STARTUP_FAILSAFE_INTERVAL);
	}
  },
  uninit: function() {
	if (g_initialized) {
		gBrowser.removeEventListener('load', onPageLoad, true);
		gBrowser.removeEventListener('pagehide', onPageHide, true);
		gBrowser.removeProgressListener(progressListener);
	}
  },
  loadStart: function() {
	wpt.moz.main.onNavigate();
  },
  loadStop: function(win) {
	wpt.moz.main.onLoad(win);
  }
};
window.addEventListener('load', function() { wptExtension.init(); }, false);
window.addEventListener('unload', function() { wptExtension.uninit(); }, false);

// Create a startup failsafe in case the events we attach to have already fired
setTimeout(function() {
	wptExtension.init();
}, STARTUP_FAILSAFE_INTERVAL);

/***********************************************************
                      Utility Functions
***********************************************************/
function trim(stringToTrim) {
  return stringToTrim.replace(/^\s+|\s+$/g, '');
}

/***********************************************************
                      Script Commands
***********************************************************/
wpt.moz.main.callback = function() {
  g_processing_task = false;
  if (!g_active)
    setTimeout(function() {wpt.moz.main.getTask();}, TASK_INTERVAL_SHORT);
}

/** execute a single task/script command */
wpt.moz.main.executeTask = function(task) {
  wpt.moz.logJson('Exec task object: ', task);

  if (task.action && task.action.length) {
    // |task.record| should be named "blocking".  If true, don't ask for
    // another command.
    g_active = !!task.record;
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
      case 'setdomelement':
        wpt.moz.main.setDomElement(task.target);
        break;
      case 'collectstats':
        g_processing_task = true;
				var customMetrics = task['target'] || '';
        wpt.moz.main.collectStats(customMetrics, wpt.moz.main.callback);
        break;
      case 'checkresponsive':
        g_processing_task = true;
        wpt.moz.main.checkResponsive(wpt.moz.main.callback);
        break;

      default:
        wpt.moz.logError('Unknown command: ', JSON.stringify(task, null, 2));
    }

    if (!g_active && !g_processing_task) {
      setTimeout(function() {wpt.moz.main.getTask();}, TASK_INTERVAL_SHORT);
    }
  }
};

// exec
wpt.moz.main.exec = function(script) {
  wpt.moz.execScriptInSelectedTab(script, {});
};

// navigate
wpt.moz.main.navigate = function(url) {
  gBrowser.loadURI(url);
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
        success: function() {
          wpt.moz.logInfo('SUCCESS');
        },
        warn: function() {
          wpt.moz.logInfo('Warn: ',
                          Array.prototype.slice.call(arguments).join(''));
        },
        error: function() {
          wpt.moz.logError(Array.prototype.slice.call(arguments).join(''));
        }
      });
  return ipcr.RunCommand(commandObj);
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
      'return RunCommand_(window.document, ', JSON.stringify(commandObj), ');'
  ].join('');

  return wpt.moz.execScriptInSelectedTab(inPageScript, exportedFunctions);
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

/**
 * The DOM targets we are waiting on.  Used to implement the setDomElement
 * command.
 */
wpt.moz.main.domElementsToWaitOn_ = [];

/**
 * When we are waiting on DOM elements to appear, setInterval is used
 * to poll for them.  The id of that interval is stored here, so that
 * we can cancel it when all DOM elements are found.  When we are not
 * polling, this variable is undefined.
 */
wpt.moz.main.domElementsPollingId_ = undefined;

wpt.moz.main.setDomElement = function(target) {
  wpt.moz.main.domElementsToWaitOn_.push(target);

  // If we are not already polling for the dom elements, start doing so.
  if (typeof(wpt.moz.main.domElementsPollingId_) == 'undefined') {
    wpt.moz.main.domElementsPollingId_ = window.setInterval(
        function() {
          wpt.moz.main.pollForDomElements();
        },
        DOM_ELEMENT_POLL_INTERVAL);
  }
};

wpt.moz.main.pollForDomElements = function() {
  var missingDomElements = [];
  for (var i = 0, ie = wpt.moz.main.domElementsToWaitOn_.length; i < ie; i++) {
    var target = wpt.moz.main.domElementsToWaitOn_[i];
    var targetInPage = SendCommandToContentScript_({
      'command': 'isTargetInDom',
      'target': target
    });

    if (targetInPage) {
      var domElementParams = {
        'name_value': target
      };
      wpt.moz.main.sendEventToDriver_('dom_element', domElementParams);
    } else {
      // If we did not find |target|, save it for the next poll.
      missingDomElements.push(target);
    }
  }

  // Replace the set of dom elements to wait on with the subset that we did
  // not find.
  wpt.moz.main.domElementsToWaitOn_ = missingDomElements;

  // If all targets have been found, stop polling and signal completion.
  if (missingDomElements.length == 0) {
    window.clearInterval(wpt.moz.main.domElementsPollingId_);
    wpt.moz.main.domElementsPollingId_ = undefined;
    wpt.moz.main.sendEventToDriver_('all_dom_elements_loaded', {});
  }
};

wpt.moz.main.collectStats = function(customMetrics, callback) {
  try {
		var win = window.content.document.defaultView.wrappedJSObject;
		
		// look for any user timing data
		if (win.performance && win.performance.getEntriesByType) {
			var marks = win.performance.getEntriesByType("mark");
			for (var i = 0; i < marks.length; i++) {
				var mark = {"entryType": marks[i].entryType, "name": marks[i].name, "startTime": marks[i].startTime};
				mark.type = 'mark';
				wpt.moz.main.sendEventToDriver_('timed_event', '', JSON.stringify(mark));
			}
			var measures = win.performance.getEntriesByType("measure");
			for (var i = 0; i < measures.length; i++) {
				var measure = {"entryType": measures[i].entryType, "name": measures[i].name, "startTime": measures[i].startTime, "duration": measures[i].duration};
				measure.type = 'measure';
				wpt.moz.main.sendEventToDriver_('timed_event', '', JSON.stringify(measure));
			}
		}

		var domCount = win.document.getElementsByTagName("*").length;
		wpt.moz.main.sendEventToDriver_('domCount', {'domCount':domCount});

		if (win.performance && win.performance.timing) {
			var timingParams = {};
			function addTime(name) {
				if (win.performance.timing[name] > 0) {
					timingParams[name] = Math.max(0, (
							win.performance.timing[name] -
							win.performance.timing['navigationStart']));
				}
			};
			addTime('domInteractive');
			addTime('domContentLoadedEventStart');
			addTime('domContentLoadedEventEnd');
			addTime('loadEventStart');
			addTime('loadEventEnd');
			wpt.moz.main.sendEventToDriver_('window_timing', timingParams);
		}
		
		// collect any custom metrics
		if (customMetrics.length) {
			var lines = customMetrics.split("\n");
			var lineCount = lines.length;
			var out = {};
			for (var i = 0; i < lineCount; i++) {
				try {
					var parts = lines[i].split(":");
					if (parts.length == 2) {
						var name = parts[0];
						var code = window.atob(parts[1]);
						if (code.length) {
							var script = 'var wptCustomMetric = function() {' + code + '};return wptCustomMetric();'
							var result = wpt.moz.execScriptInSelectedTab(script, {});
							if (typeof result == 'undefined')
								result = '';
							out[name] = result;
						}
					}
				} catch(e){
				}
			}
			wpt.moz.main.sendEventToDriver_('custom_metrics', '', JSON.stringify(out));
		}
  } catch(e){
  }
  
  if (callback)
    callback();
};

// check to see if any form of the inner width is bigger than the window size (scroll bars)
// default to assuming that the site is responsive and only trigger if we see a case where
// we likely have scroll bars
wpt.moz.main.checkResponsive = function(callback) {
  var win = window.content.document.defaultView.wrappedJSObject;

  var isResponsive = 1;
  var bsw = win.document.body.scrollWidth;
  var desw = win.document.documentElement.scrollWidth;
  var wiw = win.innerWidth;
  if (bsw > wiw)
    isResponsive = 0;
  var nodes = win.document.body.childNodes;
  for (i in nodes) { 
    if (nodes[i].scrollWidth > wiw)
      isResponsive = 0;
  }
  wpt.moz.main.sendEventToDriver_('responsive', {'isResponsive':isResponsive});

  if (callback)
    callback();
};

})();  // End closure
