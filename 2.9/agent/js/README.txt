A Node.js based agent that allows WebDriverJS scripts.

= Running the agent

./wptdriver.sh (or .bat)

All the runtime dependencies are cross platform and checked in under lib and
node_modules.

= Sources layout

src/* -- node agent source
src-cov/* -- Instrumented src/*. Generated and used by wpttest.sh -c
test/* -- mocha unit tests
wptdriver.{sh,bat} -- *nix/win32 script to run the agent
wpttest.{sh,bat} -- *nix/win32 script to run the unit and BDD tests

= Current state of affairs and missing features

Node.js agent can successfully complete an entire job.
However, it currently only works with Chrome and instead of entering the url
in the "Website Url" text field on WebPagetest, you have to enter a webdriver
script in the script tab. The most basic script looks like this:

driver = new webdriver.Builder().build();
driver.get('http://www.google.com');
driver.wait(function()  {
  return driver.getTitle();
});

Integrate with Dummynet: done (gpeal@), untested.

= Running tests

./wpttest.sh (or .bat) -v -m 10

See the script source for various options.

The tests use Mocha (http://visionmedia.github.com/mocha/) for running
tests, including code coverage collection;
Should.js (https://github.com/visionmedia/should.js) for assertions;
Sinon (https://github.com/cjohansen/sinon.js) for mocking/stubbing.
All of these are checked in under node_modules, plain non-coverage tests
can run from the repo itself, with no external dependencies and nothing
to build.

Coverage uses the JSCoverage library, which is no longer maintained and is
superseded by JSCover. So far -- install jscoverage globally:

  sudo npm install -g jscoverage

This requires automake, which on Mac needs to be installed with "brew install
automake". On Mac there are other issues: 1) jscoverage configure file
specifies am__api_version="1.10", while the current one in brew is 1.12, and
the oldest brew knows is 1.11. So while npm install jscoverage started, but
hasn't yet launched configure, quickly Ctrl-Z it and patch that version
in the configure script. Also, there seems to be a missing directive -lv8,
resulting in link failures -- haven't figured that out yet, but it's
going to be moot after we switch to JSCover.

TODO(klm): switch JSCoverage -> JSCover.

TODO(klm): Revamp test/disabled/wd_server_tests_large.js. Currently they have
too many issues to run.
