goog.require('goog.debug');
goog.require('goog.debug.FancyWindow');
goog.require('goog.debug.Logger');
goog.require('wpt.commands');

goog.provide('wpt.main');

var STARTUP_DELAY = 5000;
var TASK_INTERVAL = 1000;
var TASK_INTERVAL_SHORT = 0;
var g_active = false;
var g_tabId = -1;
var g_start = 0;
var g_requesting_task = false;
var g_commandRunner = new wpt.commands.CommandRunner(window.chrome);

// Developers can set DEBUG to true to see what commands are being run.
/** @const */
var DEBUG = false;

var LOG = console;
if (DEBUG) {
  window.onload = function() {
    var debugWindow = new goog.debug.FancyWindow('main');
    debugWindow.setEnabled(true);
    debugWindow.init();

    // Create a logger.
    LOG = goog.debug.Logger.getLogger('log');
  };
}

// on startup, kick off our testing
window.setTimeout(wptStartup, STARTUP_DELAY);

function wptStartup() {
  LOG.info("wptStartup");
  chrome.tabs.getSelected(null, function(tab){
    LOG.info("Got tab id: " + tab.id);
    g_tabId = tab.id;
    window.setInterval(wptGetTask, TASK_INTERVAL);
  });
}

// get the next task from the wptdriver
function wptGetTask(){
  LOG.info("wptGetTask");
  if (!g_requesting_task) {
    g_requesting_task = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "http://127.0.0.1:8888/task", true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4)
          return;
        if (xhr.status != 200) {
          LOG.warning("Got unexpected (not 200) XHR status: " + xhr.status);
          return;
        }
        var resp = JSON.parse(xhr.responseText);
        if (resp.statusCode != 200) {
          LOG.warning("Got unexpected status code " + resp.statusCode);
          return;
        }
        if (!resp.data) {
          LOG.warning("No data?");
          return;
        }
        wptExecuteTask(resp.data);
      };
      xhr.onerror = function() {
        LOG.warning("Got an XHR error!");
      };
      xhr.send();
    } catch(err){
      LOG.warning("Error getting task: " + err);
    }
    g_requesting_task = false;
  }
}

// notification that navigation started
function wptOnNavigate(){
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8888/event/navigate", true);
    xhr.send();
  } catch (err) {
    LOG.warning("Error sending navigation XHR: " + err);
  }
}

// notification that the page loaded
function wptOnLoad(load_time){
  try {
    g_active = false;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8888/event/load?load_time="+load_time, true);
    xhr.send();
  } catch (err) {
    LOG.warning("Error sending page load XHR: " + err);
  }
}

// install an onLoad handler for all tabs
chrome.tabs.onUpdated.addListener(function(tabId, props) {
  if (g_active){
    if (props.status == "loading")
      wptOnNavigate();
  }
});

// Add a listener for messages from script.js.
chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(data) {
    if (g_active && data.message == "wptLoad") {
      wptOnLoad(data.load_time);
    }
  });
});

/***********************************************************
                      Script Commands
***********************************************************/

// execute a single task/script command
function wptExecuteTask(task){
  if (task.action.length) {
    if (task.record)
      g_active = true;
    else
      g_active = false;

    // decode and execute the actual command
    LOG.info("Running task " + task.action);
    if (task.action == "navigate")
      g_commandRunner.doNavigate(g_tabId, task.target);
    else if (task.action == "exec")
      g_commandRunner.doExec(task.target);
    else if (task.action == "setcookie")
      g_commandRunner.doSetCookie(task.target, task.value);

    if (!g_active)
      window.setTimeout(wptGetTask, TASK_INTERVAL_SHORT );
  }
}
