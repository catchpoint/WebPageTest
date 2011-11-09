
goog.require('wpt.logging');
goog.require('wpt.commands');

goog.provide('wpt.main');

((function() {  // namespace

/** @const */
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

var g_active = false;
var g_start = 0;
var g_requesting_task = false;
var g_commandRunner = null;  // Will create once we know the tab id under test.
var g_debugWindow = null;  // May create at window onload.

// On startup, kick off our testing
window.setTimeout(wptStartup, STARTUP_DELAY);

function wptStartup() {
  wpt.LOG.info("wptStartup");
  chrome.tabs.getSelected(null, function(tab){
    wpt.LOG.info("Got tab id: " + tab.id);
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

var FAKE_TASKS_IDX = 0;
var FAKE_TASKS = [
  {
    'action': 'navigate',
    'target': 'http://www.youtube.com/'
  },
  {
    'action': 'setvalue',
    'target': 'id=masthead-search-term',
    'value': 'boston mspca legend'
  },
  {
    'action': 'submitform',
    'target': 'id=masthead-search'
  },
  {
    'action': 'navigate',
    'target': 'http://www.google.com/'
  },
  {
    'action': 'click',
    'target': 'name\'btnI'
  },
  {
    'action': 'navigate',
    'target': 'http://www.google.com/news'
  },
  {
    'action': 'setinnertext',
    'target': 'class=kd-appname',
    'value': 'This text should replace the word news!'
  },
  {
    'action': 'setinnerhtml',
    'target': 'class=kd-appname',
    'value': 'This <b>HTML</b> should replace the word news!'
  },
  {
    'action': 'setvalue',
    'target': 'class=searchField',
    'value': 'Susie, the Qmiester'
  },
  {
    'action': 'submitform',
    'target': 'id=search-hd'
  }
];

function wptFeedFakeTasks() {
  if (FAKE_TASKS.length == FAKE_TASKS_IDX) {
    console.log("DONE");
    return;
  }
  wptExecuteTask(FAKE_TASKS[FAKE_TASKS_IDX++]);
}

// Get the next task from the wptdriver
function wptGetTask(){
  wpt.LOG.info("wptGetTask");
  if (!g_requesting_task) {
    g_requesting_task = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "http://127.0.0.1:8888/task", true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4)
          return;
        if (xhr.status != 200) {
          wpt.LOG.warning("Got unexpected (not 200) XHR status: " + xhr.status);
          return;
        }
        var resp = JSON.parse(xhr.responseText);
        if (resp.statusCode != 200) {
          wpt.LOG.warning("Got unexpected status code " + resp.statusCode);
          return;
        }
        if (!resp.data) {
          wpt.LOG.warning("No data?");
          return;
        }
        wptExecuteTask(resp.data);
      };
      xhr.onerror = function() {
        wpt.LOG.warning("Got an XHR error!");
      };
      xhr.send();
    } catch(err){
      wpt.LOG.warning("Error getting task: " + err);
    }
    g_requesting_task = false;
  }
}

function wptSendEvent(event_name, query_string) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8888/event/" + event_name + query_string,
             true);
    xhr.send();
  } catch (err) {
    wpt.LOG.warning("Error sending page load XHR: " + err);
  }
}

// Install an onLoad handler for all tabs.
chrome.tabs.onUpdated.addListener(function(tabId, props) {
  if (g_active && props.status == "loading") {
    g_start = new Date().getTime();
    wptSendEvent("navigate", "");
  }
});

// Add a listener for messages from script.js through message passing.
chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    wpt.LOG.info("Message from content script: " + request.message);
    if (request.message == "DOMElementLoaded") {
      var dom_element_time = new Date().getTime() - g_start;
      wptSendEvent(
          "dom_element",
          "?name_value=" + encodeURIComponent(request['name_value']) +
          "&time=" + dom_element_time);
    }
    else if (request.message == "AllDOMElementsLoaded") {
      var time = new Date().getTime() - g_start;
      wptSendEvent(
          "all_dom_elements_loaded",
          "?load_time=" + time);
    }
    else if (request.message == "wptLoad") {
      wpt.logging.closeWindowIfOpen();
      g_active = false;
      wptSendEvent(
          "load",
          "?load_time=" + request['load_time'] +
          "&dom_content_loaded_start=" + request['dom_content_loaded_start']);
    }
    // TODO: check whether calling sendResponse blocks in the content script side in page.
    sendResponse({});
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

    // Decode and execute the actual command.
    // Commands are all lowercase at this point.
    wpt.LOG.info("Running task " + task.action + " " + task.target);
    switch (task.action) {
      case "navigate":
        g_commandRunner.doNavigate(task.target);
        break;
      case "exec":
        g_commandRunner.doExec(task.target);
        break;
      case "setcookie":
        g_commandRunner.doSetCookie(task.target, task.value);
        break;
      case "block":
        g_commandRunner.doBlock(task.target);
        break;
      case "setdomelement":
        // Sending request to set the DOM element has to happen only at the
        // navigate event after the content script is loaded. So, this just
        // sets the global variable.
        wpt.commands.g_domElements.push(task.target);
        break;
      case "click":
        g_commandRunner.doClick(task.target);
        break;
      case "setinnerhtml":
        g_commandRunner.doSetInnerHTML(task.target, task.value);
        break;
      case "setinnertext":
        g_commandRunner.doSetInnerText(task.target, task.value);
        break;
      case "setvalue":
        g_commandRunner.doSetValue(task.target, task.value);
        break;
      case "submitform":
        g_commandRunner.doSubmitForm(task.target);
        break;

      default:
        wpt.LOG.error("Unimplemented command: ", task);
    }

    if (!g_active)
      window.setTimeout(wptGetTask, TASK_INTERVAL_SHORT);
  }
}

})());  // namespace
