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

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('wpt.chromeExtensionUtils');
goog.require('wpt.commands');
goog.require('wpt.contentScript');

goog.provide('wpt.allTests');

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
asyncTestCase.stepTimeout = 3 * 1000;  // 3 second timeout

/**
 * Open a tab, and run |callback| when it is loaded.
 * @param {Object} options Options to pass to chrome.tabs.create().
 * @param {Function.<Object>} callback Callback to run when the tab loads.
 *                                     Takes the tab info as a parameter.
 */
wpt.allTests.createTabAndWaitForLoad = function(options, callback) {

  chrome.tabs.create(options, function(tab) {
    var tabListner = function(tabId, changeInfo) {
      if (tabId != tab.id || changeInfo.status != 'complete')
        return;

      chrome.tabs.onUpdated.removeListener(tabListner);
      callback(tab);
    };

    chrome.tabs.onUpdated.addListener(tabListner);
  });
};

/**
 * Test the setcookie command.
 */
function testSetCookie() {
  var cookieLog;
  var commandRunner = new wpt.commands.CommandRunner(
      null,  // Tab id should not be used.
      {
        cookies: {
          set: function(setCookieObj) {
            cookieLog.push(setCookieObj);
          }
        }
      });

  cookieLog = [];
  commandRunner.doSetCookie(
      'http://www.a.com',
      'zip=20166');
  assertArrayEquals('Cookie set without a date.',
                    [{
                       'url': 'http://www.a.com',
                       'name': 'zip',
                       'value': '20166'
                     }],
                    cookieLog);

  /** @const */
  var dateString = 'Sat,01-Jan-2000 00:00:00 GMT';

  /** @const */
  var dateMsSinceEpoch = new Date('Sat,01-Jan-2000 00:00:00 GMT').getTime();

  cookieLog = [];
  commandRunner.doSetCookie(
      'http://www.example.com',
      'TestData=Test;expires=' + dateString);
  assertArrayEquals('Cookie set with a date.',
                    [{
                       'url': 'http://www.example.com',
                       'name': 'TestData',
                       'value': 'Test',
                       'expirationDate': dateMsSinceEpoch
                     }],
                    cookieLog);
  cookieLog = [];
  commandRunner.doSetCookie(
      'http://www.b.com',
      '    TestData  =  Test  ;    expires  = ' + dateString + ' ');
  assertArrayEquals('Whitespace trimming works.',
                    [{
                       'url': 'http://www.b.com',
                       'name': 'TestData',
                       'value': 'Test',
                       'expirationDate': dateMsSinceEpoch
                     }],
                    cookieLog);
}

function testFindDomElements() {
  // For testing, we search under a div in allTests.html:
  var root = document.getElementById('testFindDomElements');

  assertArrayEquals('No elements with attribute "zzz"',
                    [], wpt.contentScript.findDomElements_(root, "zzz'one"));


  assertArrayEquals('No elements with attribute "aaa" that have value "zzz"',
                    [], wpt.contentScript.findDomElements_(root, "aaa'zzz"));


  var actual = wpt.contentScript.findDomElements_(root, 'aaa=one');
  assertEquals('One item matching "aaa=one"', 1, actual.length);
  assertEquals('First span', actual[0].innerText);

  actual = wpt.contentScript.findDomElements_(root, "aaa'one");
  assertEquals("One item matching \"aaa'one\"", 1, actual.length);
  assertEquals('First span', actual[0].innerText);


  actual = wpt.contentScript.findDomElements_(root, "bbb'two");
  assertEquals("Two items matching \"bbb'two\"",
               2, actual.length);

  assertEquals('Items should be in tree-order: First item is a span',
               'First span', actual[0].innerText);

  assertEquals('Items should be in tree-order: Second item is a div',
               'First div', actual[1].innerText);

  actual = wpt.contentScript.findDomElements_(root, "bbb'three");
  assertEquals("One item matching \"bbb'three\"", 1, actual.length);
  assertEquals('Second div', actual[0].innerText);
}

function testFindDomElementWithGetElementById() {
  // For testing, we search under a div in allTests.html:
  var root = document.getElementById('testFindDomElements');

  // Get nothing for an id that does not exist.
  assertArrayEquals('No elements with id thisIdDoesNotExist',
                    [], wpt.contentScript.findDomElements_(
                        root, "id'thisIdDoesNotExist"));

  // Get the element whose id we search for:
  var actual = wpt.contentScript.findDomElements_(
      root, "id'thisIdExists");
  assertEquals('One elements with id thisIdDoesNotExist',
               1, actual.length);
  assertEquals('Should be an anchor tag.',
               'Anchor with id', actual[0].innerText);
}

