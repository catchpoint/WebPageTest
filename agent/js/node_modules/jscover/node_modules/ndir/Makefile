SRC = $(shell find lib -type f -name "*.js")
TESTS = test/*.js
TESTTIMEOUT = 5000
REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) --timeout $(TESTTIMEOUT) $(TESTS)

test-cov:
	@rm -rf lib-cov
	@jscoverage lib lib-cov
	@NDIR_COV=1 $(MAKE) test REPORTER=dot
	@NDIR_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

.PHONY: test test-cov
