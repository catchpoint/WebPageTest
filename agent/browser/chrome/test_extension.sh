#!/bin/bash

# This script runs tests on the extension used by WebPageTest
# to drive chrome.
#
# Closure compiler is run to catch syntax errors.  The output is
# not used.
#
# If closure compiler does not find and errors, chrome is run with
# a clean profile.  The extension is loaded unpacked.  User can
# see if any errors are flaged as the extension is loaded using
# the developer tools, and run unit tests using the browser action.
#
# Typical Usage:
# $ cd wpt/webpagetest/agent/browser/chrome/extension
# $ ../test_extension.sh
#   (((COMPILE ERROR))) -> fix it
# $ ../test_extension.sh
#   (((Chrome launches))) -> Run unit tests, they fail.  Fix them.
# $ ../test_extension.sh
#   (((Chrome launches))) -> Run unit tests, they pass.  Success!
#
# TODO(skerner): It would be nice to be able to set the initial
# state of chrome.  For example, enabling developer mode and
# setting a localstore key to trigger tests would save the user
# a few clicks.  The master prefs feature could be used to set
# prefs.  and sqlite python
# binding could be used to do the setup.
#
# Author: Sam Kerner (skerner at google dot com)

# The latest release of closure compiler can be downloaded from
# http://closure-compiler.googlecode.com/files/compiler-latest.zip
CLOSURE_COMPILER_JAR=${HOME}/closure/compiler.jar

# Path to chromium or chrome.
CHROME='google-chrome'

# Path to a temp directory.
TEMP="/tmp/test_extension/$$"

# Command to check js sources for syntax and type errors.
COMPILE_JS="third_party/closure-library/closure/bin/build/closurebuilder.py
  --root=third_party/closure-library/
  --root=wpt
  --compiler_jar=${CLOSURE_COMPILER_JAR}
  --compiler_flags=--warning_level=VERBOSE
  --compiler_flags=--externs=../externs.js
  --output_mode=compiled
  --output_file=/dev/null"


# Compile the background page.
${COMPILE_JS} \
  --input='wpt/background.js' \
  || exit $?;

# Compile the content script.
${COMPILE_JS} \
  --input='wpt/script.js' \
  || exit $?;

# Compile unit tests.
${COMPILE_JS} \
  --input='wpt/allTests.js' \
  || exit $?;


# Launch chrome, load the extension.
mkdir -p ${TEMP} || exit "Can't create temp dir";
USER_DATA_DIR="${TEMP}/user_data/";
echo "User data dir is ${USER_DATA_DIR}.";

${CHROME} \
  --user-data-dir=${USER_DATA_DIR} \
  --no-first-run \
  --load-extension=. \
  --new-window 'chrome://extensions' \
  --no-experiments \
  --no-default-browser-check \
  --password-store=basic \
  --disable-extensions-file-access-check \

echo "Chrome exited with status code $?";
