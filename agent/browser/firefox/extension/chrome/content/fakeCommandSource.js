/**
 * Copyright 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file defines a static list of fake commands.  These commands excersize
 * the code without talking to the wptdriver, allowing a simple test of basic
 * functionality without entering data in the web interface.
 *
 * Author: Sam Kerner (skerner at google dot com)
 */

// Namespace wpt.fakeCommandSource:
window['wpt'] = window['wpt'] || {};
window.wpt['fakeCommandSource'] = window.wpt['fakeCommandSource'] || {};

(function() {  // Begin closure

/**
 * Build a command record.
 */
function FakeCommand(action, target, opt_value) {
  result = {
    'action': action,
    'target': target
  };
  if (typeof opt_value != 'undefined')
    result['value'] = opt_value;

  return result;
}

var FAKE_COMMANDS = [
    // Can we navigate?
    FakeCommand('navigate', 'http://www.example.com/'),

    // Can exec read the DOM of the page?
    FakeCommand('exec', 'dump("window.location.href is: " + window.location.href);'),

    // Can exec alter the DOM of the page?
    FakeCommand('exec', 'window.document.title = "This title is from an exec command"'),

    // Is exec in a page limited to the permissions of that page?
    FakeCommand('exec', [
        'try {',
        '  var foo = "" + gBrowser;',
        '  alert("BUG: Sandbox should not allow access to gBroser.");',
        '} catch (ex) {',
        '  dump("Got ex:" + ex);',
        '}'].join('\n')),
    FakeCommand('exec', [
        'try {',
        '  var foo = Components.classes["@mozilla.org/network/standard-url;1"];',
        '  alert("BUG: sandbox should hide Components.classes[...] from a web page.");',
        '} catch (ex) {',
        '  dump("Got ex:" + ex);',
        '}'].join('\n')),

    // Search for a cute dog on youtube.
    FakeCommand('navigate', 'http://www.youtube.com/'),
    FakeCommand('setvalue', 'id=masthead-search-term', 'boston mspca legend'),
    FakeCommand('submitform', 'id=masthead-search'),

    // See some doodles on google.com.
    FakeCommand('navigate', 'http://www.google.com/'),
    FakeCommand('click', 'name\'btnI'),

    // Alter the heading on news.google.com.
    FakeCommand('navigate', 'http://www.google.com/news'),
    FakeCommand('setinnertext', 'class=kd-appname',
                'This text should replace the word news!'),

    FakeCommand('setinnerhtml', 'class=kd-appname',
                'This <b>HTML</b> should replace the word news!'),

    FakeCommand('setvalue', 'class=searchField', 'Susie, the Qmiester'),
    FakeCommand('submitform', 'id=search-hd'),

    // Test that we can set cookies.
    FakeCommand('setcookie', 'http://www.xol.com', 'zip = 20166'),
    FakeCommand('setcookie', 'http://www.yol.com',
                'TestData=bTest; expires=Fri Aug 12 2030 18:50:34 GMT-0400 (EDT)'),
    FakeCommand('setcookie', 'http://www.zol.com',
                'TestData = cTest; expires = Fri Aug 12 2030 19:50:34 GMT-0400 (EDT)')
];

var fakeCommandIdx = 0;
wpt.fakeCommandSource.next = function() {
  if (fakeCommandIdx >= FAKE_COMMANDS.length)
    return null;

  return FAKE_COMMANDS[fakeCommandIdx++];
};

})();  // End closure
