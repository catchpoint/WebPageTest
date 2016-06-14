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

  Author: Sam Kerner (skerner at google dot com)

 ******************************************************************************/

var g_tabid = 0;

goog.require('wpt.chromeDebugger');
goog.require('wpt.chromeExtensionUtils');
goog.require('wpt.commands');
goog.require('wpt.logging');

goog.provide('wpt.main');

((function() {  // namespace

/**
 * Chrome does some work on startup that might have a performance impact.
 * For example, if an extension is loaded using group policy, the installation
 * will download and install that extension shortly after startup.  We don't
 * want the timing of tests altered by this work, so wait a few seconds after
 * startup before starting to perform measurements.
 *
 * @const
 */
var STARTUP_DELAY = 1000;

/** @const */
var TASK_INTERVAL = 1000;

// Run tasks slowly when testing, so that we can see errors in the logs
// before navigation closes the dev tools window.
var FAKE_TASK_INTERVAL = 6000;

/** @const */
var TASK_INTERVAL_SHORT = 0;

// Set this to true, and set FAKE_COMMAND_SEQUENCE below, to feed a sequence
// of commands to run.  This makes testing new commands easy, because you do
// not need to use wptdriver.exe while debugging.
/** @const */
var RUN_FAKE_COMMAND_SEQUENCE = false;

// Some extensions can alter timing.  Remove some extensions that are likely
// to be installed on test machines.
var UNWANTED_EXTENSIONS = [
  'mkmaajnfmpmpebdcpfnjbkgaloeidlfa',
  'amppcaoflpjiofjedecfhmmlekknkpdl'
];

// regex to extract a host name from a URL
var URL_REGEX = /([htps:]*\/\/)([^\/]+)(.*)/i;

var STARTUP_URL = 'http://127.0.0.1:8888/blank2.html';

var g_starting = false;
var g_active = false;
var g_start = 0;
var g_requesting_task = false;
var g_processing_task = false;
var g_commandRunner = null;  // Will create once we know the tab id under test.
var g_debugWindow = null;  // May create at window onload.
var g_overrideHosts = {};
var g_addHeaders = [];
var g_setHeaders = [];
var g_manipulatingHeaders = false;
var g_hasCustomCommandLine = false;
var g_started = false;
var g_requestsHooked = false;

/**
 * Uninstall a given set of extensions.  Run |onComplete| when done.
 * @param {Array.<string>} idsToUninstall IDs to uninstall.
 * @param {Function} onComplete Callback to run when uninstalls are done.
 */
wpt.main.uninstallUnwantedExtensions = function(idsToUninstall, onComplete) {
  // How many callbacks are we waiting on?  The uninstalls are done when
  // there are no more callbacks in flight.
  var numPendingCallbacks = 0;

  var callOnCompleteWhenDone = function() {
    if (numPendingCallbacks === 0)
      onComplete();
  };

  var onUninstalled = function() {
    --numPendingCallbacks;
    callOnCompleteWhenDone();
  };

  // For each installed extension, uninstall if it is in |idsToUninstall|.
  chrome.management.getAll(
      function(extensionInfoArray) {
        for (var i = 0; i < extensionInfoArray.length; ++i) {
           if (idsToUninstall.indexOf(extensionInfoArray[i].id) != -1) {
             ++numPendingCallbacks;
             chrome.management.uninstall(
                 extensionInfoArray[i].id, onUninstalled);
             wpt.LOG.info('Uninstalling ' + extensionInfoArray[i].name +
                          ' (id ' + extensionInfoArray[i].id + ').');
           }
        }
        callOnCompleteWhenDone();
      });
};

wpt.main.onStartup = function() {
  wpt.main.uninstallUnwantedExtensions(UNWANTED_EXTENSIONS, function() {
    // When uninstalls finish, kick off our testing.
    wpt.main.startMeasurements();
  });
};

wpt.main.startMeasurements = function() {
  wpt.LOG.info('Enter wptStartMeasurements');
  if (RUN_FAKE_COMMAND_SEQUENCE) {
    // Run the tasks in FAKE_TASKS.
    window.setInterval(wptFeedFakeTasks, FAKE_TASK_INTERVAL);
  } else {
    // Fetch tasks from wptdriver.exe.
    window.setInterval(wptGetTask, TASK_INTERVAL);
  }
};

// Install an onLoad handler for all tabs.
chrome.tabs.onUpdated.addListener(function(tabId, props) {
  if (!g_started && g_starting && props.status == 'complete') {
    // handle the startup sequencing (attach the debugger
    // after the browser loads and then start testing).
    g_started = true;
    wpt.main.onStartup();
  }else if (g_active && tabId == g_tabid) {
    if (props.status == 'loading') {
      g_start = new Date().getTime();
      wptSendEvent('navigate', '');
    } else if (props.status == 'complete') {
      wptSendEvent('complete', '');
    }
  }
});


/**
 * Build a fake command record.
 * @param {string} action Command's action.
 * @param {string} target Command's target.
 * @param {string=} opt_value Command's value.
 * @return {Object} A fake command record.
 */
function FakeCommand(action, target, opt_value) {
  var result = {
    'action': action,
    'target': target
  };

  if (typeof opt_value != 'undefined')
    result.value = opt_value;

  return result;
}


var FAKE_TASKS_IDX = 0;
var FAKE_TASKS = [
    // Can we navigate to youtube and search for a video?
    FakeCommand('navigate', 'http://www.youtube.com/'),

    FakeCommand('setvalue', 'id=masthead-search-term', 'boston mspca legend'),
    FakeCommand('submitform', 'id=masthead-search'),

    // Can we click?
    FakeCommand('navigate', 'http://www.google.com/'),
    FakeCommand('click', 'name\'btnI'),

    // Can we change the text/html of a page?
    FakeCommand('navigate', 'http://www.google.com/news'),
    FakeCommand('setinnertext', 'class=kd-appname-wrapper',
                'This text should replace the word news!'),
    FakeCommand('setinnerhtml', 'class=kd-appname-wrapper',
                'This <b>HTML</b> should replace the word news!'),

    // Search news after changing the page.
    FakeCommand('setvalue', 'class=searchField', 'Susie, the Qmiester'),
    FakeCommand('submitform', 'id=search-hd'),

    // Block the header graphic on www.example.com .
    FakeCommand('block', 'iana-logo-pageheader.png'),
    FakeCommand('navigate', 'http://www.example.com/')
];

function wptFeedFakeTasks() {
  if (FAKE_TASKS.length == FAKE_TASKS_IDX) {
    console.log('DONE with fake command sequence.');
    return;
  }
  wptExecuteTask(FAKE_TASKS[FAKE_TASKS_IDX++]);
}

// Get the next task from the wptdriver
function wptGetTask() {
  if (!g_requesting_task && !g_processing_task) {
    g_requesting_task = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://127.0.0.1:8888/task', true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4)
          return;
        if (xhr.status != 200) {
          wpt.LOG.warning('Got unexpected (not 200) XHR status: ' + xhr.status);
          g_requesting_task = false;
          return;
        }
        var resp = JSON.parse(xhr.responseText);
        if (resp.statusCode != 200) {
          wpt.LOG.warning('Got unexpected status code ' + resp.statusCode);
          g_requesting_task = false;
          return;
        }
        if (!resp.data) {
          g_requesting_task = false;
          return;
        }
        wptExecuteTask(resp.data);
        g_requesting_task = false;
      };
      xhr.onerror = function() {
        wpt.LOG.warning('Got an XHR error!');
        g_requesting_task = false;
      };
      xhr.send();
    } catch (err) {
      wpt.LOG.warning('Error getting task: ' + err);
      g_requesting_task = false;
    }
  }
}

function wptSendEvent(event_name, query_string, data) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://127.0.0.1:8888/event/' + event_name + query_string,
             true);
    xhr.send(data);
  } catch (err) {
    wpt.LOG.warning('Error sending page load XHR: ' + err);
  }
}

