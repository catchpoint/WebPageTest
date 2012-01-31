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
 * This file is run as the background page of the WebPageTest Chrome driver.
 * It sets up initial testing state, grabs commands by XHR from wptdriver.exe,
 * and runs them.
 *
 * Author: Sam Kerner (skerner at google dot com)
 */

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
var STARTUP_DELAY = 5000;

/** @const */
var TASK_INTERVAL = 1000;

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

var g_active = false;
var g_start = 0;
var g_requesting_task = false;
var g_commandRunner = null;  // Will create once we know the tab id under test.
var g_debugWindow = null;  // May create at window onload.

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
    if (numPendingCallbacks == 0)
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
  // Before we start, remove any other extensions that could change our
  // results.
  window.setTimeout(function() {
    wpt.main.uninstallUnwantedExtensions(UNWANTED_EXTENSIONS, function() {
      // When uninstalls finish, kick off our testing.
      wpt.main.startMeasurements();
    });
  }, STARTUP_DELAY);
};

wpt.main.startMeasurements = function() {
  wpt.LOG.info('Enter wptStartMeasurements');

  // All measurements are done in a tab.  Get the foreground tab,
  // and remember its ID.  This ID is used to open a connection to
  // the content script running in the web page hosted within the tab.
  // to the content script in a
  chrome.tabs.getSelected(null, function(tab) {
    wpt.LOG.info('Got tab id: ' + tab.id);
    g_commandRunner = new wpt.commands.CommandRunner(tab.id, window.chrome);

    if (RUN_FAKE_COMMAND_SEQUENCE) {
      // Run the tasks in FAKE_TASKS.
      window.setInterval(wptFeedFakeTasks, TASK_INTERVAL);
    } else {
      // Fetch tasks from wptdriver.exe .
      window.setInterval(wptGetTask, TASK_INTERVAL);
    }
  });
}

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
    result['value'] = opt_value;

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
    FakeCommand('setinnertext', 'class=kd-appname',
                'This text should replace the word news!'),
    FakeCommand('setinnerhtml', 'class=kd-appname',
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
  wpt.LOG.info('wptGetTask');
  if (!g_requesting_task) {
    g_requesting_task = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://127.0.0.1:8888/task', true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4)
          return;
        if (xhr.status != 200) {
          wpt.LOG.warning('Got unexpected (not 200) XHR status: ' + xhr.status);
          return;
        }
        var resp = JSON.parse(xhr.responseText);
        if (resp.statusCode != 200) {
          wpt.LOG.warning('Got unexpected status code ' + resp.statusCode);
          return;
        }
        if (!resp.data) {
          wpt.LOG.warning('No data?');
          return;
        }
        wptExecuteTask(resp.data);
      };
      xhr.onerror = function() {
        wpt.LOG.warning('Got an XHR error!');
      };
      xhr.send();
    } catch (err) {
      wpt.LOG.warning('Error getting task: ' + err);
    }
    g_requesting_task = false;
  }
}

function wptSendEvent(event_name, query_string) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://127.0.0.1:8888/event/' + event_name + query_string,
             true);
    xhr.send();
  } catch (err) {
    wpt.LOG.warning('Error sending page load XHR: ' + err);
  }
}

// Install an onLoad handler for all tabs.
chrome.tabs.onUpdated.addListener(function(tabId, props) {
  if (g_active && props.status == 'loading') {
    g_start = new Date().getTime();
    wptSendEvent('navigate', '');
  }
});

// Add a listener for messages from script.js through message passing.
chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    wpt.LOG.info('Message from content script: ' + request.message);
    if (request.message == 'DOMElementLoaded') {
      var dom_element_time = new Date().getTime() - g_start;
      wptSendEvent(
          'dom_element',
          '?name_value=' + encodeURIComponent(request['name_value']) +
          '&time=' + dom_element_time);
    }
    else if (request.message == 'AllDOMElementsLoaded') {
      var time = new Date().getTime() - g_start;
      wptSendEvent(
          'all_dom_elements_loaded',
          '?load_time=' + time);
    }
    else if (request.message == 'wptLoad') {
      wptSendEvent('load', '');
    }
    else if (request.message == 'wptWindowTiming') {
      wpt.logging.closeWindowIfOpen();
      g_active = false;
      wptSendEvent(
          'window_timing',
          '?domContentLoadedEventStart=' +
              request['domContentLoadedEventStart'] +
          '&domContentLoadedEventEnd=' +
              request['domContentLoadedEventEnd'] +
          '&loadEventStart=' + request['loadEventStart'] +
          '&loadEventEnd=' + request['loadEventEnd']);
    }
    // TODO: check whether calling sendResponse blocks in the content script
    // side in page.
    sendResponse({});
});

/***********************************************************
                      Script Commands
***********************************************************/

// execute a single task/script command
function wptExecuteTask(task) {
  if (task.action.length) {
    if (task.record)
      g_active = true;
    else
      g_active = false;

    // Decode and execute the actual command.
    // Commands are all lowercase at this point.
    wpt.LOG.info('Running task ' + task.action + ' ' + task.target);
    switch (task.action) {
      case 'navigate':
        g_commandRunner.doNavigate(task.target);
        break;
      case 'exec':
        g_commandRunner.doExec(task.target);
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
        g_commandRunner.doClick(task.target);
        break;
      case 'setinnerhtml':
        g_commandRunner.doSetInnerHTML(task.target, task.value);
        break;
      case 'setinnertext':
        g_commandRunner.doSetInnerText(task.target, task.value);
        break;
      case 'setvalue':
        g_commandRunner.doSetValue(task.target, task.value);
        break;
      case 'submitform':
        g_commandRunner.doSubmitForm(task.target);
        break;

      default:
        wpt.LOG.error('Unimplemented command: ', task);
    }

    if (!g_active)
      window.setTimeout(wptGetTask, TASK_INTERVAL_SHORT);
  }
}

wpt.main.onStartup();

})());  // namespace
