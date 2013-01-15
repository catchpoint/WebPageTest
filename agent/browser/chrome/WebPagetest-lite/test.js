var wpt = {};

// constants
wpt.BLANK_PAGE = '/blank.html';
wpt.CONTENT_SCRIPT = '/content.js';
wpt.DEFAULT_TEST_TIMEOUT = 60;

/*********************************************************************************
  Run a test and provide the results in a callback when it is done
**********************************************************************************/
wpt.RunTest = function(test, callback) {
  wpt.callback = callback;
  wpt.Initialize(test);
  wpt.PrepareBrowser();
};

/*********************************************************************************
  Clear out the test state
**********************************************************************************/
wpt.Initialize = function(test) {
  var ret = false;
  wpt.complete = false;
  wpt.active = true;
  wpt.test = test;
  wpt.test.results = [];
  wpt.tabid = undefined;
  wpt.currentRun = 1;
  if (wpt['test'] != undefined && wpt.test['url'] != undefined) {
    ret = true;
    wpt.test.runs = Math.max(1, parseInt(wpt.test['runs']) || 1);
    wpt.test.timeout = wpt.test['timeout'] || wpt.DEFAULT_TEST_TIMEOUT;
  }
  return ret;
};

/*********************************************************************************
  Close the tab and re-open it to a blank page.
  We will get notified when the blank page has loaded to continue testing.
**********************************************************************************/
wpt.PrepareBrowser = function() {
  wpt.navigating = false;
  if (wpt.timeoutEvent != undefined) {
    clearTimeout(wpt.timeoutEvent);
    wpt.timeoutEvent = undefined;
  }
  if (wpt['tabid'] == undefined) {
    chrome.tabs.create({'url':wpt.BLANK_PAGE}, function(tab){
      wpt.tabid= tab.id;
    });
  } else {
    chrome.tabs.remove(wpt.tabid, function(){
      chrome.tabs.create({'url':wpt.BLANK_PAGE}, function(tab){
        wpt.tabid= tab.id;
      });
    });
  }
};

/*********************************************************************************
  Run the next test
**********************************************************************************/
wpt.NextTest = function() {
  if (wpt.active) {
    wpt.navigating = true;
    wpt.ClearCache(function(){
      devtools.Attach();
      setTimeout(wpt.Navigate, 1);
    });
  }
};

wpt.Navigate = function() {
  devtools.Start();
  wpt.timeoutEvent = setTimeout(wpt.TestTimeout, wpt.test.timeout * 1000);
  var url = wpt.test.url;
  if (url.substring(0,4) != 'http')
    url = 'http://' + url;
  chrome.tabs.update(wpt.tabid, {'active':true, 'url':url}, function(tab){});
};

/*********************************************************************************
**********************************************************************************/
wpt.TestDone = function() {
  devtools.Stop();
  devtools.Detach();
  chrome.tabs.remove(wpt.tabid);
  wpt.active = false;
  wpt.complete = true;
  if (wpt['callback'] != undefined) {
    wpt.callback(wpt.test);
  }
};

/*********************************************************************************
**********************************************************************************/
wpt.TestTimeout = function() {
  wpt.TestError('Timeout');
};

/*********************************************************************************
**********************************************************************************/
wpt.TestError = function(msg) {
  var result = {'success':false,'error':msg};
  wpt.test.results.push(result);
  wpt.PageComplete();
};

/*********************************************************************************
  Inject our content script into the page so we can extract the timing
  information as well as know when the page is done
**********************************************************************************/
wpt.PageComplete = function(time, error) {
  if (wpt.currentRun < wpt.test.runs) {
    wpt.currentRun++;
    wpt.PrepareBrowser();
  } else {
    wpt.TestDone();
  }
};

/*********************************************************************************
  Clear out the browser caches
**********************************************************************************/
wpt.ClearCache = function(callback) {
  try {
    chrome.benchmarking.clearCache();
    chrome.benchmarking.closeConnections();
    chrome.benchmarking.clearHostResolverCache();
    chrome.benchmarking.clearPredictorCache();
  } catch(e) {};
  chrome.browsingData.remove({}, {
    "appcache": true,
    "cache": true,
    "cookies": true,
    "downloads": true,
    "fileSystems": true,
    "formData": true,
    "history": true,
    "indexedDB": true,
    "localStorage": true,
    "serverBoundCertificates": true,
    "pluginData": true,
    "passwords": true,
    "webSQL": true
  }, callback);
};

/*********************************************************************************
  Dev Tools state callbacks
**********************************************************************************/
wpt.DevToolsPageLoaded = function() {
  if (wpt.navigating) {
    // inject the content script that will call us when the page is done
    chrome.tabs.executeScript(wpt.tabid, {'file':wpt.CONTENT_SCRIPT});
  };
};

/*********************************************************************************
  Messages from the content script with the timing data
**********************************************************************************/
chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
  if (request.msg == 'timing') {
    var result = {'success':true,'loadTime':request.time};
    wpt.test.results.push(result);
    wpt.PageComplete();
  }
});

/*********************************************************************************
  Handle the navigation events for the test tab
**********************************************************************************/
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tabId == wpt.tabid && 
      changeInfo['status'] == 'complete' && 
      !wpt.navigating) {
      wpt.NextTest();
  }
});

/*********************************************************************************
  Request tracking (for frame errors)
**********************************************************************************/
chrome.webRequest.onErrorOccurred.addListener(function(details) {
  if (wpt.navigating && details.tabId == wpt.tabid)
    wpt.TestError(details.error);
}, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame']});

chrome.webRequest.onCompleted.addListener(function(details) {
  if (wpt.navigating && details.tabId == wpt.tabid && details.statusCode >= 400)
    wpt.TestError(details.statusLine);
}, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame']});
