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

goog.require('wpt.commands');
goog.require('wpt.logging');

goog.provide('wpt.main');

((function() {  // namespace

/** @const */
const STARTUP_DELAY = 0;
const STARTUP_FAILSAFE_DELAY = 5000;

/** @const */
const TASK_INTERVAL = 5000;
const TASK_INTERVAL_STARTUP = 100;

// Run tasks slowly when testing, so that we can see errors in the logs
// before navigation closes the dev tools window.
const FAKE_TASK_INTERVAL = 5000;

/** @const */
const TASK_INTERVAL_SHORT = 0;

// Set this to true, and set FAKE_COMMAND_SEQUENCE below, to feed a sequence
// of commands to run.  This makes testing new commands easy, because you do
// not need to use wptdriver.exe while debugging.
/** @const */
const RUN_FAKE_COMMAND_SEQUENCE = false;

// regex to extract a host name from a URL
const URL_REGEX = /([htps:]*\/\/)([^\/]+)(.*)/i;

const STARTUP_URL = 'http://127.0.0.1:8888/blank2.html';

let g_starting = false;
let g_active = false;
let g_start = 0;
let g_requesting_task = false;
let g_processing_task = false;
let g_commandRunner = null;  // Will create once we know the tab id under test.
let g_debugWindow = null;  // May create at window onload.
let g_addHeaders = [];
let g_setHeaders = [];
let g_blockingRequests = false;
let g_manipulatingHeaders = false;
let g_hasCustomCommandLine = false;
let g_started = false;
let g_requestsHooked = false;
let g_failsafeStartup = undefined;
let g_updatedCount = 0;
let g_taskTimer = undefined;
let g_taskInterval = TASK_INTERVAL_STARTUP;
const g_overrideHosts = {};
const g_blocks = [];

wpt.main.onStartup = function() {
  if (RUN_FAKE_COMMAND_SEQUENCE) {
    // Run the tasks in FAKE_TASKS.
    window.setInterval(wptFeedFakeTasks, FAKE_TASK_INTERVAL);
  } else {
    // Fetch tasks from wptdriver.exe.
    g_taskTimer = window.setInterval(wptGetTask, g_taskInterval);
    window.setTimeout(() => wptGetTask(), TASK_INTERVAL_SHORT);
  }
};

// Install an onLoad handler for all tabs.
browser.tabs.onUpdated.addListener(function(tabId, props) {
  g_updatedCount++;
  if (!g_started && g_starting && (props.status == 'complete' || g_updatedCount > 5)) {
    // Kill the failsafe timer
    if (g_failsafeStartup != undefined) {
      clearInterval(g_failsafeStartup);
      g_failsafeStartup = undefined;
    }
    // handle the startup sequencing (attach the debugger
    // after the browser loads and then start testing).
    g_started = true;
    wpt.main.onStartup();
  } else if (g_active && tabId == g_tabid) {
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
  const result = {
    'action': action,
    'target': target
  };

  if (typeof opt_value != 'undefined')
    result.value = opt_value;

  return result;
}


let FAKE_TASKS_IDX = 0;
const FAKE_TASKS = [
    FakeCommand('navigate', 'http://www.example.com/'),

    FakeCommand('setdomelement', 'doneWaiting=yes'),
    //FakeCommand('setdomelement', 'doneWaiting=no'),

    // Add a div including the done waiting marker.
    FakeCommand('exec',
                'var el = window.document.createElement("div"); ' +
                'el.setAttribute("id", "testInjectionElement"); ' +
                'el.setAttribute("doneWaiting", "yes"); ' +
                'el.innerText = "See this text??????????????????????"; ' +
                'window.document.body.appendChild(el); '),

    FakeCommand('exec',
                'alert("done waiting.");'),

    FakeCommand('block', 'iana-logo-pageheader.png'),

    // Can we navigate?
    FakeCommand('navigate', 'http://www.example.com/'),

    // Can exec read the DOM of the page?
    FakeCommand(
        'exec',
        'console.log("window.location.href is: " + window.location.href + "\\n");'),

    // Can exec alter the DOM of the page?
    FakeCommand(
        'exec',
        'window.document.title = "This title is from an exec command"'),

    // Is exec in a page limited to the permissions of that page?
    FakeCommand('exec', [
        'try {',
        '  var foo = browser.sendMessage;',
        '  alert("BUG: Sandbox should not allow access to WebExtension APIs.");',
        '} catch (ex) {',
        '  console.log("GOOD: Got ex:" + ex);',
        '}'].join('\n')),

    // Search for a cute dog on youtube.
    FakeCommand('navigate', 'http://www.youtube.com/'),
    FakeCommand('setvalue', 'id=masthead-search-term', 'boston mspca legend'),

    FakeCommand('submitform', 'id=masthead-search'),

    // See some doodles on google.com.
    FakeCommand('navigate', 'http://www.google.com/'),
    FakeCommand('click', 'name\'btnI'),

    // Alter the heading on news.google.com.
    FakeCommand('navigate', 'http://www.google.com/news'),
    FakeCommand('setinnertext', 'class=kd-appname-wrapper',
                'This text should replace the word news!'),

    FakeCommand('setinnerhtml', 'class=kd-appname-wrapper',
                'This <b>HTML</b> should replace the word news!'),

    FakeCommand('setvalue', 'class=searchField', 'Susie, the Qmiester'),
    FakeCommand('submitform', 'id=search-hd'),

    // Test that we can set cookies.
    FakeCommand('setcookie', 'http://www.xol.com', 'zip = 20166'),
    FakeCommand(
        'setcookie', 'http://www.yol.com',
        'TestData=bTest; expires=Fri Aug 12 2030 18:50:34 GMT-0400 (EDT)'),
    FakeCommand(
        'setcookie', 'http://www.zol.com',
        'TestData = cTest; expires = Fri Aug 12 2030 19:50:34 GMT-0400 (EDT)')
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
    fetch('http://127.0.0.1:8888/task').then(function(response) {
      if (response.status == 200) {
        response.json().then(function(resp) {
          try {
            if (resp['statusCode'] == 200) {
              if (resp['data'] !== undefined) {
                wptExecuteTask(resp.data);
              }
            } else {
              wpt.LOG.warning('Got unexpected status code ' + resp['statusCode']);
            }
            g_requesting_task = false;
          } catch(err) {
            g_requesting_task = false;
            wpt.LOG.warning('Execute task threw an exception');
          }
        }).catch(function() {
          g_requesting_task = false;
        });
      } else {
        wpt.LOG.warning('Unexpected task response status: ' + response.status);
        g_requesting_task = false;
      }
    }).catch(function(err) {
      g_requesting_task = false;
      wpt.LOG.warning('Task fetch failed');
    });
  }
}

function wptSendEvent(event_name, data, attempt) {
  const url = 'http://127.0.0.1:8888/event/' + event_name ;
  fetch(url, {method: 'POST', body: data});
}

function wptHostMatches(host, filter) {
  let matched = false;
  if (!filter.length || filter == '*' || host.toLowerCase() == filter.toLowerCase()) {
    matched = true;
  } else {
    const re = new RegExp(filter);
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

  if (g_blockingRequests && details.tabId == g_tabid) {
    for (const block of g_blocks) {
      if (details.url.includes(block)) {
        wpt.LOG.info('Blocking resource at URL: ' + details.url);
        action.cancel = true;
        return action;
      }
    }
  }

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

browser.webRequest.onCompleted.addListener((details) => {
    if (g_active && details.tabId == g_tabid) {
      wpt.LOG.info('Completed, status = ' + details.statusCode);
      if (details.statusCode >= 400) {
        g_active = false;
        wptSendEvent('navigate_error?error=' + details.statusCode, '');
      }
    }
  }, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame']});

browser.webRequest.onHeadersReceived.addListener((details) => ({
    responseHeaders: details.responseHeaders.filter(h => h.name.toLowerCase() !== 'content-security-policy')
  }), { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] }, ["blocking", "responseHeaders"]);

function wptHookRequests() {
  if (!g_requestsHooked) {
    g_requestsHooked = true;
    var urlHooks = g_hasCustomCommandLine ? ["<all_urls>"] : ['https://*/*'];
    browser.webRequest.onBeforeSendHeaders.addListener(wptBeforeSendHeaders,
      {urls: urlHooks},
      ['blocking', 'requestHeaders']
    );
    browser.webRequest.onBeforeRequest.addListener(wptBeforeSendRequest,
      {urls: urlHooks},
      ['blocking']
    );
  }
}

// Add a listener for messages from script.js through message passing.
browser.runtime.onMessage.addListener((req, sender, respond) => {
    wpt.LOG.info('Message from content script: ' + req.message);
    if (req.message == 'DOMElementLoaded') {
      var dom_element_time = new Date().getTime() - g_start;
      wptSendEvent(
          'dom_element?name_value=' + encodeURIComponent(req.name_value) +
          '&time=' + dom_element_time, '');
    }
    else if (req.message == 'AllDOMElementsLoaded') {
      var time = new Date().getTime() - g_start;
      wptSendEvent('all_dom_elements_loaded?load_time=' + time, '');
    }
    else if (req.message == 'wptLoad') {
      wptSendEvent('load?timestamp=' + req.timestamp + 
                   '&fixedViewport=' + req.fixedViewport, '');
    } else if (req.message == 'wptResponsive') {
      if (req['isResponsive'] !== undefined)
        wptSendEvent('responsive?isResponsive=' + req.isResponsive, '');
    } else if (req.message == 'wptCustomMetrics') {
      if (req['data'] !== undefined)
        wptSendEvent('custom_metrics', JSON.stringify(req.data));
    }
    // TODO: check whether calling respond blocks in the content script
    // side in page.
    respond({});
});

/***********************************************************
                      Script Commands
***********************************************************/
const wptTaskCallback = function() {
  g_processing_task = false;
  if (!g_active)
    window.setTimeout(() => wptGetTask(), TASK_INTERVAL_SHORT);
}

// execute a single task/script command
function wptExecuteTask(task) {
  if (task.action.length) {
    if (task.record) {
      if (g_taskTimer !== undefined && g_taskInterval != TASK_INTERVAL) {
        g_taskInterval = TASK_INTERVAL;
        window.clearInterval(g_taskTimer);
        g_taskTimer = window.setInterval(wptGetTask, g_taskInterval);
      }
      g_active = true;
    } else {
      g_active = false;
    }
    // Decode and execute the actual command.
    // Commands are all lowercase at this point.
    wpt.LOG.info('Running task ' + task.action + ' ' + task.target);
    switch (task.action) {
      case 'navigate':
        g_processing_task = true;
        g_commandRunner.doNavigate(task.target, wptTaskCallback);
        break;
      case 'setcookie':
        g_commandRunner.doSetCookie(task.target, task.value);
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
      case 'overridehost':
        g_overrideHosts[task.target] = task.value;
        g_manipulatingHeaders = true;
        wptHookRequests();
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
      case 'checkresponsive':
        g_processing_task = true;
        g_commandRunner.doCheckResponsive(wptTaskCallback);
        break;
      case 'hascustomcommandline':
        g_hasCustomCommandLine = true;
        break;
      case 'resetheaders':
        g_addHeaders = [];
        g_setHeaders = [];
        break;
      case 'block':
        const split = task.target.split(" ");
        for (const pattern of split) {
          g_blocks.push(pattern);
        }
        g_blockingRequests = true;
        wptHookRequests();
        break;
      case 'exec':
        g_processing_task = true;
        g_commandRunner.doEvalInPage(task.target, wptTaskCallback);
        break;
      case 'collectstats':
        g_processing_task = true;
        var customMetrics = task['target'] || '';
        g_commandRunner.doCollectStats(customMetrics, wptTaskCallback);
        break;
      case 'capturetimeline':
        // TODO
      case 'capturetrace':
        // TODO
      case 'noscript':
        // TODO
      case 'addheader':
        // TODO
      case 'appenduseragent':
        // TODO
      case 'emulatemobile':
        // TODO
      default:
        wpt.LOG.error('Unimplemented command: ', task);
    }

    if (!g_active && !g_processing_task) {
      window.setTimeout(wptGetTask, TASK_INTERVAL_SHORT);
    }
  }
}

function queryTabs() {
  // start out by grabbing the main tab and forcing a navigation to
  // the local blank page so we are guaranteed to see the navigation
  // event
  const queryForFocusedTab = {
  'active': true,
  'windowId': browser.windows.WINDOW_ID_CURRENT
  };
  browser.tabs.query(queryForFocusedTab, focusedTabs => {
    if (!focusedTabs.length) {
      setTimeout(queryTabs, 500);
      return;
    }
    var tab = focusedTabs[0];
    g_tabid = tab.id;
    wpt.LOG.info('Got tab id: ' + tab.id);
    g_commandRunner = new wpt.commands.CommandRunner(g_tabid, window.chrome);

    setTimeout(() => {
      g_starting = true;
      browser.tabs.update(g_tabid, { url: STARTUP_URL });
    }, STARTUP_DELAY);

    g_failsafeStartup = setInterval(() => {
      g_starting = true;
      if (!g_failsafeStartup) {
        return;
      }
      browser.tabs.update(g_tabid, { url: STARTUP_URL });
    }, STARTUP_FAILSAFE_DELAY);
  });
}

queryTabs();

})());  // namespace
