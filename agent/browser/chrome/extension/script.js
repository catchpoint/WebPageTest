// The script which is injected by the extension into the actual page that is
// loaded.

// The port for communicating back to the extension.
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
WPTExtensionConnection.postMessage({message: 'load',
								load_time: WPT_load_time});
