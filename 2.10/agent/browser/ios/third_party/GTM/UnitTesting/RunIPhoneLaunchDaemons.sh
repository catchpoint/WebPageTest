#!/bin/bash
#  RunIPhoneLaunchDaemons.sh
#  Copyright 2010 Google Inc.
#
#  Licensed under the Apache License, Version 2.0 (the "License"); you may not
#  use this file except in compliance with the License.  You may obtain a copy
#  of the License at
#
#  http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
#  License for the specific language governing permissions and limitations under
#  the License.
#
#  Runs all unittests through the iPhone simulator. We don't handle running them
#  on the device. To run on the device just choose "run".

# Starts up securityd for us so that we can access the keychain from our tests.
# Turns out that when you run the simulator without the UI front end, that
# some iPhone launch daemons aren't started correctly.
# This script starts up securityd for us.
# We may need to startup other services in the future.
# This script is launched by launchd.
#
# arg1 - root to the iPhone SDK being used
# arg2 - path to the user directory to use

set -o errexit
set -o nounset
# Uncomment the next line to trace execution.
#set -o verbose

# These both need to be set to the root of the iPhone SDK for iPhone
# apps to be able to find their frameworks.
export DYLD_ROOT_PATH="$1"
export IPHONE_SIMULATOR_ROOT="$1"

# This needs to be set to the user's directory to find preference files.
export CFFIXED_USER_HOME="$2"

"$IPHONE_SIMULATOR_ROOT/usr/libexec/securityd"
