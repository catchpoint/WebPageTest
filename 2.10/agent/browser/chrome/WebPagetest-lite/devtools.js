var devtools = {};
devtools.active = false;
devtools.STARTED = 'started';
devtools.PAGE_LOADED = 'page_loaded';

/*********************************************************************************
**********************************************************************************/
devtools.OnMessage = function(tabid, message, params) {
  if (devtools.active) {
    console.log(message);
    if (message === 'Page.loadEventFired') {
      wpt.DevToolsPageLoaded();
    }
  }
};

/*********************************************************************************
**********************************************************************************/
devtools.Attach = function() {
  chrome.debugger.attach({'tabId': wpt.tabid}, "1.0", function(){
    chrome.debugger.onEvent.addListener(devtools.OnMessage);
    chrome.debugger.sendCommand({'tabId': wpt.tabid}, 'Network.enable');
    chrome.debugger.sendCommand({'tabId': wpt.tabid}, 'Console.enable');
    chrome.debugger.sendCommand({'tabId': wpt.tabid}, 'Page.enable');
    chrome.debugger.sendCommand({'tabId': wpt.tabid}, 'Timeline.start');
  });
};

/*********************************************************************************
**********************************************************************************/
devtools.Detach = function() {
  chrome.debugger.detach({'tabId': wpt.tabid});
};

/*********************************************************************************
**********************************************************************************/
devtools.Start = function() {
  devtools.active = true;
};

/*********************************************************************************
**********************************************************************************/
devtools.Stop = function() {
  devtools.active = false;
};
