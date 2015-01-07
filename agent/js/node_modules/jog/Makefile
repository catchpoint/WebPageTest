
REPORTER = spec

test:
	@./node_modules/.bin/mocha \
		--slow 150 \
		--timeout 1s \
		--reporter $(REPORTER) \
		--require should \
		test/jog.js \
		test/FileStore.js \
		test/RedisStore.js

.PHONY: test