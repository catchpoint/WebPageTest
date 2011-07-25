goog.provide('wpt.commands');

/**
 * Remove leading and trailing whitespace.
 * @param {string} stringToTrim
 * @return {string}
 */
function trim(stringToTrim) {
  return stringToTrim.replace(/^\s+|\s+$/g,"");
}

/**
 * Construct an object that runs the commands supported by WebPageTest.
 * See http://www.webperformancecentral.com/wiki/WebPagetest/Scripting
 * for a complete list of the commands.
 *
 * @constructor
 * @param {Object} chromeApi Object which contains the chrome extension
 *                           API methods.  The real one is window.chrome
 *                           in an extension.  Tests may pass in a mock
 *                           object.
 */
wpt.commands.CommandRunner = function(chromeApi) {
  this.chromeApi_ = chromeApi;

  //TODO(skerner): Add a log chanel member.
};

/**
 * Implement the exec command.
 * @param {string} script
 */
wpt.commands.CommandRunner.prototype.doExec = function(script) {
  this.chromeApi_.tabs.executeScript(null, {code:script});
};

/**
 * Implement the navigate command.
 * @param {number} tabId Id of the tab being used for testing.
 * @param {string} url
 */
wpt.commands.CommandRunner.prototype.doNavigate = function(tabId, url) {
  this.chromeApi_.tabs.update(tabId, {"url":url});
}

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
    val = data.substring(0,pos);
    var exp = trim(data.substring(pos + 1));
    pos = exp.indexOf('=');
    if (pos > 0) {
      cookie_expires = trim(exp.substring(pos + 1));
    }
  }
  pos = val.indexOf('=');
  if (pos > 0) {
    var cookie_name = trim(val.substring(0,pos));
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
wpt.commands.CommandRunner.prototype.doBlock = function(blockpattern) {
  // Create a listener which blocks all the requests that has the patterm. Also,  pass an empty filter and "blocking" as the extraInfoSpec.
  chrome.experimental.webRequest.onBeforeRequest.addListener(function(details){
    if (details.url.indexOf(blockpattern) != -1) {
      return { "cancel": true };
    }
    return {};
  }, {}, ["blocking"]);
};
