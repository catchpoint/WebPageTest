var wptMessage = {};
wptMessage.RUN_TEST = "RUN_TEST";
wptMessage.TEST_COMPLETE = "TEST_COMPLETE";

/*********************************************************************************
  Handle bringing up the UI when they click on the extension button
**********************************************************************************/
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({'url':'/local.html'}, function(tab){});
});

/*********************************************************************************
  Check local storage to see if we are configured to automatically
  start testing
**********************************************************************************/
chrome.runtime.onStartup.addListener(function() {
});

/*********************************************************************************
  Process messages from the UI or content scripts
**********************************************************************************/
chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
  if (request.msg == wptMessage.RUN_TEST) {
    wpt.RunTest(request['test'], function(result){
      chrome.extension.sendRequest({'msg': wptMessage.TEST_COMPLETE,
                                    'result': result});
    });
  }
});
