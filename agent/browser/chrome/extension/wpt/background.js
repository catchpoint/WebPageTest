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
var g_started = false;
var g_requestsHooked = false;
var g_webdriver_mode = false;
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
    wptQuery('http://127.0.0.1:8888/mode', function(isError, response) {
      if (!isError && response.webdriver) {
        g_webdriver_mode = true;
        g_active = true;
        wpt.LOG.info('WebDriver mode: TRUE');
        // Note: In WebDriver mode, we will not be able to hook the chrome debugger because the Chrome
        // WebDriver installs an automation extension in the browser which also attaches to the debugger
        // and since only one client can attach to the debugger, we refrain ourselves. The downside is
        // that we won't be able to capture timeline and other chrome dev-tools related stuff from the
        // extension and send them to the hook. But, this is okay, since WebDriver supports mechanism to
        // retrieve the same.
      } else {
        // Setup the debugger.
        wpt.LOG.info('WebDriver mode: FALSE');
        wpt.chromeDebugger.Init(g_tabid, window.chrome, function() {
          wpt.LOG.info('Chrome debugger successfully attached to tabId: ' + g_tabid);
        });
        // Fetch tasks from wptdriver.exe.
        window.setInterval(wptGetTask, TASK_INTERVAL);
      }
    });
  }
};

function runSoon(callback) {
  setTimeout(callback, 0);
}

// Install an onLoad handler for all tabs.
chrome.tabs.onUpdated.addListener(function(tabId, props, tabDetails) {
  wpt.LOG.info('onUpdated called with tabId: ' + tabId + "; for url: " + tabDetails.url);
  if (g_tabid == tabId) {
    if (!g_started && g_starting && props.status == 'complete') {
      // We are done loading up the STARTUP_URL. Handle the startup sequencing.
      g_started = true;
      g_starting = false;
      wpt.main.onStartup();
      return;
    }
    if (g_started && (g_active || g_webdriver_mode)) {
      if (props.status == 'loading') {
        g_start = new Date().getTime();
        wptSendEvent('navigate', '');
      } else if (props.status == 'complete') {
        wptSendEvent('complete', '');
        if (g_webdriver_mode) {
          // Collect stats as soon as possible and send them out to the hook.
          runSoon(function () {
            g_commandRunner.doCollectStats('', function() {
              wpt.LOG.info('[webdriver-mode] collect stats completed!');
            });
          });
        }
      }
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
    wptQuery('http://127.0.0.1:8888/task', function(isError, response) {
      if (!isError) {
        wptExecuteTask(response); 
      }
      g_requesting_task = false;
    });
  }
}

function wptQuery(url, callback) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4)
        return;
      if (xhr.status != 200) {
        wpt.LOG.warning('Received a ' + xhr.status + ' error code while requesting: ' + url);
        callback(true);
        return;
      }
      var resp = JSON.parse(xhr.responseText);
      if (resp.statusCode != 200) {
        wpt.LOG.warning('Received a XHR response with status code: ' + resp.statusCode + ' for url: ' + url);
        callback(true);
        return;
      }
      if (!resp.data) {
        wpt.LOG.warning('Received a XHR response with empty data for url: ' + url);
        callback(true);
        return;
      }
      callback(false, resp.data);
    };
    xhr.onerror = function() {
      wpt.LOG.warning('Encountered error while requesting: ' + url);
      callback(true);
    }
    xhr.send();
  } catch (err) {
    wpt.LOG.warning('Caught exception: ' + err + ' while requesting: ' + url);
    callback(true);
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
    if (scheme.toLowerCase() == "https://") {
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
    
    if (modified)
      response = {requestHeaders: details.requestHeaders};
  }
  return response;
};

var wptBeforeSendRequest = function(details) {
  var action = {};
  if (g_active && details.tabId == g_tabid) {
    var urlParts = details.url.match(URL_REGEX);
    var scheme = urlParts[1].toString();
    var host = urlParts[2].toString();
    var object = urlParts[3].toString();
    wpt.LOG.info('Checking host override for "' + host +
                 '" in URL ' + details.url);
    if (g_overrideHosts[host] !== undefined) {
      var newHost = g_overrideHosts[host];
      wpt.LOG.info('Overriding host ' + host + ' to ' + newHost);
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
      if (!g_webdriver_mode) {
        g_active = false;
        wpt.chromeDebugger.SetActive(g_active);
      }
      wptSendEvent('navigate_error?error=' + error_code +
                   '&str=' + encodeURIComponent(details.error), '');
    }
  }, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame']}
);

