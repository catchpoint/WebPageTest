A Node.js based agent that allows WebDriverJS scripts.

= Sources layout:

src/* -- node agent source
src-cov/* -- Instrumented src/*. Generated and used by wpttest.sh -c
test/*_test_*.js -- mocha unit tests
test/jstd/* -- old js test driver tests (superseded by mocha)
wptdriver.* -- *nix/win32 script to run the agent
wpttest.* -- *nix/win32 script to run the unit and BDD tests

= Current state of affairs and missing features:

Node.js agent can successfully complete an entire job.
However, it currently only works with Chrome and instead of entering the url
in the "Website Url" text field on WebPagetest, you have to enter a webdriver
script in the script tab. The most basic script looks like this:
/*
navigate  google.com
*/
driver  = new webdriver.Builder().build();
driver.get('http://www.google.com');
driver.wait(function()  {
return  driver.getTitle();
});
NOTE: there is a required tab between navigate and the url

Open question -- how to deal with it if we run the agent in a browser...

Collect DevTools Timeline events.
Corresponding WPT feature -- show Timeline in the test result,
based on the extracted DevTools Timeline viewer UI (Gabriel Peal).
Currently the Node.js agent collects and saves timeline events and WebPagetest
has the ability to display them in the new timeline viewer, but there is a
problem with the way or name they are saved so the link to display them doesn't
show up in the results

Migrate DevTools JSON collection to the WD logs API, after the test.
That way other browsers could implement it as well via WD.
No need for it to be realtime, we only need it at the very end of the test.
That way we can quickly claim support for all other browsers and have
browser specific DevTools collection code where it belongs -- in WD.

Run the agent in a browser instead of NodeJS. Means reuse WD server, because
have no ability to launch WD server. What to do if WD server crashes?

Integrate with Dummynet (done, untested).