function testFindDomElementWithGetElementByName() {
  // For testing, we search under a div in allTests.html:
  var root = document.getElementById('testFindDomElements');

  // Get nothing for a name that does not exist.
  assertArrayEquals('No elements with name thisNmaeDoesNotExist',
                    [], wpt.contentScript.findDomElements_(
                        root, "name'thisIdDoesNotExist"));

  // Find the one element whose name matches.
  var actual = wpt.contentScript.findDomElements_(
      root, 'name=thisNameExists');
  assertEquals('One element with name thisNameExists',
               1, actual.length);
  assertEquals('Should be an anchor tag.',
               'Anchor with name', actual[0].innerText);

  // If more than one name matches, the elemnts should be returned in DOM order.
  actual = wpt.contentScript.findDomElements_(
      root, "name'thitNameHasMultipleMatches");
  assertEquals('Two elements with name thisNameHasMultipleMatches',
               2, actual.length);
  assertEquals('Should be an anchor tag.',
               'First named anchor', actual[0].innerText);
  assertEquals('Should be an anchor tag.',
               'Second named anchor', actual[1].innerText);
}

function testFindDomElementMultipleDelimiters() {
  // For testing, we search under a div in allTests.html:
  var root = document.getElementById('testFindDomElements');

  // First ' is a delimiter, second ' is part of the value.
  var actual = wpt.contentScript.findDomElements_(
      root, "aaa'bbb'ccc");  // Should parse as target="aaa", value="bbb'ccc".
  assertEquals("First ' is the delimiter.",
               1, actual.length);
  assertEquals(actual[0].innerText, 'Single quote in value');

  // First = is a delimiter, second = is part of the value.
  actual = wpt.contentScript.findDomElements_(
      root, 'aaa=bbb=ccc');  // Should parse as target="aaa", value="bbb=ccc".
  assertEquals('First = is the delimiter.',
               1, actual.length);
  assertEquals(actual[0].innerText, 'Equals in value');

  // = takes presedence over ':
  actual = wpt.contentScript.findDomElements_(
      root, "aaa=bbb'ccc");  // Should parse as target="aaa", value="bbb'ccc".
  assertEquals("First = over second '.",
               1, actual.length);
  assertEquals(actual[0].innerText, 'Single quote in value');

  // = takes presedence over ':
  actual = wpt.contentScript.findDomElements_(
      root, "aaa'bbb=ccc");  // Should parse as target="aaa'bbb", value="ccc".
  assertEquals("Second = over first '.",
               1, actual.length);
  assertEquals(actual[0].innerText, 'Single quote in target');

}

function testFindDomElementMalformedTarget() {
  // For testing, we search under a div in allTests.html:
  var root = document.getElementById('testFindDomElements');

  var ex = assertThrows('No delimiter',
                        function() {
                          wpt.contentScript.findDomElements_(
                              root,
                              'no Delimiter in this string');
                        });
  assertEquals(
      ex,
      'Invalid target "no Delimiter in this string": no delimiter found.');

  ex = assertThrows('Empty attribute',
                    function() {
                      wpt.contentScript.findDomElements_(
                          root,
                          '=foo');
                    });
  assertEquals(
      ex,
      'Invalid target "=foo": The attribute to search for can not be empty.');
}

