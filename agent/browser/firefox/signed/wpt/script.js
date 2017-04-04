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

const DOM_ELEMENT_POLL_INTERVAL = 100;

// override alert boxes
const injected = document.createElement("script");
injected.type = "text/javascript";
injected.innerHTML = `
  window.alert = msg => console.log('Blocked alert: ' + msg);
  window.confirm = msg => console.log('Blocked confirm: ' + msg) || false;
  window.prompt = (msg,def) => console.log('Blocked prompt: ' + msg) || null;

  window.addEventListener("message", function(event) {
    if (event.source != window) {
      return;
    }

    if (event.data.type == "RUN_SCRIPT") {
      console.log(event.data.text);
      try {
        const fn = eval(event.data.text);
        const result = fn(event.data.payload && JSON.parse(event.data.payload));
        console.log(result);
        window.postMessage({
          type: 'SCRIPT_RESULT',
          id: event.data.id,
          result: JSON.stringify(result)
        }, "*");
      } catch (err) {
        console.error(err.toString());
        window.postMessage({
          type: 'SCRIPT_RESULT',
          id: event.data.id,
          err: err.toString()
        }, "*");
      }
    }
  });`;
document.documentElement.appendChild(injected);

function wptSendEvent(eventName, optParams, data) {
  console.log("sending data: " + data);
  let url = 'http://127.0.0.1:8888/event/' + eventName ;
  if (optParams) {
      url += '?' + Object.entries(optParams)
        .map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&');
  }
  fetch(url, {method: 'POST', body: data});
}

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

let g_scriptPromiseId = 0;
const g_scriptPromises = new Map();

window.addEventListener("message", function(event) {
  if (event.source != window) {
    return;
  }

  if (event.data.type == "SCRIPT_RESULT") {
    const { resolve, reject } = g_scriptPromises.get(event.data.id);
    g_scriptPromises.delete(event.data.id);
    if (event.data.err) {
      reject(err);
    } else {
      resolve(JSON.parse(event.data.result));
    }
  }
});

wpt.contentScript.evalInPage_ = async function(scriptText, data) {
  const id = ++g_scriptPromiseId;

  const deferred = {};
  deferred.promise = new Promise((resolve, reject) =>
    Object.assign(deferred, {resolve, reject}));

  g_scriptPromises.set(id, deferred);

  window.postMessage({
    type: 'RUN_SCRIPT',
    text: scriptText,
    payload: JSON.stringify(data),
    id
  }, "*");

  return await deferred.promise;
}

wpt.contentScript.checkResponsive_ = function() {
  // check to see if any form of the inner width is bigger than the window size (scroll bars)
  // default to assuming that the site is responsive and only trigger if we see a case where
  // we likely have scroll bars
  let isResponsive = 1;
  const bsw = document.body.scrollWidth;
  const desw = document.documentElement.scrollWidth;
  const wiw = window.innerWidth;
  if (bsw > wiw) {
    isResponsive = 0;
  }
  const nodes = document.body.childNodes;
  if (nodes.some(n => n.scrollWidth > wiw)) {
    isResponsive = 0;
  }

  browser.runtime.sendMessage({
    message: 'wptResponsive',
    isResponsive
  });
}