function wptHostMatches(host, filter) {
  var matched = false;
  if (!filter.length || filter == '*' || host.toLowerCase() == filter.toLowerCase()) {
    matched = true;
  } else {
    var re = new RegExp(filter);
    matched = re.test(host);
  }
  return matched;
}

var wptBeforeSendHeaders = function(details) {
  var response = {};
  if (g_active && details.tabId == g_tabid) {
    var modified = false;
    if (g_manipulatingHeaders) {
      var host = details.url.match(URL_REGEX)[2].toString();
      var scheme = details.url.match(URL_REGEX)[1].toString();
      for (var originalHost in g_overrideHosts) {
        if (g_overrideHosts[originalHost] == host) {
          details.requestHeaders.push({'name' : 'x-Host', 'value' : originalHost});
          modified = true;
          break;
        }
      }
      
      // modify headers for HTTPS requests (non-encrypted will be handled at the network layer)
      if (g_hasCustomCommandLine || scheme.toLowerCase() == "https://") {
        var i;
        for (i = 0; i < g_setHeaders.length; i++) {
          if (wptHostMatches(host, g_setHeaders[i].filter)) {
            var headerSet = false;
            for (var j = 0; j < details.requestHeaders.length; j++) {
              if (g_setHeaders[i].name.toLowerCase() == details.requestHeaders[j].name.toLowerCase()) {
                details.requestHeaders[j].value = g_setHeaders[i].value;
                headerSet = true;
              }
            }
            if (!headerSet)
              details.requestHeaders.push({'name' : g_setHeaders[i].name, 'value' : g_setHeaders[i].value});
            modified = true;
          }
        }
        for (i = 0; i < g_addHeaders.length; i++) {
          if (wptHostMatches(host, g_addHeaders[i].filter)) {
            details.requestHeaders.push({'name' : g_addHeaders[i].name, 'value' : g_addHeaders[i].value});
            modified = true;
          }
        }
      }
    }
    
    if (modified) {
      response = {requestHeaders: details.requestHeaders};
    }
  }
  return response;
};

