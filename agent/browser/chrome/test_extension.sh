#!/bin/bash

# This script runs tests on the extension used by WebPageTest
# to drive chrome.
#
# Closure compiler is run to catch syntax errors.  The output is
# not used.
#
# If closure compiler does not find and errors, chrome is run with
# a clean profile.  The extension is loaded unpacked.  User can
# see if any errors are flaged as the extension is
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

java -jar ${CLOSURE_COMPILER_JAR} \
 --js              extension/background.js \
 --js_output_file  /dev/null \
 --warning_level VERBOSE \
 --externs externs.js \
  || exit "Closure compiler returned $?";

java -jar ${CLOSURE_COMPILER_JAR} \
 --js              extension/script.js \
 --js_output_file  /dev/null \
 --warning_level VERBOSE \
 --externs externs.js \
  || exit "Closure compiler returned $?";

mkdir -p ${TEMP} || (echo "Can't create temp dir"; exit 1)

USER_DATA_DIR="${TEMP}/user_data/";
echo "User data dir is ${USER_DATA_DIR}.";

${CHROME} \
  --user-data-dir=${USER_DATA_DIR} \
  --no-first-run \
  --load-extension=extension \
  --new-window 'chrome://extensions' \
  --no-experiments \
  --no-default-browser-check \
  --password-store=basic \
  --disable-extensions-file-access-check \

echo "Chrome exited with status code $?";
