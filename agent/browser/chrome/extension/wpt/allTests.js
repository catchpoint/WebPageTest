goog.require('wpt.commands');
goog.require('wpt.contentScript');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.AsyncTestCase');

goog.provide('wpt.allTests');

/**
 * Test the setcookie command.
 */
function testSetCookie() {
  var cookieLog;
  var commandRunner = new wpt.commands.CommandRunner({
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
  var actual = wpt.contentScript.findDomElements_(
      root, "name'thitNameHasMultipleMatches");
  assertEquals("Two elements with name thisNameHasMultipleMatches",
               2, actual.length);
  assertEquals("Should be an anchor tag.",
               "First named anchor", actual[0].innerText);
  assertEquals("Should be an anchor tag.",
               "Second named anchor", actual[1].innerText);
}
