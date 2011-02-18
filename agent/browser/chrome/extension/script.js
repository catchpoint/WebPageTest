// The script which is injected by the extension into the actual page that is
// loaded.

// The port for communicating back to the extension.
var WPTExtensionConnection = chrome.extension.connect();

// The url of the page load.
var WPTExtensionPageUrl = window.location.toString();

function sendTimesToExtension() {
  if (window.parent != window) {
    return;
  }
  var load_times = window.chrome.loadTimes();
  // For now, wait for finishedLoadTime by deferring this message-post with a
  // timer.
  if (load_times.finishLoadTime != 0) {
    WPTExtensionConnection.postMessage({message: 'load',
                                        url: WPTExtensionPageUrl,
                                        values: load_times});
  } else {
    window.setTimeout(sendTimesToExtension, 100);
  }
}

// Currently this script runs at document-idle, but need to make sure it is run
// after all activity in the page is done.
sendTimesToExtension();
