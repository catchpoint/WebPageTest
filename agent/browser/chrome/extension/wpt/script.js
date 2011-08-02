
// Closure compiler needs to see a goog.provide, but we don't load
// closure library outside tests.  Without closure, |goog| does not exist.
// The goog.provide call is not indented, because the closure library
// dependency generation scrips use a regexp to find calls to goog.provide,
// and it will not be matched if there is whitespace on the line.
// TODO(skerner): Make the non-test content script flow have base.js,
// so that goog.provide exists.
if (window['goog'])
goog.provide('wpt.contentScript');

var DOM_ELEMENT_POLL_INTERVAL = 100;

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
  chrome.extension.sendRequest({message: "wptLoad", load_time: WPT_load_time}, function(response) {});
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
 * @param {HTMLElement|Document} root The document to search under.
 *     Usually window.document, except in unit tests.
 * @param {string} target The pattern to match.
 */
wpt.contentScript.findDomElements_ = function(root, target) {
  // TODO(skerner): Support '=' as a delimiter.
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

var g_intervalId = 0;
var g_domNameValues = [];

// Add a listener for messages from background.
chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    if (request.message == "setDOMElements") {
      g_domNameValues = request.name_values;
      g_intervalId = window.setInterval(function() { pollDOMElement(); },
	      DOM_ELEMENT_POLL_INTERVAL);
    }
    sendResponse({});
});

// Poll for a DOM element periodically.
function pollDOMElement() {
  var loaded_dom_element_indices = [];
  // Check for presence of each dom-element and prepare the indices of the
  // elements present.
  // TODO: Optimize this polling cost.
  for (var i = 0, ie = g_domNameValues.length; i < ie; ++i) {
    if (wpt.contentScript.findDomElements_(window.document, g_domNameValues[i]).length > 0) {
      postDOMElementLoaded(g_domNameValues[i]);
      loaded_dom_element_indices.push(i);
      // window.clearInterval(g_intervalId);
    }
  }
  // Remove the loaded elements from backwards using splice method.
  for (var i = loaded_dom_element_indices.length-1; i >= 0; i--) {
    g_domNameValues.splice(loaded_dom_element_indices[i], 1);
  }

  if (g_domNameValues.length <= 0) {
    window.clearInterval(g_intervalId);
    postAllDOMElementsLoaded();
  }
};

// Post the DOM element loaded event to the extension.
function postDOMElementLoaded(name_value) {
  chrome.extension.sendRequest({message: "DOMElementLoaded", name_value: name_value}, function(response) {});
}

// Post all DOM elements loaded event to the extension.
function postAllDOMElementsLoaded() {
  chrome.extension.sendRequest({message: "AllDOMElementsLoaded"}, function(response) {});
}

/**
 * Class InPageCommandRunner works on behalf of wpt.commands.CommandRunner
 * to execute script commands.  Because it runs as a content script, it
 * can access the DOM of the page.
 *
 * @constructor
 * @param {?HTMLElement|Document} doc Many commands search for a DOM node.
 *     This element is the root of the DOM tree on which commands operate.
 *     Outside of unit tests, usually window.document.
 * @param {Object} chromeApi The base object of the chrome extension API.
 *                           Outside unit tests, usually window.chrome.
 * @param {Object} resultCallbacks Callbacks to run on success, failure, etc.
 *                                 These calls are used by unit tests to check
 *                                 results.  They are not used in production,
 *                                 except to log to the console in the content
 *                                 script.
 */
wpt.contentScript.InPageCommandRunner = function(doc,
                                                 chromeApi,
                                                 resultCallbacks) {
  this.doc_ = doc;
  this.chromeApi_ = chromeApi;
  this.resultCallbacks_ = resultCallbacks;
};

/**
 * Signal that the command completed without error.
 */
wpt.contentScript.InPageCommandRunner.prototype.Success_ = function() {
  console.log("Command successful.");
  if (this.resultCallbacks_.success)
    this.resultCallbacks_.success();
};

/**
 * Send a warning to the creator of the in-page command runner.
 * @param {string} warning
 */
wpt.contentScript.InPageCommandRunner.prototype.Warn_ = function(warning) {
  console.log("Command generated warning: " + warning);
  if (this.resultCallbacks_.warn)
    this.resultCallbacks_.warn(warning);
};

/**
 * Signal that the command failed because of an error.
 * @param {string} error
 */
wpt.contentScript.InPageCommandRunner.prototype.FatalError_ = function(error) {
  console.log("Command generated error: " + error);
  if (this.resultCallbacks_.error)
    this.resultCallbacks_.error(error);
};

/**
 * Click on a page element.
 * @param {string} target The DOM element to click, in attribute'value form.
 */
wpt.contentScript.InPageCommandRunner.prototype.doClick_ = function(target) {

  var domElements;
  try {
    domElements = wpt.contentScript.findDomElements_(this.doc_, target);
  } catch (err) {
    this.FatalError_("Click failed: "+ err);
    return;
  }

  if (!domElements || domElements.length == 0) {
    this.FatalError_("Click failed: Could not find DOM element matching target " + target);
    return;
  }

  if (domElements.length > 1) {
    this.Warn_(domElements.length + " matches for target \"" +
               target + "\".  Using first match.");
  }

  domElements[0].click();
  this.Success_();
};

/**
 * Run a command.  The backgrond page delegates commands to the content script
 * by calling this method on an instance of InPageCommandRunner.
 * @param {Object} commandObj
 */
wpt.contentScript.InPageCommandRunner.prototype.RunCommand = function(commandObj) {
  console.info("InPageCommandRunner got a command: ", commandObj);

  switch (commandObj['command']) {
    case "click": {
      this.doClick_(commandObj['target']);
      break;
    }

    default:
      this.FatalError_("Unknown command " + commandObj['command']);
  }
};


/**
 * An instance of InPageCommandRunner whose well-known name can be used
 * by the background page.
 */
wpt.contentScript.InPageCommandRunner.Instance =
    new wpt.contentScript.InPageCommandRunner(
        window.document,
        chrome,
        {});
