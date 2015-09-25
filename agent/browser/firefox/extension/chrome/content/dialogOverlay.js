/*
 * Copyright (c) AppDynamics, Inc., and its affiliates
 * 2015
 * All Rights Reserved
 */

// Namespace wpt.moz.main:
window['wpt'] = window['wpt'] || {};
window.wpt['moz'] = window.wpt['moz'] || {};

window.addEventListener("load", function() {
  var chromewindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIDOMWindow);
  // chromewindow.args contains the arguments passed to the dialog
  if (chromewindow.args.promptType === 'promptUserAndPass') {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
      getService(Components.interfaces.nsIObserverService);
    observerService.notifyObservers(null, "wpt-unauthorised-errors", "");
    window.close();
  }
}, false);