function testClickCommandInPage() {
  var successCalls;
  var errors;
  var warnings;

  var inPageCommandRunner = new wpt.contentScript.InPageCommandRunner(
      document.getElementById('testClickCommand'),
      {},
      {
        success: function() { successCalls++; },
        warn: function() {
          warnings.push(Array.prototype.slice.call(arguments).join(''));
        },
        error: function() {
          errors.push(Array.prototype.slice.call(arguments).join(''));
        }
      });

  // Set up onclick event handlers, so that we can detect clicks done by
  // the test.
  var clicks = [];
  var inputs = document.getElementsByClassName('testClickCommand');
  for (var i = 0, ie = inputs.length; i < ie; ++i) {
    /** @this {Element} */
    inputs[i].onclick = function() {
      clicks.push(this.getAttribute('index'));
    };
  }

  // Make each test easier to read by defining a helper function that clears
  // the errors and clicks, and does one click.  User should call this,
  // then assert that the clicks, warnings, and errors are as expected.
  var doTestClick = function(target) {
    successCalls = 0;
    errors = [];
    warnings = [];
    clicks = [];
    inPageCommandRunner.doClick_({'command': 'click (test)', 'target': target});
    assertEquals('Each click should cause a success call.',
                 clicks.length,
                 successCalls);
  };

  // Click on a button with a unique target.
  doTestClick("aaaa'one");
  assertArrayEquals('Should have seen a click on input 1.', ['1'], clicks);
  assertArrayEquals('No warnings', [], warnings);
  assertArrayEquals('No errors', [], errors);

  // Click on a button that does not exist.  Expect an error.
  doTestClick("aaaa'doesNotExist");
  assertArrayEquals('No clicks', [], clicks);
  assertArrayEquals('No warnings', [], warnings);
  assertArrayEquals(
      'Expect an error: Nothing to click.',
      ['Command click (test) failed: Could not find DOM element matching ' +
       "target aaaa'doesNotExist"],
      errors);

  // Click on a button with multiple targets.  Expect that only the first one
  // is clicked, and a warning is given.
  doTestClick('bbbb=value');
  assertArrayEquals('Should have seen a click on input 2, and not input 3.',
                    ['2'], clicks);
  assertArrayEquals('There are multiple matches.',
                    ['Command click (test): 2 matches for target ' +
                     '"bbbb=value".  Using first match.'],
                    warnings);
  assertArrayEquals('Having multiple matches is not an error.',
                    [], errors);

  // Invalid target: Empty attribute.
  doTestClick("'foo");
  assertArrayEquals('Should have seen no clicks.', [], clicks);
  assertArrayEquals(
      'Expect an error: empty attribute.',
      ["Command click (test) failed: Invalid target \"'foo\": The attribute " +
       'to search for can not be empty.'],
      errors);

  // Multiple instances of the separator.
  doTestClick("foo'bar'thud");
  assertArrayEquals('Should see a click on input 4.', ['4'], clicks);
  assertArrayEquals('No warnings', [], warnings);
  assertArrayEquals('No errors', [], errors);
}

function testSetInnerText() {
  var successCalls;
  var errors;
  var warnings;

  var inPageCommandRunner = new wpt.contentScript.InPageCommandRunner(
      document.getElementById('testSetInnerTextCommand'),
      {},
      {
        success: function() { successCalls++; },
        warn: function() {
          warnings.push(Array.prototype.slice.call(arguments).join(''));
        },
        error: function() {
          errors.push(Array.prototype.slice.call(arguments).join(''));
        }
      });


  var doSetInnerText = function(target, value) {
    successCalls = 0;
    errors = [];
    warnings = [];

    inPageCommandRunner.RunCommand({
        'command': 'setInnerText',
        'target': target,
        'value': value
    });
  };

  // Test that the inner text of a unique target can be changed.
  assertEquals('Initial text in id=uniqueDiv',
               'Initial text', document.getElementById('uniqueDiv').innerText);

  doSetInnerText('aaaa=one', 'unique!');
  assertArrayEquals('No warnings', [], warnings);
  assertArrayEquals('No errors', [], errors);
  assertEquals('Changed text in id=uniqueDiv',
               'unique!', document.getElementById('uniqueDiv').innerText);

  // Test that if the target matches two nodes, the first has its inner text
  // changed.
  assertEquals('Initial text in id=firstDuplicateDiv',
               'Initial text',
               document.getElementById('firstDuplicateDiv').innerText);
  assertEquals('Initial text in id=secondDuplicateDiv',
               'Initial text',
               document.getElementById('secondDuplicateDiv').innerText);

  doSetInnerText('bbbb=value', 'Change first...');
  assertArrayEquals('Warning for multiple matches',
                    ['Command setInnerText: 2 matches for target ' +
                     '"bbbb=value".  Using first match.'],
                    warnings);
  assertArrayEquals('No errors', [], errors);
  assertEquals('Changed text in id=firstDuplicateDiv',
               'Change first...',
               document.getElementById('firstDuplicateDiv').innerText);
  assertEquals('No change in text of id=secondDuplicateDiv',
               'Initial text',
               document.getElementById('secondDuplicateDiv').innerText);

  // Test that setting text in a target that does not exist gives an error.
  doSetInnerText('does=notExist', 'Should not be set...');
  assertArrayEquals('No warnings', [], warnings);
  assertArrayEquals('Expect an error',
                    ['Command setInnerText failed: Could not find DOM ' +
                     'element matching target does=notExist'],
                    errors);

  // Test that a malformed target gives an error.
  doSetInnerText('thisTargetHasNoDelimiter', 'Should not be set...');
  assertArrayEquals('No warnings', [], warnings);
  assertArrayEquals('No errors',
                    ['Command setInnerText failed: Invalid target ' +
                     '"thisTargetHasNoDelimiter": no delimiter found.'],
                    errors);
}

