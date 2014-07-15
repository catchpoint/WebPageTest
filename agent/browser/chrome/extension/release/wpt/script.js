/******************************************************************************
 Copyright (c) 2012, Google Inc.
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors
    may be used to endorse or promote products derived from this software
    without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 ******************************************************************************/

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

// override alert boxes
var injected = document.createElement("script");
injected.type = "text/javascript";
injected.innerHTML =
  "window.alert = function(msg){console.log('Blocked alert: ' + msg);};\n" +
  "window.confirm = function(msg){console.log('Blocked confirm: ' + msg); return false;};\n" + 
  "window.prompt = function(msg,def){console.log('Blocked prompt: ' + msg); return null;};\n";
document.documentElement.appendChild(injected);

// If the namespace is not set up by goog.provide, define the objects
// it would set up.  We could avoid this sort of hackery by injecting
// base.js before injecting this script, but the script injection
// this would do has the potential to be slow enough to change the
// measured load time.
// TODO(skerner): Measure the timing difference.
window['wpt'] = window['wpt'] || {};
window.wpt['contentScript'] = window.wpt['contentScript'] || {};

window['goog'] = window['goog'] || {};
window.goog['isNull'] = window.goog['isNull'] || function(val) {
  return (val === null);
};

/**
 * @private
 */
wpt.contentScript.collectStats_ = function(customMetrics) {
  // look for any user timing data
  try {
    if (window['performance'] != undefined &&
        (window.performance.getEntriesByType ||
         window.performance.webkitGetEntriesByType)) {
      if (window.performance.getEntriesByType)
        var marks = window.performance.getEntriesByType("mark");
      else
        var marks = window.performance.webkitGetEntriesByType("mark");
      if (marks.length)
        chrome.extension.sendRequest({'message': 'wptMarks', 
                                      'marks': marks },
                                     function(response) {});
    }
    if (customMetrics.length) {
      var lines = customMetrics.split("\n");
      var lineCount = lines.length;
      var out = {};
      for (var i = 0; i < lineCount; i++) {
        try {
          var parts = lines[i].split(":");
          if (parts.length == 2) {
            var name = parts[0];
            var code = window.atob(parts[1]);
            if (code.length) {
              var fn = new Function("return function wptCustomMetric" + i + "(){" + code + "};")();
              var result = fn();
              if (typeof result == 'undefined')
                result = '';
              out[name] = result;
            }
          }
        } catch(e){
        }
      }
      chrome.extension.sendRequest({'message': 'wptCustomMetrics', 
                                    'data': out },
                                    function(response) {});
    }
  } catch(e){
  }

  var domCount = document.documentElement.getElementsByTagName("*").length;
  if (domCount === undefined)
    domCount = 0;
  chrome.extension.sendRequest({'message': 'wptStats',
                                'domCount': domCount}, function(response) {});
  
  var timingRequest = { 'message': 'wptWindowTiming' };
  function addTime(name) {
    if (window.performance.timing[name] > 0) {
      timingRequest[name] = Math.max(0, (
        window.performance.timing[name] -
        window.performance.timing['navigationStart']));
    }
  };
  addTime('domContentLoadedEventStart');
  addTime('domContentLoadedEventEnd');
  addTime('loadEventStart');
  addTime('loadEventEnd');
  timingRequest['msFirstPaint'] = 0;
  if (window['chrome'] !== undefined &&
      window.chrome['loadTimes'] !== undefined) {
    var chromeTimes = window.chrome.loadTimes();
    if (chromeTimes['firstPaintTime'] !== undefined &&
        chromeTimes['firstPaintTime'] > 0) {
      var startTime = chromeTimes['requestTime'] ? chromeTimes['requestTime'] : chromeTimes['startLoadTime'];
      if (chromeTimes['firstPaintTime'] >= startTime)
        timingRequest['msFirstPaint'] = (chromeTimes['firstPaintTime'] - startTime) * 1000.0;
    }
  }

  // Send the times back to the extension.
  chrome.extension.sendRequest(timingRequest, function(response) {});
};

wpt.contentScript.checkResponsive_ = function() {
  var response = { 'message': 'wptResponsive' };
  
  // check to see if any form of the inner width is bigger than the window size (scroll bars)
  // default to assuming that the site is responsive and only trigger if we see a case where
  // we likely have scroll bars
  var isResponsive = 1;
  var bsw = document.body.scrollWidth;
  var desw = document.documentElement.scrollWidth;
  var wiw = window.innerWidth;
  if (bsw > wiw)
    isResponsive = 0;
  var nodes = document.body.childNodes;
  for (i in nodes) { 
    if (nodes[i].scrollWidth > wiw)
      isResponsive = 0;
  }
  response['isResponsive'] = isResponsive;
  
  chrome.extension.sendRequest(response, function() {});
}

// This script is automatically injected into every page before it loads.
// We need to use it to register for the earliest onLoad callback
// since the navigation timing times are sometimes questionable.
window.addEventListener('load', function() {
  var timestamp = 0;
  if (window['performance'] != undefined)
    timestamp = window.performance.now();
  var fixedViewport = 0;
  if (document.querySelector("meta[name=viewport]"))
    fixedViewport = 1;
  chrome.extension.sendRequest({'message': 'wptLoad',
                                'fixedViewport': fixedViewport,
                                'timestamp': timestamp}, function(response) {});
}, false);



