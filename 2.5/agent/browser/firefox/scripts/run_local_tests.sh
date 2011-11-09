#
# Copyright 2011 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Run firefox with a clean profile.  The webpagetest driver extension is
# installed using a link, so that edits to the extension show up right
# away.
#
# Author: Sam Kerner (skerner at google dot com)
#
# Typical usage:
#  * Set run_fake_commands to true in overlay.js .
#  * Build a list of fake commands by editing fakeCommandSource.js .
#  * ./run_local_tests.sh (this script)
#  * Watch firefox run the commands, without communicating with the driver.

PROFILE="${PWD}/test_profile"

rm -rf ${PROFILE}
mkdir  ${PROFILE}

cp prefs.js ${PROFILE}/prefs.js

# user.js allows us to set prefs for testing only:
touch ${PROFILE}/user.js
echo 'user_pref("browser.dom.window.dump.enabled", true);' >> ${PROFILE}/user.js

mkdir  ${PROFILE}/extensions
echo "${PWD}/extension/" > "${PROFILE}/extensions/wptdriver@webpagetest.org"

tree ${PROFILE}


/opt/firefox/firefox -profile ${PROFILE} -no-remote about:blank
