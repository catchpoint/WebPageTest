goog.provide('wpt.main');

var STARTUP_DELAY = 5000;
var TASK_INTERVAL = 1000;
var TASK_INTERVAL_SHORT = 0;
var g_active=false;
var g_tabId = -1;
var g_start = 0;
var g_requesting_task = false;

// on startup, kick off our testing
window.setTimeout(wptStartup, STARTUP_DELAY);

function wptStartup() {
  chrome.tabs.getSelected(null, function(tab){
    g_tabId = tab.id;
    window.setInterval(wptGetTask, TASK_INTERVAL);
  });
}

// get the next task from the wptdriver
function wptGetTask(){
  if (!g_requesting_task) {
    g_requesting_task = true;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "http://127.0.0.1:8888/task", true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
          var resp = JSON.parse(xhr.responseText);
          if (resp.statusCode == 200)
            wptExecuteTask(resp.data);
        }
      };
      xhr.send();
    } catch(err){}
    g_requesting_task = false;
  }
}

// notification that navigation started
function wptOnNavigate(){
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8888/event/navigate", true);
    xhr.send();
  } catch(err) {}
}

// notification that the page loaded
function wptOnLoad(load_time){
  try {
    g_active = false;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8888/event/load?load_time="+load_time, true);
    xhr.send();
  } catch(err) {}
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
                      Utility Functions
***********************************************************/
function trim(stringToTrim) {
  return stringToTrim.replace(/^\s+|\s+$/g,"");
}

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
    if (task.action == "navigate")
      wptNavigate(task.target);
    else if (task.action == "exec")
      wptExec(task.target);
    else if (task.action == "setcookie")
      wptSetCookie(task.target, task.value);

    if (!g_active)
      window.setTimeout(wptGetTask, TASK_INTERVAL_SHORT );
  }
}

// exec
function wptExec(script){
  chrome.tabs.executeScript(null, {code:script});
}

// navigate
function wptNavigate(url){
  chrome.tabs.update(g_tabId, {"url":url});
}

// setCookie
function wptSetCookie(cookie_path, data) {
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
