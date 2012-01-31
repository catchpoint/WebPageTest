goog.require('wpt.logging');
goog.provide('wpt.commands');

((function() {  // namespace

wpt.commands.g_domElements = [];

/**
 * Chrome APIs move from experimental to supported without notice.
 * Keep our code from breaking by declaring that some experimental
 * APIs can be used in the non-experimental namespace.
 * @param {string} apiName The name of the chrome extensons API.
 */
function moveOutOfexperimentalIfNeeded(apiName) {
  // Prefer the real API.  If it exists, do nothing.
  if (!chrome[apiName]) {
    // Use the experimental version if it exists.
    if (chrome.experimental[apiName]) {
      chrome[apiName] = chrome.experimental[apiName];
    } else {
      throw 'Requested chrome API ' + apiName + ' does not exist!';
    }
  }
}

moveOutOfexperimentalIfNeeded('webNavigation');
moveOutOfexperimentalIfNeeded('webRequest');

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
  this.tabId_ = tabId;
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
    commandObject) {

  console.log('Delegate a command to the content script: ', commandObject);

  var code = ['wpt.contentScript.InPageCommandRunner.Instance.RunCommand(',
              JSON.stringify(commandObject),
              ');'].join('');
  this.chromeApi_.tabs.executeScript(
      this.tabId_, {'code': code}, function() {});
};

/**
 * Implement the exec command.
 * TODO(skerner): Make this use SendCommandToContentScript_(), and
 * wrap it in a try block to avoid breaking the content script on
 * an exception.
 * @param {string} script
 */
wpt.commands.CommandRunner.prototype.doExec = function(script) {
  this.chromeApi_.tabs.executeScript(this.tabId_, {'code': script});
};

/**
 * Implement the navigate command.
 * @param {string} url
 */
wpt.commands.CommandRunner.prototype.doNavigate = function(url) {
  this.chromeApi_.tabs.update(this.tabId_, {'url': url});
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
 * Implement the block command.
 * @param {string} blockPattern
 */
wpt.commands.CommandRunner.prototype.doBlock = function(blockPattern) {
  // Create a listener which blocks all the requests that has the patterm. Also,
  // pass an empty filter and 'blocking' as the extraInfoSpec.
  chrome.webRequest.onBeforeRequest.addListener(function(details) {
    if (details.url.indexOf(blockPattern) != -1) {
      return {'cancel': true };
    }
    return {};
  }, {}, ['blocking']);
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
    if (goog.isNull(this.tabId_))
      throw ('It should not be posible to run the doSetDOMElements() method ' +
             'before we find the id of the tab in which pages are loaded.');

    chrome.tabs.sendRequest(
        this.tabId_,
        {'message': 'setDOMElements', name_values: wpt.commands.g_domElements},
        function(response) {});
    wpt.LOG.info('doSetDOMElements for :  ' + wpt.commands.g_domElements);
  }
};

/**
 * Implement the click command.
 * @param {string} target The DOM element to click, in attribute'value form.
 */
wpt.commands.CommandRunner.prototype.doClick = function(target) {
  this.SendCommandToContentScript_({
      'command': 'click',
      'target': target
  });
};

/**
 * Implement the setInnerHTML command.
 * @param {string} target The DOM element to click, in attribute'value form.
 * @param {string} value The value to set.
 */
wpt.commands.CommandRunner.prototype.doSetInnerHTML = function(target, value) {
  this.SendCommandToContentScript_({
      'command': 'setInnerHTML',
      'target': target,
      'value': value
  });
};

/**
 * Implement the setInnerText command.
 * @param {string} target The DOM element to click, in attribute'value form.
 * @param {string} value The value to set.
 */
wpt.commands.CommandRunner.prototype.doSetInnerText = function(target, value) {
  this.SendCommandToContentScript_({
      'command': 'setInnerText',
      'target': target,
      'value': value
  });
};

/**
 * Implement the setValue command.
 * @param {string} target The DOM element to set, in attribute'value form.
 * @param {string} value The value to set the target to.
 */
wpt.commands.CommandRunner.prototype.doSetValue = function(target, value) {
  this.SendCommandToContentScript_({
      'command': 'setValue',
      'target': target,
      'value': value
  });
};

/**
 * Implement the submitForm command.
 * @param {string} target The DOM element to set, in attribute'value form.
 */
wpt.commands.CommandRunner.prototype.doSubmitForm = function(target) {
  this.SendCommandToContentScript_({
      'command': 'submitForm',
      'target': target
  });
};

})());  // namespace