function testSetInnerHtml() {
  var successCalls;
  var errors;
  var warnings;

  var inPageCommandRunner = new wpt.contentScript.InPageCommandRunner(
      document.getElementById('testSetInnerHtmlCommand'),
      {},
      {
        success: function() { successCalls++; },
        warn: function() {
          warnings.push(Array.prototype.slice.call(arguments).join(''));
        },
        error: function() {
          errors.push(Array.prototype.slice.call(arguments).join(''));
        }
      });

  var doSetInnerHtml = function(target, value) {
    successCalls = 0;
    errors = [];
    warnings = [];

    inPageCommandRunner.RunCommand({
        'command': 'setInnerHTML',
        'target': target,
        'value': value
    });
  };

  // Test that the inner text of a unique target can be changed.
  assertEquals('Initial text in id=testSetInnerHtmlCommandInitialDiv',
               'initial',
               document.getElementById(
                   'testSetInnerHtmlCommandInitialDiv').innerText);
  doSetInnerHtml('ggg=ggg', '<div id="insertedHtmlDiv">newnewnew</div>');
  assertEquals('Should succeed.', 1, successCalls);
  assertArrayEquals('No warnings', [], warnings);
  assertArrayEquals('No errors', [], errors);

  assertEquals('newnewnew',
               document.getElementById('insertedHtmlDiv').innerText);
}

/**
 * @constructor
 * @param {string} domId The id of a DOM element that the test will read/modify.
 * @param {Object} fakeChromeApi The root object of the chrome API.
 *
 */
wpt.allTests.CreateInPageCommandRunner = function(domId, fakeChromeApi) {
  this.successCalls = 0;
  this.errors = [];
  this.warnings = [];

  var self = this;
  this.inPageCommandRunner_ = new wpt.contentScript.InPageCommandRunner(
      document.getElementById(domId),
      fakeChromeApi,
      {
        success: function() { self.successCalls++; },
        warn: function() {
          self.warnings.push(Array.prototype.slice.call(arguments).join(''));
        },
        error: function() {
          self.errors.push(Array.prototype.slice.call(arguments).join(''));
        }
      });
};

/**
 * @param {Object} commandObj
 */
wpt.allTests.CreateInPageCommandRunner.prototype.RunCommand = function(
    commandObj) {
  this.successCalls = 0;
  this.errors = [];
  this.warnings = [];

  this.inPageCommandRunner_.RunCommand(commandObj);

  // Caller can now test that successCalls, errors, and warnings have expected
  // values.
};


function testSetValueCommand() {
  var ipcr = new wpt.allTests.CreateInPageCommandRunner(
      'testSetValueCommand',
      {});

  // Test that trying to set the value of a div fails because of the tag type.
  ipcr.RunCommand({
      'command': 'setValue',
      'target': 'testKey=wrongTagType',
      'value': 'Should fail'
  });

  assertArrayEquals('No warnings', [], ipcr.warnings);
  assertArrayEquals(
      ['Target to setValue must match an INPUT or TEXTAREA tag.  Matched tag ' +
       'is of type DIV'],
      ipcr.errors);
  assertEquals('Should fail.', 0, ipcr.successCalls);


  // Test that trying to set the value of an input tag works.
  ipcr.RunCommand({
      'command': 'setValue',
      'target': 'testkey=inputTag',
      'value': 'new input value'
  });

  assertArrayEquals('No warnings', [], ipcr.warnings);
  assertArrayEquals('No errors', [], ipcr.errors);
  assertEquals('Should work.', 1, ipcr.successCalls);
}

function testSubmitFormCommand() {
  var ipcr = new wpt.allTests.CreateInPageCommandRunner(
      'testSubmitFormCommand',
      {});

  // Test that trying to submit a div fails because of the tag type.
  ipcr.RunCommand({
      'command': 'submitForm',
      'target': 'testKey=cantSubmitADiv'
  });

  assertArrayEquals('No warnings', [], ipcr.warnings);
  assertArrayEquals(
      ['Target to submitForm must match a FORM tag.  Matched tag is of ' +
       'type DIV'],
      ipcr.errors);
  assertEquals('Should fail.', 0, ipcr.successCalls);

  // TODO: Test a successful submission.  Tricky because a submitted form
  // will cause navigation, unloading the test page.  Consider holding the form
  // in an iframe.
}

function testNetErrorStringToWptCode() {
  assertEquals(
      'Test that invalid strings get the default number.',
      12999,
      wpt.chromeExtensionUtils.netErrorStringToWptCode(
          'this is not a network error string'));

  assertEquals(
      'Test a valid string.',
      12007,
      wpt.chromeExtensionUtils.netErrorStringToWptCode(
          'net::ERR_NAME_NOT_RESOLVED'));

  assertEquals(
      'Test another valid string.',
      12031,
      wpt.chromeExtensionUtils.netErrorStringToWptCode(
          'net::ERR_CONNECTION_RESET'));
}
