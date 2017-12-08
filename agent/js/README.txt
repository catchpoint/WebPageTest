A Node.js based agent that allows WebDriverJS scripts.

Tested with NodeJS 0.8.16 and 0.8.21 on OSX 10.8 and Ubuntu 12.10 Quantal.
Does not work with NodeJS 0.6.x.

The current ChromeDriver version is 2.4, supporting Chrome 29-32.

On Linux use https://launchpad.net/~chris-lea/+archive/node.js/+packages,
ones that come with distros tend to be too old (e.g. 0.6 with Ubuntu Quantal).

Works even on BSD with some caveats, mainly replace #!/bin/bash with #!/bin/sh
in wptdriver.sh and wpttest.sh scripts.

Should work just fine on Windows, but testing on Windows is sporadic.

= Running the agent

./wptdriver.sh (or .bat)

All the runtime dependencies are cross platform and checked in under lib and
node_modules.

If filing a bug, run wptdriver.sh (or .bat) -m 10 -v to produce a verbose log
and attach full output, debug.log, and preferably a zip of the WPT results
directory from the server.

= Sources layout

src/* -- node agent source
src-cov/* -- Instrumented src/*. Generated and used by wpttest.sh -c
test/* -- mocha unit tests
wptdriver.{sh,bat} -- *nix/win32 script to run the agent
wpttest.{sh,bat} -- *nix/win32 script to run the unit and BDD tests

= Current state of affairs and missing features

Node.js agent can successfully complete an entire job.
However, it currently only works with Chrome. Supports a URL and WD script.
The most basic script looks like this:

driver = new webdriver.Builder().build();
driver.get('http://www.google.com');
driver.wait(function()  {
  return driver.getTitle();
});

= Running tests

./wpttest -l  # Run lint, please clean up any issues.
./wpttest.sh (or .bat) -d -m 10  # -g <regexp> to run a subset of tests.

See the script source for various options.

In the tests, timers are faked out, and tests *must not* use the async "done"
callback variation that Mocha allows. Everything is deterministic,
with the test responsible for explicitly advancing the fake clock.

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