/**
 * WebPageTest's scripting language has several commands that act on
 * DOM nodes.  These commands specify the DOM nodes using an attribute
 * and a value, separated by a single quote or equals sign.  A matching
 * DOM node has an attribute with the corresponding value.
 *
 * If there is more than one match, all matches will be returned,
 * in DOM order.  Commands that use this function should use the
 * first element.
 *
 * @param {!HTMLElement|Document} root The document to search under.
 *     Usually window.document, except in unit tests.
 * @param {!string} target The pattern to match.
 * @return {Array.<HTMLElement>} The HTML elements that match |target|.
 * @private
 */
wpt.contentScript.findDomElements_ = function(root, target) {
  var DELIMITERS = "='";

  var delimiterFound = '';
  for (var i = 0, ie = DELIMITERS.length; i < ie && !delimiterFound; ++i) {
    var delimiterIndex = target.indexOf(DELIMITERS[i]);
    if (delimiterIndex == -1)
      continue;

    delimiterFound = DELIMITERS[i];
  }

  if (!delimiterFound)
    throw ('Invalid target \"' + target + '\": no delimiter found.');

  var attribute = target.substring(0, delimiterIndex);
  var value = target.substring(delimiterIndex + 1);

  if (!attribute)
    throw ('Invalid target \"' + target +
           '\": The attribute to search for can not be empty.');

  var matchingNodeList = [];
  switch (attribute) {
    case 'id': {
      var element = document.getElementById(value);
      if (element)
        matchingNodeList.push(element);
      break;
    }
    case 'name': {
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
    if (request.message == 'setDOMElements') {
      g_domNameValues = request.name_values;
      g_intervalId = window.setInterval(
          function() { pollDOMElement(); },
          DOM_ELEMENT_POLL_INTERVAL);
    } else if (request.message == 'collectStats') {
      var customMetrics = request['customMetrics'] || '';
      wpt.contentScript.collectStats_(customMetrics);
    } else if (request.message == 'checkResponsive') {
      wpt.contentScript.checkResponsive_();
    }
    sendResponse({});
});

// Poll for a DOM element periodically.
function pollDOMElement() {
  var loaded_dom_element_indices = [];
  // Check for presence of each dom-element and prepare the indices of the
  // elements present.
  // TODO: Make findDomElements_() take a set of targets.  This will allow a
  // single DOM traversal to find all targets.
  for (var i = 0, ie = g_domNameValues.length; i < ie; ++i) {
    // TODO: findDomElements_ will throw an exception on a malformed target.
    if (wpt.contentScript.findDomElements_(window.document,
                                           g_domNameValues[i]).length > 0) {
      postDOMElementLoaded(g_domNameValues[i]);
      loaded_dom_element_indices.push(i);
    }
  }
  // Remove the loaded elements from backwards using splice method.
  for (var i = loaded_dom_element_indices.length - 1; i >= 0; i--) {
    g_domNameValues.splice(loaded_dom_element_indices[i], 1);
  }

  if (g_domNameValues.length <= 0) {
    window.clearInterval(g_intervalId);
    postAllDOMElementsLoaded();
  }
}

// Post the DOM element loaded event to the extension.
function postDOMElementLoaded(name_value) {
  chrome.extension.sendRequest({
      'message': 'DOMElementLoaded',
      'name_value': name_value
  }, function(response) {});
}

// Post all DOM elements loaded event to the extension.
function postAllDOMElementsLoaded() {
  chrome.extension.sendRequest({message: 'AllDOMElementsLoaded'},
                               function(response) {});
}

/**
 * Class InPageCommandRunner works on behalf of wpt.commands.CommandRunner
 * to execute script commands.  Because it runs as a content script, it
 * can access the DOM of the page.
 *
 * @constructor
 * @param {HTMLElement|Document|Null} doc Many commands search for a DOM node.
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

  /**
   * Map command names to the function that implements them.
   * @const
   * @type {Object.<string, Function.<Object>>}
   * @private
   */
  this.commandMap_ = {
    'click': this.doClick_,
    'setInnerHTML': this.doSetInnerHTML_,
    'setInnerText': this.doSetInnerText_,
    'setValue': this.doSetValue_,
    'submitForm': this.doSubmitForm_
  };
};

