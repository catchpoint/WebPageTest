#!/bin/bash

# Copyright (c) 2011, Google Inc.
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
#   * Redistributions of source code must retain the above copyright notice,
#     this list of conditions and the following disclaimer.
#   * Redistributions in binary form must reproduce the above copyright
#     notice, this list of conditions and the following disclaimer in the
#     documentation and/or other materials provided with the distribution.
#   * Neither the name of the <ORGANIZATION> nor the names of its contributors
#     may be used to endorse or promote products derived from this software
#     without specific prior written permission.
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

# Set up a firefox profile with the web page test driver extension.
# This is useful when working on the extension, as it allows the developer
# to re-load and re-test the extension, without rebuilding the project.
#
# Author: Sam Kerner (skerner at google dot com)


## Linux:
PYTHON_EXE=/usr/bin/python
FIREFOX_EXE=/opt/firefox/firefox

##Windows:
#PYTHON_EXE="C:/Python27/python.exe"
#FIREFOX_EXE="C:/Program Files (x86)/Mozilla Firefox/firefox.exe"


DEV_PROFILE_DIR="./dev_profile"

# Set up a profile.  A link to the extension is created, so that
# edits to the source of the extension will be seen when firefox
# restarts, without rebuilding.
"${PYTHON_EXE}" ./profile_setup.py \
  --profile_dir=${DEV_PROFILE_DIR} \
  --profile_zip="firefox5_profile.zip" \
  --extension_dir="./extension" \
  --link_extension \
|| exit $?


# Run firefox with the extension.
"${FIREFOX_EXE}" -profile ${DEV_PROFILE_DIR} -no-remote