// This script is automatically injected into every page before it loads.
// We need to use it to register for the earliest onLoad callback
// since the navigation timing times are sometimes questionable.
window.addEventListener('load', function() {
  let timestamp = 0;
  if (window['performance'] != undefined) {
    timestamp = window.performance.now();
  }
  let fixedViewport = 0;
  if (document.querySelector("meta[name=viewport]")) {
    fixedViewport = 1;
  }
  browser.runtime.sendMessage({
    message: 'wptLoad',
    fixedViewport: fixedViewport,
    timestamp: timestamp
  });
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
  const DELIMITERS = "='";

  let delimiterFound = '';
  let delimiterIndex;
  for (let i = 0, ie = DELIMITERS.length; i < ie && !delimiterFound; ++i) {
    delimiterIndex = target.indexOf(DELIMITERS[i]);
    if (delimiterIndex == -1)
      continue;

    delimiterFound = DELIMITERS[i];
  }

  if (!delimiterFound)
    throw ('Invalid target \"' + target + '\": no delimiter found.');

  const attribute = target.substring(0, delimiterIndex);
  const value = target.substring(delimiterIndex + 1);

  if (!attribute)
    throw ('Invalid target \"' + target +
           '\": The attribute to search for can not be empty.');

  const matchingNodeList = [];
  switch (attribute) {
    case 'id': {
      const element = document.getElementById(value);
      if (element)
        matchingNodeList.push(element);
      break;
    }
    case 'name': {
      // |elements| is a DOM NodeList, not a Javascript array, so we must
      // move the elements into an array.
      matchingNodeList.push(...document.getElementsByName(value));
      break;
    }
    default: {
      matchingNodeList.push(...root.querySelectorAll(`[${attribute}="${value}"]`));
    }
  }

  return matchingNodeList;
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
  const normalizedTagType = tagType.toUpperCase();
  for (let i = 0, ie = tagSet.length; i < ie; ++i) {
    if (tagSet[i].toUpperCase() == normalizedTagType)
      return true;
  }
  return false;
}

let g_intervalId = 0;
let g_domNameValues = [];

// Add a listener for messages from background.
browser.runtime.onMessage.addListener((req, sender, respond) => {
    if (req.message == 'setDOMElements') {
      g_domNameValues = req.name_values;
      g_intervalId = window.setInterval(
          function() { pollDOMElement(); },
          DOM_ELEMENT_POLL_INTERVAL);
    } else if (req.message == 'checkResponsive') {
      wpt.contentScript.checkResponsive_();
    }
    respond({});
});

// Poll for a DOM element periodically.
function pollDOMElement() {
  const loaded_dom_element_indices = [];
  // Check for presence of each dom-element and prepare the indices of the
  // elements present.
  // TODO: Make findDomElements_() take a set of targets.  This will allow a
  // single DOM traversal to find all targets.
  g_domNameValues.forEach((val, i) => {
    if (wpt.contentScript.findDomElements_(window.document,val).length > 0) {
      postDOMElementLoaded(val);
      loaded_dom_element_indices.push(i);
    }
  });
  // Remove the loaded elements from backwards using splice method.
  for (let i = loaded_dom_element_indices.length - 1; i >= 0; i--) {
    g_domNameValues.splice(loaded_dom_element_indices[i], 1);
  }

  if (g_domNameValues.length <= 0) {
    window.clearInterval(g_intervalId);
    postAllDOMElementsLoaded();
  }
}

// Post the DOM element loaded event to the extension.
function postDOMElementLoaded(name_value) {
  browser.runtime.sendMessage({
      'message': 'DOMElementLoaded',
      'name_value': name_value
  });
}

// Post all DOM elements loaded event to the extension.
function postAllDOMElementsLoaded() {
  browser.runtime.sendMessage({ message: 'AllDOMElementsLoaded' }, () => {});
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
 *                           Outside unit tests, usually window.browser.
 * @param {Object} resultCallbacks Callbacks to run on success, failure, etc.
 *                                 These calls are used by unit tests to check
 *                                 results.  They are not used in production,
 *                                 except to log to the console in the content
 *                                 script.
 */
wpt.contentScript.InPageCommandRunner = class InPageCommandRunner {
  constructor(doc, chromeApi, resultCallbacks) {
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
      click: this.doClick_,
      setInnerHTML: this.doSetInnerHTML_,
      setInnerText: this.doSetInnerText_,
      setValue: this.doSetValue_,
      submitForm: this.doSubmitForm_,
      evalInPage: this.doEvalInPage_,
      collectStats: this.doCollectStats_,
    };
  }

  /**
   * Signal that the command completed without error.
   * @private
   */
  Success_() {
    if (this.resultCallbacks_.success)
      this.resultCallbacks_.success();
  }

  /**
   * Send a warning to the creator of the in-page command runner.
   * @param {string} warning Warning message.
   * @private
   */
  Warn_(warning) {
    if (this.resultCallbacks_.warn)
      this.resultCallbacks_.warn(warning);
  }

  /**
   * Signal that the command failed because of an error.
   * @param {string} error Error message.
   * @private
   */
  FatalError_(error) {
    if (this.resultCallbacks_.error)
      this.resultCallbacks_.error(error);
  }

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
  findTarget_(command, target) {
    let domElements;
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
  }

  /**
   * Click on a page element.
   * @param {Object} commandObject Contains a 'target' param specifying the DOM
   *     element to click, in attribute'value form.
   * @private
   */
  doClick_(commandObject) {
    const domElement = this.findTarget_(commandObject['command'],
                                        commandObject['target']);
    if (goog.isNull(domElement))
      return;  // Error already flagged by findTarget_().

    domElement.click();
    this.Success_();
  }

  /**
   * Set the innerText of a DOM node.
   * @param {Object} commandObject Contains a 'target' param specifying the DOM
   *     element to click, in attribute'value form.
   * @private
   */
  doSetInnerText_(commandObject) {
    const domElement = this.findTarget_(commandObject['command'],
                                        commandObject['target']);
    if (goog.isNull(domElement))
      return;  // Error already flagged by findTarget_().

    domElement.innerText = commandObject['value'];
    this.Success_();
  }

  /**
   * Set the innerHtml of a DOM node.
   * @param {Object} commandObject Contains a 'target' param specifying the DOM
   *     element to click, in attribute'value form.
   * @private
   */
  doSetInnerHTML_(commandObject) {
    const domElement = this.findTarget_(commandObject['command'],
                                        commandObject['target']);
    if (goog.isNull(domElement))
      return;  // Error already flagged by findTarget_().

    domElement.innerHTML = commandObject['value'];
    this.Success_();
  }

  /**
   * Set the value of an attribute of a DOM node.
   * @param {Object} commandObject Contains a 'target' param specifying the DOM
   *     element to click, in attribute'value form.
   * @private
   */
  doSetValue_(commandObject) {
    const domElement = this.findTarget_(commandObject['command'],
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
  }

  /**
   * Submit a form.
   * @param {Object} commandObject Contains a 'target' param specifying the DOM
   *     element to submit, in attribute'value form.
   * @private
   */
  doSubmitForm_(commandObject) {
    const domElement = this.findTarget_(commandObject['command'],
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
  }

  /**
   * Evaluates a script
   * @private
   * @param {Object} commandObject Contains a 'target' param specifying the DOM
   *     element to find.
   * @return {Boolean} Is there a matching target in the currnet DOM?
   */
  async doEvalInPage_(commandObject) {
    const scriptText = commandObject['target'];
    const scriptFn = `() => { ${scriptText} }`;
    // Send it to the page to eval so we aren't exposing extension APIs to
    // users.
    await wpt.contentScript.evalInPage_(scriptFn);
    this.Success_();
  }

  async doCollectStats_(customMetrics, callback) {
    const events = await wpt.contentScript.evalInPage_(((customMetrics) => {
      const result = [];
      function pushEvent(name, urlParams, data) {
        result.push({name, urlParams, data});
      }

      // look for any user timing data
      if (performance && performance.getEntriesByType) {
        const marks = performance.getEntriesByType("mark");
        for (var i = 0; i < marks.length; i++) {
          const mark = {
            entryType: marks[i].entryType,
            name: marks[i].name,
            startTime: marks[i].startTime,
            type: 'mark'
          };
          pushEvent('timed_event', null, JSON.stringify(mark));
        }
        const measures = performance.getEntriesByType("measure");
        for (var i = 0; i < measures.length; i++) {
          var measure = {
            entryType: measures[i].entryType,
            name: measures[i].name,
            startTime: measures[i].startTime,
            duration: measures[i].duration,
            type: 'measure'
          };
          pushEvent('timed_event', null, JSON.stringify(measure));
        }
      }

      var domCount = document.getElementsByTagName("*").length;
      pushEvent('domCount', { domCount });

      if (performance && performance.timing) {
        var timingParams = {};
        function addTime(name) {
          if (performance.timing[name] > 0) {
            timingParams[name] = Math.max(0, (
                performance.timing[name] -
                performance.timing['navigationStart']));
          }
        };
        addTime('domInteractive');
        addTime('domContentLoadedEventStart');
        addTime('domContentLoadedEventEnd');
        addTime('loadEventStart');
        addTime('loadEventEnd');
        pushEvent('window_timing', timingParams);
      }

      // collect any custom metrics
      if (customMetrics.length) {
        const lines = customMetrics.split("\n");
        const lineCount = lines.length;
        const out = {};
        for (let i = 0; i < lineCount; i++) {
          try {
            const parts = lines[i].split(":");
            if (parts.length == 2) {
              const name = parts[0];
              const code = window.atob(parts[1]);
              if (code.length) {
                const script = `(function() {${code}})()`;
                let scriptResult = eval(script);
                if (typeof scriptResult == 'undefined')
                  scriptResult = '';
                out[name] = scriptResult;
              }
            }
          } catch(e) {
            console.error(e.toStrin());
          }
        }
        pushEvent('custom_metrics', JSON.stringify(out));
      }

      return result;
    }).toString(), customMetrics);

    for (const {name, urlParams, data} of events) {
      wptSendEvent(name, urlParams, data);
    }

    this.Success_();
  }

  /**
   * Run a command.  The backgrond page delegates commands to the content script
   * by calling this method on an instance of InPageCommandRunner.
   * @param {Object} commandObj The command to run: See inPageCommendRunner for
   *     details.
   */
  RunCommand(commandObj) {
    console.info('InPageCommandRunner got a command: ', commandObj);

    const commandFun = this.commandMap_[commandObj['command']];
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
  }
}

/**
 * An instance of InPageCommandRunner whose well-known name can be used
 * by the background page.
 */
wpt.contentScript.InPageCommandRunner.Instance =
    new wpt.contentScript.InPageCommandRunner(
        window.document,
        chrome,
        {});
