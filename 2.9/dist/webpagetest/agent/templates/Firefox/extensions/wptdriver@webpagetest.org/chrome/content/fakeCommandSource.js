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
    FakeCommand('navigate', 'http://www.example.com/'),

    FakeCommand('setdomelement', 'doneWaiting=yes'),
    //FakeCommand('setdomelement', 'doneWaiting=no'),

    // Add a div including the done waiting marker.
    FakeCommand('exec',
                'var el = window.document.createElement("div"); ' +
                'el.setAttribute("id", "testInjectionElement"); ' +
                'el.setAttribute("doneWaiting", "yes"); ' +
                'el.innerText = "See this text??????????????????????"; ' +
                'window.document.body.appendChild(el); '),

    FakeCommand('exec',
                'alert("done waiting.");'),

    FakeCommand('block', 'iana-logo-pageheader.png'),

    // Can we navigate?
    FakeCommand('navigate', 'http://www.example.com/'),

    // Can exec read the DOM of the page?
    FakeCommand(
        'exec',
        'dump("window.location.href is: " + window.location.href + "\\n");'),

    // Can exec alter the DOM of the page?
    FakeCommand(
        'exec',
        'window.document.title = "This title is from an exec command"'),

    // Is exec in a page limited to the permissions of that page?
    FakeCommand('exec', [
        'try {',
        '  var foo = "" + gBrowser;',
        '  alert("BUG: Sandbox should not allow access to gBroser.");',
        '} catch (ex) {',
        '  dump("GOOD: Got ex:" + ex);',
        '}'].join('\n')),
    FakeCommand('exec', [
        'try {',
        '  var foo = ',
        '      Components.classes["@mozilla.org/network/standard-url;1"];',
        '  alert("BUG: sandbox should hide Components.classes[...] " +',
        '        "from a web page.");',
        '} catch (ex) {',
        '  dump("GOOD: Got ex:" + ex);',
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
    FakeCommand('setinnertext', 'class=kd-appname-wrapper',
                'This text should replace the word news!'),

    FakeCommand('setinnerhtml', 'class=kd-appname-wrapper',
                'This <b>HTML</b> should replace the word news!'),

    FakeCommand('setvalue', 'class=searchField', 'Susie, the Qmiester'),
    FakeCommand('submitform', 'id=search-hd'),

    // Test that we can set cookies.
    FakeCommand('setcookie', 'http://www.xol.com', 'zip = 20166'),
    FakeCommand(
        'setcookie', 'http://www.yol.com',
        'TestData=bTest; expires=Fri Aug 12 2030 18:50:34 GMT-0400 (EDT)'),
    FakeCommand(
        'setcookie', 'http://www.zol.com',
        'TestData = cTest; expires = Fri Aug 12 2030 19:50:34 GMT-0400 (EDT)')
];


wpt.fakeCommandSource.waitingForDomNodesLoadedEvent_ = false;

/** If defined, block at this index.  Some event should unblock eventually. */
wpt.fakeCommandSource.blockIndex_ = undefined;

/**
 * Some commands block new commands until
 */
wpt.fakeCommandSource.onEvent = function(eventName, opt_params) {
  if (wpt.fakeCommandSource.waitingForDomNodesLoadedEvent_ &&
      eventName == 'all_dom_elements_loaded') {
    wpt.fakeCommandSource.waitingForDomNodesLoadedEvent_ = true;
    wpt.fakeCommandSource.blockIndex_ = undefined;
  }
};


var fakeCommandIdx = 0;

wpt.fakeCommandSource.next = function() {
  if (fakeCommandIdx >= FAKE_COMMANDS.length)
    return null;

  if (typeof(wpt.fakeCommandSource.blockIndex_) != 'undefined' &&
      fakeCommandIdx == wpt.fakeCommandSource.blockIndex_) {
    return null;
  }

  var cmd = FAKE_COMMANDS[fakeCommandIdx];

  // Block commands in the same way the driver would.
  if (cmd['action'] == 'setdomelement') {
    wpt.fakeCommandSource.waitingForDomNodesLoadedEvent_ = true;

    // Allow the next command, but block after it until the target appears.
    wpt.fakeCommandSource.blockIndex_ = fakeCommandIdx + 2;
  }

  fakeCommandIdx++;

  return cmd;
};

})();  // End closure
