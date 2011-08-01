
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
 * @param {Document} doc The document on which commands are run.
 *                       Outside unit tests, usually window.document.
 * @param {Object} chromeApi The base object of the chrome extension API.
 *                           Outside unit tests, usually window.chrome.
 * @param {Port} commandPort A channel over which the background page
 *                           sends commands.
 */
wpt.contentScript.InPageCommandRunner = function(doc,
                                                 chromeApi,
                                                 commandPort,
                                                 resultCallbacks) {
  this.doc_ = doc;
  this.chromeApi_ = chromeApi;
  this.commandPort_ = commandPort;
  this.resultCallbacks_ = resultCallbacks;

  var self = this;
  if (this.commandPort_) {
    this.commandPort_.onMessage.addListener(function(msg) {
      self.onCommandRecieved(msg);
    });
  }
};

wpt.contentScript.InPageCommandRunner.prototype.onCommandRecieved = function(command) {
  console.info("InPageCommandRunner got a command: ", command);

  switch (command.command) {
    case "click": {
      this.doClick(command.target);
      break;
    }

    default:
      this.FatalError_("Unknown command " + command.command);
  }
};

/**
 * Signal that the command completed without error.
 */
wpt.contentScript.InPageCommandRunner.prototype.Success_ = function() {
  console.log("Success!");
  this.resultCallbacks_.success();
};

/**
 * Send a warning to the creator of the in-page command runner.
 * @param {string} warning
 */
wpt.contentScript.InPageCommandRunner.prototype.Warn_ = function(warning) {
  this.resultCallbacks_.warn(warning);
};

/**
 * Signal that the command failed because of an error.
 * @param {string} error
 */
wpt.contentScript.InPageCommandRunner.prototype.FatalError_ = function(error) {
  this.resultCallbacks_.error(error);
};

/**
 * Click on a page element.
 * @param {string} target The DOM element to click, in attribute'value form.
 */
wpt.contentScript.InPageCommandRunner.prototype.doClick = function(target) {

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

var g_inPageCommandRunner;

chrome.extension.onConnect.addListener(function(port) {
  if (g_inPageCommandRunner) {
    console.error("Trashing old command runner.");
  }

  console.log("Build InPageCommandRunner...");
  g_inPageCommandRunner = new wpt.contentScript.InPageCommandRunner(
      window.document,
      chrome,
      port,
      {
        success: function() {
          console.log("success cb");
          port.postMessage({'message': 'LogMessage', 'log': 'Success'});
        },
        warn: function(warning) {
          port.postMessage({'message': 'LogMessage', 'log': 'warning: ' + warning});
        },
        error: function(error) {
          port.postMessage({'message': 'LogMessage', 'log': 'error: ' + error});
        }
      });
});