/**
 * Signal that the command completed without error.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.Success_ = function() {
  if (this.resultCallbacks_.success)
    this.resultCallbacks_.success();
};

/**
 * Send a warning to the creator of the in-page command runner.
 * @param {string} warning Warning message.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.Warn_ = function(warning) {
  if (this.resultCallbacks_.warn)
    this.resultCallbacks_.warn(warning);
};

/**
 * Signal that the command failed because of an error.
 * @param {string} error Error message.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.FatalError_ = function(error) {
  if (this.resultCallbacks_.error)
    this.resultCallbacks_.error(error);
};

/**
 * Several commands act on a DOM node, specified as a target pattern.
 * Given a target, return the first DOM node that matches, in DOM-tree order.
 * Log a fatal error if the target is malformed, or there is no matching DOM
 * node.  Log a warning if there is more than one matching node.  Return null
 * if there is no matching node.
 *
 * @param {string} command The command to be done on |target|.  Used for
 *     error messages.
 * @param {string} target The target DOM node, in attribute=value form.
 * @return {?Element} The matching DOM node.  null if there is no match.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.findTarget_ = function(
    command, target) {
  var domElements;
  try {
    domElements = wpt.contentScript.findDomElements_(this.doc_, target);
  } catch (err) {
    this.FatalError_('Command ' + command + ' failed: ' + err);
    return null;
  }

  if (!domElements || domElements.length == 0) {
    this.FatalError_('Command ' + command + ' failed: Could not find DOM ' +
                     'element matching target ' + target);
    return null;
  }

  if (domElements.length > 1) {
    this.Warn_('Command ' + command + ': ' + domElements.length +
               ' matches for target \"' + target + '\".  Using first match.');
  }

  return domElements[0];
};

/**
 * Click on a page element.
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to click, in attribute'value form.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.doClick_ = function(
    commandObject) {

  var domElement = this.findTarget_(commandObject['command'],
                                    commandObject['target']);
  if (goog.isNull(domElement))
    return;  // Error already flagged by findTarget_().

  domElement.click();
  this.Success_();
};

/**
 * Set the innerText of a DOM node.
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to click, in attribute'value form.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.doSetInnerText_ = function(
    commandObject) {

  var domElement = this.findTarget_(commandObject['command'],
                                    commandObject['target']);
  if (goog.isNull(domElement))
    return;  // Error already flagged by findTarget_().

  domElement.innerText = commandObject['value'];
  this.Success_();
};

/**
 * Set the innerHtml of a DOM node.
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to click, in attribute'value form.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.doSetInnerHTML_ = function(
    commandObject) {

  var domElement = this.findTarget_(commandObject['command'],
                                    commandObject['target']);
  if (goog.isNull(domElement))
    return;  // Error already flagged by findTarget_().

  domElement.innerHTML = commandObject['value'];
  this.Success_();
};

/**
 * Test if an HTML tag type string is in a set of HTML tag type strings.  The
 * test is case-insensitive.
 *
 * @param {string} tagType The type of an HTML tag.  Typically the nodeName
 *     property of a DOM element.
 * @param {Array.<string>} tagSet The set of tag types to look for.
 * @return {boolean} Is |tagType| in |tagSet|?
 * @private
 */
wpt.contentScript.isTagNameInSet_ = function(tagType, tagSet) {
  var normalizedTagType = tagType.toUpperCase();
  for (var i = 0, ie = tagSet.length; i < ie; ++i) {
    if (tagSet[i].toUpperCase() == normalizedTagType)
      return true;
  }
  return false;
};

/**
 * Set the value of an attribute of a DOM node.
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to click, in attribute'value form.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.doSetValue_ = function(
    commandObject) {

  var domElement = this.findTarget_(commandObject['command'],
                                    commandObject['target']);
  if (goog.isNull(domElement))
    return;  // Error already flagged by findTarget_().

  // Currently, only "input" and "textArea" element types are supported.
  if (!wpt.contentScript.isTagNameInSet_(domElement.nodeName,
                                        ['INPUT', 'TEXTAREA'])) {
    this.FatalError_('Target to ' + commandObject['command'] + ' must match ' +
                     'an INPUT or TEXTAREA tag.  Matched tag is of type ' +
                     domElement.nodeName);
    return;
  }

  domElement.setAttribute('value', commandObject['value']);

  this.Success_();
};

/**
 * Submit a form.
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to submit, in attribute'value form.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.doSubmitForm_ = function(
    commandObject) {

  var domElement = this.findTarget_(commandObject['command'],
                                    commandObject['target']);
  if (goog.isNull(domElement))
    return;  // Error already flagged by findTarget_().

  if (!wpt.contentScript.isTagNameInSet_(domElement.nodeName, ['FORM'])) {
    this.FatalError_('Target to ' + commandObject['command'] + ' must match ' +
                     'a FORM tag.  Matched tag is of type ' +
                     domElement.nodeName);
    return;
  }

  domElement.submit();

  this.Success_();
};

/**
 * Run a command.  The backgrond page delegates commands to the content script
 * by calling this method on an instance of InPageCommandRunner.
 * @param {Object} commandObj The command to run: See inPageCommendRunner for
 *     details.
 */
wpt.contentScript.InPageCommandRunner.prototype.RunCommand = function(
    commandObj) {
  console.info('InPageCommandRunner got a command: ', commandObj);

  var commandFun = this.commandMap_[commandObj['command']];
  if (!commandFun) {
    this.FatalError_('Unknown command ' + commandObj['command']);
    return;
  }

  try {
    commandFun.call(this, commandObj);
  } catch (ex) {
    this.FatalError_('Exception running command: ' + ex);
    return;
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
