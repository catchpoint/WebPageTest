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
******************************************************************************/

window['wpt'] = window['wpt'] || {};

(function() {  // Begin closure

var STARTUP_DELAY = 5000;
var TASK_INTERVAL = 1000;
var TASK_INTERVAL_SHORT = 0;

var g_active = false;
var g_requesting_task = false;

/**
 * Inform the driver that an event occurred.
 */
wpt.sendEventToDriver_ = function(eventName, opt_params) {
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

  try {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.send();
  } catch (err) {
  }
};

// Get the next task from the wptdriver.
wpt.getTask = function() {
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
            } catch (err) {
              alert('Error parsing response as JSON: ' +
                    xhr.responseText.substr(0, 120) + '[...]\n');
            }
            if (resp.statusCode == 200 && resp.data) {
              wpt.executeTask(resp.data);
            }
          }
        }
      };
      xhr.send();
    } catch (err) {}
    g_requesting_task = false;
  }
};

wpt.onStartTesting = function() {
  // Install the event handlers for navigation events
  safari.application.activeBrowserWindow.activeTab.addEventListener("beforeNavigate", function(){
    wpt.sendEventToDriver_('navigate');
  }, false);

  safari.application.activeBrowserWindow.activeTab.addEventListener("navigate", function(){
    wpt.sendEventToDriver_('load');
  }, false);

  // Fetch tasks from wptdriver.exe .
  window.setInterval(function() {wpt.getTask();}, TASK_INTERVAL);
};

wpt.onStartup = function() {
  safari.application.activeBrowserWindow.activeTab.url = 'http://127.0.0.1:8888/blank.html';

  setTimeout(function() {wpt.onStartTesting();}, STARTUP_DELAY);
}

/***********************************************************
                      Script Commands
***********************************************************/

/** execute a single task/script command */
wpt.executeTask = function(task) {
  if (task.action && task.action.length) {
    g_active = !!task.record;
    switch (task.action) {
      case 'navigate':
        safari.application.activeBrowserWindow.activeTab.url = task.target;
        break;
    }

    if (!g_active) {
      setTimeout(function() {wpt.getTask();}, TASK_INTERVAL_SHORT);
    }
  }
};

// Initialize the startup
setTimeout(function() {wpt.onStartup();}, STARTUP_DELAY);

})();  // End closure