A Node.js based agent that allows WebDriverJS scripts.

Sources layout:

src/* -- actual implementation
test/*_test.js -- unit tests
test/jstd_nodejs -- temp kludges to get JsTestDriver to run Node.js code
jsTestDriver.conf -- config file to give to JsTestDriver
wpt.jstd -- JsTestDriver config to run same tests from the WebStorm IDE
