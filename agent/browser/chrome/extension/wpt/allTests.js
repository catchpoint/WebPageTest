goog.require('wpt.commands');
goog.require('wpt.contentScript');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.AsyncTestCase');

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
      undefined,  // Tab id should not be used.
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
  assertArrayEquals("Cookie set without a date.",
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
      'TestData=Test;expires='+dateString);
  assertArrayEquals("Cookie set with a date.",
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
      '    TestData  =  Test  ;    expires  = '+ dateString +' ');
  assertArrayEquals("Whitespace trimming works.",
                    [{
                       'url': 'http://www.b.com',
                       'name': 'TestData',
                       'value': 'Test',
                       'expirationDate': dateMsSinceEpoch
                     }],
                    cookieLog);
};

function testFindDomElements() {
  // For testing, we search under a div in allTests.html:
  var root = document.getElementById('testFindDomElements');

  assertArrayEquals("No elements with attribute 'zzz'",
                    [], wpt.contentScript.findDomElements_(root, "zzz'one"));


  assertArrayEquals("No elements with attribute 'aaa' that have value 'zzz'",
                    [], wpt.contentScript.findDomElements_(root, "aaa'zzz"));


  var actual = wpt.contentScript.findDomElements_(root, "aaa'one");
  assertEquals("One item matching \"aaa'one\"", 1, actual.length);
  assertEquals("First span", actual[0].innerText);


  actual = wpt.contentScript.findDomElements_(root, "bbb'two");
  assertEquals("Two items matching \"bbb'two\"",
               2, actual.length);

  assertEquals("Items should be in tree-order: First item is a span",
               "First span", actual[0].innerText);

  assertEquals("Items should be in tree-order: Second item is a div",
               "First div", actual[1].innerText);

  actual = wpt.contentScript.findDomElements_(root, "bbb'three");
  assertEquals("One item matching \"bbb'three\"", 1, actual.length);
  assertEquals("Second div", actual[0].innerText);
}

function testFindDomElementWithGetElementById() {
  // For testing, we search under a div in allTests.html:
  var root = document.getElementById('testFindDomElements');

  // Get nothing for an id that does not exist.
  assertArrayEquals("No elements with id thisIdDoesNotExist",
                    [], wpt.contentScript.findDomElements_(
                        root, "id'thisIdDoesNotExist"));

  // Get the element whose id we search for:
  var actual = wpt.contentScript.findDomElements_(
      root, "id'thisIdExists");
  assertEquals("One elements with id thisIdDoesNotExist",
               1, actual.length);
  assertEquals("Should be an anchor tag.",
               "Anchor with id", actual[0].innerText);
}

function testFindDomElementWithGetElementByName() {
  // For testing, we search under a div in allTests.html:
  var root = document.getElementById('testFindDomElements');

  // Get nothing for a name that does not exist.
  assertArrayEquals("No elements with name thisNmaeDoesNotExist",
                    [], wpt.contentScript.findDomElements_(
                        root, "name'thisIdDoesNotExist"));

  // Find the one element whose name matches.
  var actual = wpt.contentScript.findDomElements_(
      root, "name'thisNameExists");
  assertEquals("One element with name thisNameExists",
               1, actual.length);
  assertEquals("Should be an anchor tag.",
               "Anchor with name", actual[0].innerText);

  // If more than one name matches, the elemnts should be returned in DOM order.
  actual = wpt.contentScript.findDomElements_(
      root, "name'thitNameHasMultipleMatches");
  assertEquals("Two elements with name thisNameHasMultipleMatches",
               2, actual.length);
  assertEquals("Should be an anchor tag.",
               "First named anchor", actual[0].innerText);
  assertEquals("Should be an anchor tag.",
               "Second named anchor", actual[1].innerText);
}

