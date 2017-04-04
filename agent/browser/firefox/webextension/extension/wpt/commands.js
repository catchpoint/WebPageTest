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
 * Just before navigate to the url, register the setDOMElement. When this
 * happens, the content scripts seem to be loaded. When this behaviour
 * seems broken, then we might need to switch to "passing a Message"
 * from content script as the first step to notify the background page
 * that it is loaded.
 */
browser.webNavigation.onBeforeNavigate.addListener(function(details) {
  wpt.commands.CommandRunner.prototype.doSetDOMElements();
});

wpt.commands.CommandRunner = class CommandRunner {
  constructor(tabId, chromeApi) {
    this.chromeApi_ = chromeApi;
  }

  SendCommandToContentScript_(commandObject, callback) {

    var code = ['wpt.contentScript.InPageCommandRunner.Instance.RunCommand(',
                JSON.stringify(commandObject),
                ');'].join('');
    this.chromeApi_.tabs.executeScript(
        g_tabid, {'code': code}, function() {
          if (callback != undefined)
            callback();
        });
  }

  doNavigate(url, callback) {
    this.chromeApi_.tabs.update(g_tabid, {'url': url}, function(tab){
      if (callback != undefined)
        callback();
    });
  }

  doSetCookie(cookie_path, data) {
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
          url: cookie_path,
          name: cookie_name,
          value: cookie_value
        };
        if (cookie_expires.length) {
          var date = new Date(cookie_expires);
          cookie['expirationDate'] = date.getTime();
        }
        this.chromeApi_.cookies.set(cookie);
      }
    }
  }

  doSetDOMElements() {
    if (wpt.commands.g_domElements.length > 0) {
      if (goog.isNull(g_tabid))
        throw ('It should not be posible to run the doSetDOMElements() method ' +
               'before we find the id of the tab in which pages are loaded.');

      browser.tabs.sendMessage(
          g_tabid,
          {'message': 'setDOMElements', name_values: wpt.commands.g_domElements},
          function(response) {});
      wpt.LOG.info('doSetDOMElements for :  ' + wpt.commands.g_domElements);
    }
  }

  doClick(target, callback) {
    this.SendCommandToContentScript_({
        'command': 'click',
        'target': target
    }, callback);
  }

  doSetInnerHTML(target, value, callback) {
    this.SendCommandToContentScript_({
        'command': 'setInnerHTML',
        'target': target,
        'value': value
    }, callback);
  }

  doSetInnerText(target, value, callback) {
    this.SendCommandToContentScript_({
        'command': 'setInnerText',
        'target': target,
        'value': value
    }, callback);
  }

  doSetValue(target, value, callback) {
    this.SendCommandToContentScript_({
        'command': 'setValue',
        'target': target,
        'value': value
    }, callback);
  }

  doSubmitForm(target, callback) {
    this.SendCommandToContentScript_({
        'command': 'submitForm',
        'target': target
    }, callback);
  }

  doEvalInPage(target, callback) {
    this.SendCommandToContentScript_({
        'command': 'evalInPage',
        'target': target
    }, callback);
  }

  doClearCache(options, callback) {
    if (this.chromeApi_['browsingData'] != undefined) {
      this.chromeApi_.browsingData.removeCache({}, () => {
        if (callback != undefined)
          callback();
      });
    } else if (this.chromeApi_.experimental['clear'] != undefined) {
      this.chromeApi_.experimental.clear.cache(0, () => {
        if (callback != undefined)
          callback();
      });
    }
  }

  doCheckResponsive(callback) {
    browser.tabs.sendMessage(g_tabid,
      {'message': 'checkResponsive'},
      response => {
        if (callback != undefined)
          callback();
      });
  }

  doCollectStats(customMetrics, callback) {
    this.SendCommandToContentScript_({
        'command': 'collectStats',
        'target': customMetrics
    }, callback);
  }
}


})());  // namespace
