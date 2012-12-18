#!/bin/bash
#
# Copyright (c) 2012, Google Inc.
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
#    * Redistributions of source code must retain the above copyright notice,
#      this list of conditions and the following disclaimer.
#    * Redistributions in binary form must reproduce the above copyright notice,
#      this list of conditions and the following disclaimer in the documentation
#      and/or other materials provided with the distribution.
#    * Neither the name of the <ORGANIZATION> nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#
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