var wptBeforeSendRequest = function(details) {
  var action = {};
  if (g_active && g_manipulatingHeaders && details.tabId == g_tabid) {
    var urlParts = details.url.match(URL_REGEX);
    var scheme = urlParts[1].toString();
    var host = urlParts[2].toString();
    var object = urlParts[3].toString();
    if (g_overrideHosts[host] !== undefined) {
      var newHost = g_overrideHosts[host];
      action.redirectUrl = scheme + newHost + object;
    }
  }
  return action;
};
  
chrome.webRequest.onErrorOccurred.addListener(function(details) {
  // Chrome canary is generating spurious net:ERR_ABORTED errors
  // right when navigation starts - we need to ignore them
  if (g_active && 
      details.tabId == g_tabid && 
      details.error != "net::ERR_ABORTED") {
      var error_code =
          wpt.chromeExtensionUtils.netErrorStringToWptCode(details.error);
      wpt.LOG.info(details.error + ' = ' + error_code);
      g_active = false;
      wpt.chromeDebugger.SetActive(g_active);
      wptSendEvent('navigate_error?error=' + error_code +
                   '&str=' + encodeURIComponent(details.error), '');
    }
  }, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame']}
);

chrome.webRequest.onAuthRequired.addListener(function(details, cb) {
    if (g_active && details.tabId == g_tabid) {
       return {
         cancel: true
       };
    }
}, {urls: ["<all_urls>"]}, ["blocking"]);

chrome.webRequest.onCompleted.addListener(function(details) {
    if (g_active && details.tabId == g_tabid) {
      wpt.LOG.info('Completed, status = ' + details.statusCode);
      if (details.statusCode >= 400) {
        g_active = false;
        wpt.chromeDebugger.SetActive(g_active);
        wptSendEvent('navigate_error?error=' + details.statusCode, '');
      }
    }
  }, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame']}
);

function wptHookRequests() {
  if (!g_requestsHooked) {
    g_requestsHooked = true;
    var urlHooks = g_hasCustomCommandLine ? ["<all_urls>"] : ['https://*/*'];
    chrome.webRequest.onBeforeSendHeaders.addListener(wptBeforeSendHeaders,
      {urls: urlHooks},
      ['blocking', 'requestHeaders']
    );
    chrome.webRequest.onBeforeRequest.addListener(wptBeforeSendRequest,
      {urls: urlHooks},
      ['blocking']
    );
  }
}

// Add a listener for messages from script.js through message passing.
chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    wpt.LOG.info('Message from content script: ' + request.message);
    if (request.message == 'DOMElementLoaded') {
      var dom_element_time = new Date().getTime() - g_start;
      wptSendEvent(
          'dom_element',
          '?name_value=' + encodeURIComponent(request.name_value) +
          '&time=' + dom_element_time);
    }
    else if (request.message == 'AllDOMElementsLoaded') {
      var time = new Date().getTime() - g_start;
      wptSendEvent(
          'all_dom_elements_loaded',
          '?load_time=' + time);
    }
    else if (request.message == 'wptLoad') {
      wptSendEvent('load', 
                   '?timestamp=' + request.timestamp + 
                   '&fixedViewport=' + request.fixedViewport);
    } else if (request.message == 'wptResponsive') {
      if (request['isResponsive'] !== undefined)
        wptSendEvent('responsive', '?isResponsive=' + request.isResponsive);
    } else if (request.message == 'wptCustomMetrics') {
      if (request['data'] !== undefined)
        wptSendEvent('custom_metrics', '', JSON.stringify(request.data));
    }
    // TODO: check whether calling sendResponse blocks in the content script
    // side in page.
    sendResponse({});
});

/***********************************************************
                      Script Commands
***********************************************************/
var wptTaskCallback = function() {
  g_processing_task = false;
  if (!g_active)
    window.setTimeout(wptGetTask, TASK_INTERVAL_SHORT);
}

