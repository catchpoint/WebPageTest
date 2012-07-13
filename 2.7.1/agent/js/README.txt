A Node.js based agent that allows WebDriverJS scripts.

= Sources layout:

src/* -- actual implementation
test/*_test.js -- unit tests
test/jstd_nodejs/* -- temp kludges to get JsTestDriver to run Node.js code
jsTestDriver.conf -- config file to give to JsTestDriver
wpt.jstd -- JsTestDriver config to run same tests from the WebStorm IDE

= Current state of affairs and missing features:

Chrome works, but sometimes doesn't quit. Need killpg() or similar.
NodeJS/uv contribution in progress.
Open question -- how to deal with it if we run the agent in a browser...

Collect DevTools Timeline events (done, untested).
Corresponding WPT feature -- show Timeline in the test result,
based on the extracted DevTools Timeline viewer UI (Gabriel Peal).

Migrate DevTools JSON collection to the WD logs API, after the test.
That way other browsers could implement it as well via WD.
No need for it to be realtime, we only need it at the very end of the test.
That way we can quickly claim support for all other browsers and have
browser specific DevTools collection code where it belongs -- in WD.

Run the agent in a browser instead of NodeJS. Means reuse WD server, because
have no ability to launch WD server. What to do if WD server crashes?

Integrate with Dummynet. Rough idea -- via web server same way as WDJS.
