
// Closure compiler needs to see a goog.provide, but we don't load
// closure library outside tests.  Without closure, |goog| does not exist.
// The goog.provide call is not indented, because the closure library
// dependency generation scrips use a regexp to find calls to goog.provide,
// and it will not be matched if there is whitespace on the line.
// TODO(skerner): Make the non-test content script flow have base.js,
// so that goog.provide exists.
if (window['goog'])
goog.provide('wpt.contentScript');

// If the namespace is not set up by goog.provide, define the objects
// it would set up.  We could avoid this sort of hackery by injecting
// base.js before injecting this script, but the script injection
// this would do has the potential to be slow enough to change the
// measured load time.
// TODO(skerner): Measure the timing difference.
window['wpt'] = window['wpt'] || {};
window.wpt['contentScript'] = window.wpt['contentScript'] || {};

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


/**
 * WebPageTest's scripting language has several commands that act on
 * DOM nodes.  These commands specify the DOM nodes using an attribute
 * and a value, separated by a single quote.  A matching DOM node has
 * an attribute with the corresponding value.
 *
 * If there is more than one match, all matches will be returned,
 * in DOM order.  Commands that use this function should use the
 * first element.
 *
 * @param {DOMElement} root The Element to search under. Usualy window.document.
 * @param {string} target The pattern to match.
 */
wpt.contentScript.findDomElements_ = function(root, target) {
  var delimiterIndex = target.indexOf("'");
  if (delimiterIndex == -1)
    throw ("Invalid target \"" + target + "\": delimter \' is missing.");

  var attribute = target.substring(0, delimiterIndex);
  var value = target.substring(delimiterIndex + 1);

  if (!attribute)
    throw ("Invalid target \"" + target +
           "\": The attribute to search for can not be empty.");

  var matchingNodeList = [];
  switch (attribute) {
    case "id": {
      var element = document.getElementById(value);
      if (element)
        matchingNodeList.push(element);
      break;
    }
    case "name": {
      // |elements| is a DOM NodeList, not a Javascript array, so we must
      // move the elements into an array.
      var elements = document.getElementsByName(value);
      for (var i = 0, ie = elements.length; i < ie; ++i) {
        matchingNodeList.push(elements[i]);
      }
      break;
    }
    default: {
      var fullNodeList = root.getElementsByTagName('*');
      for (var i = 0, ie = fullNodeList.length; i < ie; ++i) {
        if (fullNodeList[i].getAttribute(attribute) !== value)
          continue;

        matchingNodeList.push(fullNodeList[i]);
      }
    }
  }

  return matchingNodeList;
};
