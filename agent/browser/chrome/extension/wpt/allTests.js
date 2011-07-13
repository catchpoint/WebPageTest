goog.require('wpt.commands');
goog.require('goog.testing.jsunit');

goog.provide('wpt.allTest');

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
