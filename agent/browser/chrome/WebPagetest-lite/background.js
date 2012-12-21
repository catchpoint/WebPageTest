/*-----------------------------------------------------------------------------
  Handle bringing up the UI when they click on the extension button
-----------------------------------------------------------------------------*/
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({'url':'/local.html'}, function(tab){});
});

/*-----------------------------------------------------------------------------
  Check local storage to see if we are configured to automatically
  start testing
-----------------------------------------------------------------------------*/
chrome.runtime.onStartup.addListener(function() {
});
