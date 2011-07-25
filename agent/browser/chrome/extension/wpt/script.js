
// Closure compiler needs to see a goog.provide, but we don't load
// closure library outside tests.
// TODO(skerner): Make the non-test content script flow have base.js,
// so that goog.provide exists.
if (goog)
  goog.provide('wpt.contentscript');

// This script is automatically injected into every page before it loads.
// We need to use it to register for the earliest onLoad callback
// since the navigation timing times are sometimes questionable.
window.addEventListener("load", function() {
  var WPT_load_time = 0;
  try {
    if (window.performance.timing['loadEventStart'] > 0)
      WPT_load_time = window.performance.timing['loadEventStart']
                    - window.performance.timing['navigationStart'];
    if (WPT_load_time < 0)
      WPT_load_time = 0;
  } catch(e) {}

  // send the navigation timings back to the extension
  var WPTExtensionConnection = chrome.extension.connect();
  WPTExtensionConnection.postMessage(
      {message: 'wptLoad', load_time: WPT_load_time});
}, false);
