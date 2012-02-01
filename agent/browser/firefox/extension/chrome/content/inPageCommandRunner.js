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

 This file defines a namespace wpt.moz, which holds mozilla-specific
 menthods used by webpagetest.

 Code to find and run commands on DOM elements.  Users should
 run this code in a sandbox to avoid evil pages doing privileged things
 in event handlers called by this code.

 Author: Sam Kerner (skerner at google dot com)

 TODO(skerner): This code is a slightly altered version of the chrome
 extension content script.  Factor out common code.

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
 * WebPageTest's scripting language has several commands that act on
 * DOM nodes.  These commands specify the DOM nodes using an attribute
 * and a value, separated by a single quote.  A matching DOM node has
 * an attribute with the corresponding value.
 *
 * If there is more than one match, all matches will be returned,
 * in DOM order.  Commands that use this function should use the
 * first element.
 *
 * @private
 * @param {!HTMLElement|Document} root The document to search under.
 *     Usually window.document, except in unit tests.
 * @param {!string} target The pattern to match.
 * @return {Array.<HTMLElement>} The HTML elements that match |target|.
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
    throw ("Invalid target \"" + target + "\": no delimiter found.");

  var attribute = target.substring(0, delimiterIndex);
  var value = target.substring(delimiterIndex + 1);

  if (!attribute)
    throw ("Invalid target \"" + target +
           "\": The attribute to search for can not be empty.");

  var matchingNodeList = [];
  switch (attribute) {
    case "id": {
      var element = root.getElementById(value);
      if (element)
        matchingNodeList.push(element);
      break;
    }
    case "name": {
      // |elements| is a DOM NodeList, not a Javascript array, so we must
      // move the elements into an array.
      var elements = root.getElementsByName(value);
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
   * @private
   * @const
   * @type {Object.<string, Function.<Object>>}
   */
  this.commandMap_ = {
    'click': this.doClick_,
    'setInnerHTML': this.doSetInnerHTML_,
    'setInnerText': this.doSetInnerText_,
    'setValue': this.doSetValue_,
    'submitForm': this.doSubmitForm_,
    'isTargetInDom': this.doIsTargetInDom_
  };
};

/**
 * Signal that the command completed without error.
 * @private
 */
wpt.contentScript.InPageCommandRunner.prototype.Success_ = function() {
  console.log("Command successful.");
  if (this.resultCallbacks_.success)
    this.resultCallbacks_.success();
};

/**
 * Send a warning to the creator of the in-page command runner.
 * @private
 * @param {string} warning
 */
wpt.contentScript.InPageCommandRunner.prototype.Warn_ = function(warning) {
  console.log("Command generated warning: " + warning);
  if (this.resultCallbacks_.warn)
    this.resultCallbacks_.warn(warning);
};

/**
 * Signal that the command failed because of an error.
 * @private
 * @param {string} error
 */
wpt.contentScript.InPageCommandRunner.prototype.FatalError_ = function(error) {
  console.log("Command generated error: " + error);
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
 * @private
 * @param {string} command The command to be done on |target|.  Used for
 *     error messages.
 * @param {string} target The target DOM node, in attribute=value form.
 * @return {?Element} The matching DOM node.  null if there is no match.
 */
wpt.contentScript.InPageCommandRunner.prototype.findTarget_ = function(
    command, target) {
  var domElements;
  try {
    domElements = wpt.contentScript.findDomElements_(this.doc_, target);
  } catch (err) {
    this.FatalError_("Command " + command + " failed: " + err);
    return null;
  }

  if (!domElements || domElements.length == 0) {
    this.FatalError_("|| Command " + command + " failed: Could not find DOM " +
                     "element matching target " + target);
    return null;
  }

  if (domElements.length > 1) {
    this.Warn_("Command " + command + ": " + domElements.length +
               " matches for target \"" + target + "\".  Using first match.");
  }

  return domElements[0];
};

/**
 * Click on a page element.
 * @private
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to click, in attribute'value form.
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
 * @private
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to click, in attribute'value form.
 */
wpt.contentScript.InPageCommandRunner.prototype.doSetInnerText_ = function(
    commandObject) {

  var domElement = this.findTarget_(commandObject['command'],
                                    commandObject['target']);
  if (goog.isNull(domElement))
    return;  // Error already flagged by findTarget_().

  // No innertext in firefox.  See comments on goog.dom.setTextContent() in
  // closure lib for an explanation of the way different browsers handle this.
  if (domElement.innerText) {
    domElement.innerText = commandObject['value'];
  } else {
    domElement.textContent = commandObject['value'];
  }

  this.Success_();
};

/**
 * Set the innerHtml of a DOM node.
 * @private
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to click, in attribute'value form.
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
 * @private
 * @param {string} tagType The type of an HTML tag.  Typically the nodeName
 *     property of a DOM element.
 * @param {Array.<string>} tagSet The set of tag types to look for.
 * @return {boolean} Is |tagType| in |tagSet|?
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
 * @private
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to click, in attribute'value form.
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
 * @private
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to submit, in attribute'value form.
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
 * Test for the presence of a DOM element.
 * @private
 * @param {Object} commandObject Contains a 'target' param specifying the DOM
 *     element to find.
 * @return {Boolean} Is there a matching target in the currnet DOM?
 */
wpt.contentScript.InPageCommandRunner.prototype.doIsTargetInDom_ = function(
    commandObject) {
  var domElements;
  var command = commandObject['command'];
  var target = commandObject['target'];

  try {
    domElements = wpt.contentScript.findDomElements_(this.doc_, target);
  } catch (err) {
    this.FatalError_("Command " + command + " failed: " + err);
    return undefined;
  }

  return (domElements && domElements.length > 0);
};

/**
 * Run a command.  The backgrond page delegates commands to the content script
 * by calling this method on an instance of InPageCommandRunner.
 * @param {Object} commandObj
 * @return {*}
 */
wpt.contentScript.InPageCommandRunner.prototype.RunCommand = function(
    commandObj) {
  var commandFun = this.commandMap_[commandObj['command']];
  if (!commandFun) {
    this.FatalError_("Unknown command " + commandObj['command']);
    return undefined;
  }

  try {
    return commandFun.call(this, commandObj);
  } catch (ex) {
    this.FatalError_("Exception running command: " + ex);
    return undefined;
  }
};