// execute a single task/script command
function wptExecuteTask(task) {
  if (task.action.length) {
    if (task.record) {
      g_active = true;
      wpt.chromeDebugger.SetActive(g_active);
    } else {
      g_active = false;
      wpt.chromeDebugger.SetActive(g_active);
    }
  // Decode and execute the actual command.
  // Commands are all lowercase at this point.
  wpt.LOG.info('Running task ' + task.action + ' ' + task.target);
  switch (task.action) {
    case 'navigate':
      g_processing_task = true;
      g_commandRunner.doNavigate(task.target, wptTaskCallback);
      break;
    case 'exec':
      g_processing_task = true;
      wpt.chromeDebugger.Exec(task.target, wptTaskCallback);
      break;
    case 'setcookie':
      g_commandRunner.doSetCookie(task.target, task.value);
      break;
    case 'block':
      g_commandRunner.doBlock(task.target);
      break;
    case 'setdomelement':
      // Sending request to set the DOM element has to happen only at the
      // navigate event after the content script is loaded. So, this just
      // sets the global variable.
      wpt.commands.g_domElements.push(task.target);
      break;
    case 'click':
      g_processing_task = true;
      g_commandRunner.doClick(task.target, wptTaskCallback);
      break;
    case 'setinnerhtml':
      g_processing_task = true;
      g_commandRunner.doSetInnerHTML(task.target, task.value, wptTaskCallback);
      break;
    case 'setinnertext':
      g_processing_task = true;
      g_commandRunner.doSetInnerText(task.target, task.value, wptTaskCallback);
      break;
    case 'setvalue':
      g_processing_task = true;
      g_commandRunner.doSetValue(task.target, task.value, wptTaskCallback);
      break;
    case 'submitform':
      g_processing_task = true;
      g_commandRunner.doSubmitForm(task.target, wptTaskCallback);
      break;
    case 'clearcache':
      g_processing_task = true;
      g_commandRunner.doClearCache(task.target, wptTaskCallback);
      break;
    case 'capturetimeline':
      wpt.chromeDebugger.CaptureTimeline(parseInt(task.target));
      break;
    case 'capturetrace':
      wpt.chromeDebugger.CaptureTrace(task.target);
      break;
    case 'noscript':
      g_commandRunner.doNoScript();
      break;
    case 'overridehost':
      g_overrideHosts[task.target] = task.value;
      g_manipulatingHeaders = true;
      wptHookRequests();
      break;
    case 'addheader':
      var separator = task.target.indexOf(":");
      if (separator > 0) {
        g_addHeaders.push({'name' : task.target.substr(0, separator).trim(),
                           'value' : task.target.substr(separator + 1).trim(),
                           'filter' : typeof(task.value) === 'undefined' ? '' : task.value});
        g_manipulatingHeaders = true;
        wptHookRequests();
      }
      break;
    case 'setheader':
      var separator = task.target.indexOf(":");
      if (separator > 0) {
        g_setHeaders.push({'name' : task.target.substr(0, separator).trim(),
                           'value' : task.target.substr(separator + 1).trim(),
                           'filter' : typeof(task.value) === 'undefined' ? '' : task.value});
        g_manipulatingHeaders = true;
        wptHookRequests();
      }
      break;
    case 'resetheaders':
      g_addHeaders = [];
      g_setHeaders = [];
      break;
    case 'appenduseragent':
      wpt.chromeDebugger.SetUserAgent(navigator.userAgent + ' ' + task.target);
      break;
    case 'collectstats':
      g_processing_task = true;
      wpt.chromeDebugger.CollectStats(task.target, wptTaskCallback);
      break;
    case 'emulatemobile':
      wpt.chromeDebugger.EmulateMobile(task.target);
      break;
    case 'checkresponsive':
      g_processing_task = true;
      g_commandRunner.doCheckResponsive(wptTaskCallback);
      break;
    case 'hascustomcommandline':
      g_hasCustomCommandLine = true;
      break;

    default:
      wpt.LOG.error('Unimplemented command: ', task);
  }

  if (!g_active && !g_processing_task)
    window.setTimeout(wptGetTask, TASK_INTERVAL_SHORT);
    }
  }

// start out by grabbing the main tab and forcing a navigation to
// the local blank page so we are guaranteed to see the navigation
// event
var queryForFocusedTab = {
'active': true,
'windowId': chrome.windows.WINDOW_ID_CURRENT
};
chrome.tabs.query(queryForFocusedTab, function(focusedTabs) {
  // Use the first one even if the length is not the expected value.
  var tab = focusedTabs[0];
  g_tabid = tab.id;
  wpt.LOG.info('Got tab id: ' + tab.id);
  g_commandRunner = new wpt.commands.CommandRunner(g_tabid, window.chrome);
  wpt.chromeDebugger.Init(g_tabid, window.chrome, function(){
    setTimeout(function(){g_starting = true;chrome.tabs.update(g_tabid, {'url': STARTUP_URL});}, STARTUP_DELAY);
  });
});

})());  // namespace
