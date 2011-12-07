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
#   $ agent/browser/chrome/extension/test_extension.sh
#     ...
#     [Closure gives compiler errors.]
#     [Fix them.]
#     ...
#   $ agent/browser/chrome/extension/test_extension.sh
#     ...
#     [Chrome launches.]
#     [Click on extension icon to run unit tests. They fail.]
#     [Fix them.]
#     ...
#   $ agent/browser/chrome/extension/test_extension.sh
#     ...
#     [Chrome launches.]
#     [Run unit tests, they pass.]
#     [Success!]
#     ...
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

# Command to invoke closure compiler.
COMPILE_JS="third_party/closure-library/closure/bin/build/closurebuilder.py
  --root=third_party/closure-library/
  --root=wpt
  --compiler_jar=${CLOSURE_COMPILER_JAR}
  --compiler_flags=--warning_level=VERBOSE
  --compiler_flags=--externs=third_party/closure-compiler/contrib/externs/chrome_extensions.js \
  --compiler_flags=--externs=third_party/closure-compiler/contrib/externs/webkit_console.js \
  --compiler_flags=--externs=third_party/closure-compiler/contrib/externs/json.js \
  --compiler_flags=--externs=../externs.js \
"

# Extra args to do linting, and ignore the compiled output.
FOR_WARNINGS="\
  --output_mode=compiled \
  --output_file=/dev/null \
"

# Extra args to concatinate the required sources into a single file.
FOR_RELEASE="\
  --output_mode=script \
"

cd $(dirname $0)/extension

# Compile the logging code.
${COMPILE_JS} ${FOR_WARNINGS} \
  --input='wpt/logging.js' \
  || exit $?;

# Compile the command runner.
${COMPILE_JS} ${FOR_WARNINGS}\
  --input='wpt/commands.js' \
  || exit $?;

# Compile the background page.
${COMPILE_JS} ${FOR_WARNINGS}\
  --input='wpt/background.js' \
  || exit $?;

# Compile the content script.
${COMPILE_JS} ${FOR_WARNINGS}\
  --input='wpt/script.js' \
  || exit $?;

# Compile unit tests.
${COMPILE_JS} ${FOR_WARNINGS}\
  --input='wpt/allTests.js' \
  || exit $?;


# Create a release copy of the extension, with only the parts of closure we use.
touch release
rm -rf release.last
mv release release.last
mkdir -p 'release/wpt'

${COMPILE_JS} ${FOR_RELEASE} \
  --input='wpt/allTests.js' \
  --output_file='release/wpt/allTests.js' \
  || exit $?;

# Don't compile the content script or the browser action popup script.
cp wpt/script.js release/wpt/script.js
cp wpt/browserActionPopup.js release/wpt/browserActionPopup.js

${COMPILE_JS} ${FOR_RELEASE} \
  --input='wpt/background.js' \
  --output_file='release/wpt/background.js' \
  || exit $?;

cp manifest.json release/
cp wpt/*.html release/wpt/
cp wpt/*.jpg release/wpt/


# Launch chrome, load the release extension.
mkdir -p ${TEMP} || exit "Can't create temp dir";
USER_DATA_DIR="${TEMP}/user_data/";
echo "User data dir is ${USER_DATA_DIR}.";

${CHROME} \
  --user-data-dir="${USER_DATA_DIR}" \
  --no-proxy-server \
  --no-first-run \
  --no-default-browser-check \
  --enable-experimental-extension-apis \
  --load-extension=release \
  --no-experiments \
  --password-store=basic \
  --disable-extensions-file-access-check \
  about:blank

echo "Chrome exited with status code $?";