function testClickCommandInPage() {
  var successCalls;
  var errors;
  var warnings;

  var inPageCommandRunner = new wpt.contentScript.InPageCommandRunner(
      document.getElementById('testClickCommand'),
      {},
      undefined,  // Should not use command port.
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
  var inputs = document.getElementsByClassName("testClickCommand");
  for (var i = 0, ie = inputs.length; i < ie; ++i) {
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
    inPageCommandRunner.doClick(target);
    assertEquals("Each click should cause a success call.",
                 clicks.length,
                 successCalls);
  };

  // Click on a button with a unique target.
  doTestClick("aaaa'one");
  assertArrayEquals("Should have seen a click on input 1.", ['1'], clicks);
  assertArrayEquals("No warnings", [], warnings);
  assertArrayEquals("No errors", [], errors);

  // Click on a button that does not exist.  Expect an error.
  doTestClick("aaaa'doesNotExist");
  assertArrayEquals("No clicks", [], clicks);
  assertArrayEquals("No warnings", [], warnings);
  assertArrayEquals(
      "Expect an error: Nothing to click.",
      ["Click failed: Could not find DOM element matching target aaaa'doesNotExist"],
      errors);

  // Click on a button with multiple targets.  Expect that only the first one
  // is clicked, and a warning is given.
  doTestClick("bbbb'value");
  assertArrayEquals("Should have seen a click on input 2, and not input 3.",
                    ['2'], clicks);
  assertArrayEquals("There are multiple matches.",
                    ['2 matches for target "bbbb\'value".  Using first match.'],
                    warnings);
  assertArrayEquals("Having multiple matches is not an error.",
                    [], errors);

  // Invalid target: Empty attribute.
  doTestClick("'foo");
  assertArrayEquals("Should have seen no clicks.", [], clicks);
  assertArrayEquals(
      "Expect an error: empty attribute.",
      ["Click failed: Invalid target \"'foo\": The attribute to search for can not be empty."],
      errors);

  // Multiple instances of the separator.
  doTestClick("foo'bar'thud");
  assertArrayEquals("Should see a click on input 4.", ['4'], clicks);
  assertArrayEquals("No warnings", [], warnings);
  assertArrayEquals("No errors", [], errors);
}

// Test that click commands starting in the BG page can signal the CS code
// to execute the click on a single target.
function testClickCommandEndToEndSuccess() {
  var mockChromeApi = {};

  asyncTestCase.waitForAsync('Wait for tab hosting a content script to load.');
  wpt.allTests.createTabAndWaitForLoad(
      {url: chrome.extension.getURL("wpt/fakePageUnderTest.html"),
       selected: false},
      function(tab) {
        asyncTestCase.continueTesting();
        var commandRunner = new wpt.commands.CommandRunner(tab.id,
                                                           mockChromeApi);

        // In the real system, there would be a delay between creating the
        // CommandRunner and doing a command.
        window.setTimeout(function() { commandRunner.doClick("id'testClick"); }, 10);

        asyncTestCase.waitForAsync('Sent command to content script,' +
                                   ' wait for ack.');

        commandRunner.InterceptHookForTesting = function(msg) {
          asyncTestCase.continueTesting();
          assertEquals("Success", msg['log']);

          asyncTestCase.waitForAsync('Close the tab');
          chrome.tabs.remove(tab.id, function() {
            asyncTestCase.continueTesting();
          });
        };
      });
}

// Test that click commands starting in the BG page can signal the CS code
// to execute the click on a target that does not exist.  See that an error
// is returned.
function testClickCommandEndToEndFailure() {
  var mockChromeApi = {};

  asyncTestCase.waitForAsync('Wait for tab hosting a content script to load.');
  wpt.allTests.createTabAndWaitForLoad(
      {url: chrome.extension.getURL("wpt/fakePageUnderTest.html"),
       selected: false},
      function(tab) {
        asyncTestCase.continueTesting();
        var commandRunner = new wpt.commands.CommandRunner(tab.id,
                                                           mockChromeApi);

        // In the real system, there would be a delay between creating the
        // CommandRunner and doing a command.
        window.setTimeout(function() {
          commandRunner.doClick("id'doesNotExist");
        }, 10);

        asyncTestCase.waitForAsync('Sent command to content script,' +
                                   ' wait for ack.');

        commandRunner.InterceptHookForTesting = function(msg) {
          asyncTestCase.continueTesting();
          assertEquals("error: Click failed: Could not find DOM element " +
                       "matching target id'doesNotExist", msg['log']);

          asyncTestCase.waitForAsync('Close the tab');
          chrome.tabs.remove(tab.id, function() {
            asyncTestCase.continueTesting();
          });
        };
      });
}

// Test that click commands starting in the BG page can signal the CS code
// to execute a click on a target with two matches.  See that a warning is
// returned.
function testClickCommandEndToEndMultipleTargetMatch() {
  var mockChromeApi = {};

  asyncTestCase.waitForAsync('Wait for tab hosting a content script to load.');
  wpt.allTests.createTabAndWaitForLoad(
      {url: chrome.extension.getURL("wpt/fakePageUnderTest.html"),
       selected: false},
      function(tab) {
        asyncTestCase.continueTesting();
        var commandRunner = new wpt.commands.CommandRunner(tab.id,
                                                           mockChromeApi);

        // In the real system, there would be a delay between creating the
        // CommandRunner and doing a command.
        window.setTimeout(function() {
          commandRunner.doClick("aaaa'bbbb");
        }, 10);

        asyncTestCase.waitForAsync('Sent command to content script,' +
                                   ' wait for ack.');

        var numCallsToInterceptHook = 0;
        commandRunner.InterceptHookForTesting = function(msg) {
          asyncTestCase.continueTesting();

          if (++numCallsToInterceptHook == 1) {
            assertEquals("warning: 2 matches for target \"aaaa'bbbb\".  " +
                         "Using first match.", msg['log']);
            asyncTestCase.waitForAsync('Wait for thr second intercept call.');
          } else if (+numCallsToInterceptHook == 2) {
            assertEquals("Success", msg['log']);
            asyncTestCase.waitForAsync('Close the tab');
            chrome.tabs.remove(tab.id, function() {
              asyncTestCase.continueTesting();
            });
          }
        };
      });
}
