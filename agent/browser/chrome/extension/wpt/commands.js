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

  Author: Sam Kerner (skerner at google dot com)

 ******************************************************************************/

var g_tabid = 0;

goog.require('wpt.logging');
goog.provide('wpt.commands');

((function() {  // namespace

wpt.commands.g_domElements = [];

/**
 * Remove leading and trailing whitespace.
 * @param {string} stringToTrim
 * @return {string}
 */
function trim(stringToTrim) {
  return stringToTrim.replace(/^\s+|\s+$/g, '');
}

/**
 * Construct an object that runs the commands supported by WebPageTest.
 * See http://www.webperformancecentral.com/wiki/WebPagetest/Scripting
 * for a complete list of the commands.
 *
 * @constructor
 * @param {?number} tabId The id of the tab being used to load the page
 *                       under test.  See that chrome.tabs.* docs to
 *                       understand what methods give and use this id.
 * @param {Object} chromeApi Object which contains the chrome extension
 *                           API methods.  The real one is window.chrome
 *                           in an extension.  Tests may pass in a mock
 *                           object.
 */
wpt.commands.CommandRunner = function(tabId, chromeApi) {
  this.chromeApi_ = chromeApi;
};

/**
 * Delegate a command to the InPageCommandRunner in the content script.
 * TODO(skerner): The InPageCommandRunner has the ability to report
 * success and failure, and this is used in unit tests to check results.
 * Hook the reporting up to the backgrond page's logging, so that all
 * logging can be read in a single location.
 *
 * @param {Object} commandObject
 */
wpt.commands.CommandRunner.prototype.SendCommandToContentScript_ = function(
    commandObject, callback) {

  var code = ['wpt.contentScript.InPageCommandRunner.Instance.RunCommand(',
              JSON.stringify(commandObject),
              ');'].join('');
  this.chromeApi_.tabs.executeScript(
      g_tabid, {'code': code}, function() {
        if (callback != undefined)
          callback();
      });
};

/**
 * Implement the navigate command.
 * @param {string} url
 */
wpt.commands.CommandRunner.prototype.doNavigate = function(url, callback) {
  this.chromeApi_.tabs.update(g_tabid, {'url': url}, function(tab){
    if (callback != undefined)
      callback();
  });
};

/**
 * Implement the setcookie command.
 * @param {string} cookie_path
 * @param {string} data
 */
wpt.commands.CommandRunner.prototype.doSetCookie = function(cookie_path, data) {
  var pos = data.indexOf(';');
  var val = data;
  var cookie_expires = '';

  if (pos > 0) {
    val = data.substring(0, pos);
    var exp = trim(data.substring(pos + 1));
    pos = exp.indexOf('=');
    if (pos > 0) {
      cookie_expires = trim(exp.substring(pos + 1));
    }
  }
  pos = val.indexOf('=');
  if (pos > 0) {
    var cookie_name = trim(val.substring(0, pos));
    var cookie_value = trim(val.substring(pos + 1));
    if (cookie_name.length && cookie_value.length && cookie_path.length) {
      var cookie = {
        'url': cookie_path,
        'name': cookie_name,
        'value': cookie_value
      };
      if (cookie_expires.length) {
        var date = new Date(cookie_expires);
        cookie['expirationDate'] = date.getTime();
      }
      this.chromeApi_.cookies.set(cookie);
    }
  }
};

/**
 * Block all urls matching |blockPattern| using the non-declarative web
 * request API.
 * @param {string} blockPattern
 */
wpt.commands.CommandRunner.prototype.doBlockUsingRequestCallback_ =
    function(blockPattern) {
  // Create a listener which blocks all the requests that has the pattern.
  // Also, pass an empty filter and 'blocking' as the extraInfoSpec.
  var onBeforeRequestCallback = function(details) {
    if (details.url.indexOf(blockPattern) != -1) {
      return {'cancel': true };
    }
    return {};
  };

  var requestFilter = {
    urls: [],
    tabId: g_tabid
  };

  this.chromeApi_.webRequest.onBeforeRequest.addListener(
      onBeforeRequestCallback,
      requestFilter,
      ['blocking']);
};

/**
 * Implement the block command.
 * @param {string} blockPattern
 */
wpt.commands.CommandRunner.prototype.doBlock = function(blockPattern) {
  // The declarative web request API does not delay every request to
  // call our listener, so prefer it to the callback based version. If
  // the version of chrome we are running does not have the declarative
  // web request API, the test that we have permission to use it will
  // fail.
  var self = this;
  self.doBlockUsingRequestCallback_(blockPattern);
};

/**
 * Just before navigate to the url, register the setDOMElement. When this
 * happens, the content scripts seem to be loaded. When this behaviour
 * seems broken, then we might need to switch to "passing a sendrequest"
 * from content script as the first step to notify the background page
 * that it is loaded.
 */
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  wpt.commands.CommandRunner.prototype.doSetDOMElements();
});

/**
 * Implement the setDOMElements command.
 */
wpt.commands.CommandRunner.prototype.doSetDOMElements = function() {
  if (wpt.commands.g_domElements.length > 0) {
    if (goog.isNull(g_tabid))
      throw ('It should not be posible to run the doSetDOMElements() method ' +
             'before we find the id of the tab in which pages are loaded.');

    chrome.tabs.sendRequest(
        g_tabid,
        {'message': 'setDOMElements', name_values: wpt.commands.g_domElements},
        function(response) {});
    wpt.LOG.info('doSetDOMElements for :  ' + wpt.commands.g_domElements);
  }
};

/**
 * Implement the click command.
 * @param {string} target The DOM element to click, in attribute'value form.
 */
wpt.commands.CommandRunner.prototype.doClick = function(target, callback) {
  this.SendCommandToContentScript_({
      'command': 'click',
      'target': target
  }, callback);
};

/**
 * Implement the setInnerHTML command.
 * @param {string} target The DOM element to click, in attribute'value form.
 * @param {string} value The value to set.
 */
wpt.commands.CommandRunner.prototype.doSetInnerHTML = function(target, value, callback) {
  this.SendCommandToContentScript_({
      'command': 'setInnerHTML',
      'target': target,
      'value': value
  }, callback);
};

/**
 * Implement the setInnerText command.
 * @param {string} target The DOM element to click, in attribute'value form.
 * @param {string} value The value to set.
 */
wpt.commands.CommandRunner.prototype.doSetInnerText = function(target, value, callback) {
  this.SendCommandToContentScript_({
      'command': 'setInnerText',
      'target': target,
      'value': value
  }, callback);
};

/**
 * Implement the setValue command.
 * @param {string} target The DOM element to set, in attribute'value form.
 * @param {string} value The value to set the target to.
 */
wpt.commands.CommandRunner.prototype.doSetValue = function(target, value, callback) {
  this.SendCommandToContentScript_({
      'command': 'setValue',
      'target': target,
      'value': value
  }, callback);
};

/**
 * Implement the submitForm command.
 * @param {string} target The DOM element to set, in attribute'value form.
 */
wpt.commands.CommandRunner.prototype.doSubmitForm = function(target, callback) {
  this.SendCommandToContentScript_({
      'command': 'submitForm',
      'target': target
  }, callback);
};

/**
 * Implement the clearcache command.
 * @param {string} options
 */
wpt.commands.CommandRunner.prototype.doClearCache = function(options, callback) {
  if (this.chromeApi_['browsingData'] != undefined) {
    this.chromeApi_.browsingData.removeCache({}, function() {
      if (callback != undefined)
        callback();
    });
  } else if (this.chromeApi_.experimental['clear'] != undefined) {
    this.chromeApi_.experimental.clear.cache(0, function() {
      if (callback != undefined)
        callback();
    });
  }
};

/**
 * Implement the noscript command.
 */
wpt.commands.CommandRunner.prototype.doNoScript = function() {
  this.chromeApi_.contentSettings.javascript.set({
    'primaryPattern': '<all_urls>',
    'setting': 'block'
  });
};

wpt.commands.CommandRunner.prototype.doCheckResponsive = function(callback) {
  chrome.tabs.sendRequest( g_tabid, {'message': 'checkResponsive'},
      function(response) {
        if (callback != undefined)
          callback();
      });
};

})());  // namespace