chrome.webRequest.onCompleted.addListener(function(details) {
    if (g_active && details.tabId == g_tabid) {
      wpt.LOG.info('Completed, status = ' + details.statusCode);
      if (details.statusCode >= 400) {
        if (!g_webdriver_mode) {
          g_active = false;
          wpt.chromeDebugger.SetActive(g_active);
        }
        wptSendEvent('navigate_error?error=' + details.statusCode, '');
      }
    }
  }, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame']}
);

function wptHookRequests() {
  if (!g_requestsHooked) {
    g_requestsHooked = true;
    chrome.webRequest.onBeforeSendHeaders.addListener(wptBeforeSendHeaders,
      {urls: ['https://*/*']},
      ['blocking', 'requestHeaders']
    );
    chrome.webRequest.onBeforeRequest.addListener(wptBeforeSendRequest,
      {urls: ['https://*/*']},
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
    }
    else if (request.message == 'wptBeforeUnload' && g_webdriver_mode) {
      // We are about to move to a new page. Let the hook know so that it can prepare for the next step.
      wptSendEvent('before_unload', '');
    }
    else if (request.message == 'wptWindowTiming') {
      wpt.logging.closeWindowIfOpen();
      if (!g_webdriver_mode) {
        g_active = false;
        wpt.chromeDebugger.SetActive(g_active);
      }
      wptSendEvent(
          'window_timing',
          '?domContentLoadedEventStart=' +
              request.domContentLoadedEventStart +
          '&domContentLoadedEventEnd=' +
              request.domContentLoadedEventEnd +
          '&loadEventStart=' + request.loadEventStart +
          '&loadEventEnd=' + request.loadEventEnd +
          '&msFirstPaint=' + request.msFirstPaint);
    }
    else if (request.message == 'wptDomCount') {
      wptSendEvent('domCount', 
                   '?domCount=' + request.domCount);
    }
    else if (request.message == 'wptMarks') {
      if (request['marks'] !== undefined &&
          request.marks.length) {
        for (var i = 0; i < request.marks.length; i++) {
          var mark = request.marks[i];
          mark.type = 'mark';
          wptSendEvent('timed_event', '', JSON.stringify(mark));
        }
      }
    } else if (request.message == 'wptStats') {
      var stats = '?';
      if (request['domCount'] !== undefined)
        stats += 'domCount=' + request.domCount;
      wptSendEvent('stats', stats);
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
  if (g_webdriver_mode) {
    return; // Just a safe guard in case we shoot ourselves in the foot.
  }
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
        wpt.chromeDebugger.CaptureTrace();
        break;
      case 'noscript':
        g_commandRunner.doNoScript();
        break;
      case 'overridehost':
        wptHookRequests();
        g_overrideHosts[task.target] = task.value;
        break;
      case 'addheader':
        var separator = task.target.indexOf(":");
        if (separator > 0)
          g_addHeaders.push({'name' : task.target.substr(0, separator).trim(),
                             'value' : task.target.substr(separator + 1).trim(),
                             'filter' : typeof(task.value) === 'undefined' ? '' : task.value});
        wptHookRequests();
        break;
      case 'setheader':
        var separator = task.target.indexOf(":");
        if (separator > 0)
          g_setHeaders.push({'name' : task.target.substr(0, separator).trim(),
                             'value' : task.target.substr(separator + 1).trim(),
                             'filter' : typeof(task.value) === 'undefined' ? '' : task.value});
        wptHookRequests();
        break;
      case 'resetheaders':
        g_addHeaders = [];
        g_setHeaders = [];
        break;
      case 'collectstats':
        g_processing_task = true;
        wpt.chromeDebugger.CollectStats(function(){
          g_commandRunner.doCollectStats(task.target, wptTaskCallback);
        });
        break;
      case 'emulatemobile':
        wpt.chromeDebugger.EmulateMobile(task.target);
        break;
      case 'checkresponsive':
        g_processing_task = true;
        g_commandRunner.doCheckResponsive(wptTaskCallback);
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
  wpt.LOG.info('Got tab with id: ' + tab.id + ' and url: ' + tab.url);
  g_commandRunner = new wpt.commands.CommandRunner(g_tabid, window.chrome);

  setTimeout(function() {
    g_starting = true;
    chrome.tabs.update(g_tabid, {'url': STARTUP_URL});
  }, STARTUP_DELAY);
});

})());  // namespace
