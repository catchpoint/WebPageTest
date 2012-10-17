#!/bin/sh
# BuildAllSDKs.sh
#
# This script builds the Tiger, Leopard, SnowLeopard and iPhone versions of the
# requested target in the current basic config (debug, release, debug-gcov).
#
# Copyright 2006-2009 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may not
# use this file except in compliance with the License.  You may obtain a copy
# of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
# License for the specific language governing permissions and limitations under
# the License.

# This scrit runs as the build script, it actually exits having really done no
# build.  Instead it creates and launches and AppleScript that then drives
# Xcode to do the real builds cycling through configurations/projects to get
# everything done.

GTM_PROJECT_TARGET="$1"
GTMIPHONE_PROJECT_TARGET="$2"
STARTING_TARGET="${TARGET_NAME}"
SCRIPT_APP="${TMPDIR}DoBuild.app"

REQUESTED_BUILD_STYLE=$(echo "${BUILD_STYLE}" | sed -E "s/((iPhone.*)|(.*OrLater))-(.*)/\4/")
# See if we were told to clean instead of build.
PROJECT_ACTION="build"
if [ "${ACTION}" == "clean" ]; then
  PROJECT_ACTION="clean"
fi

# get available SDKs and PLATFORMS
AVAILABLE_MACOS_SDKS=`eval ls ${DEVELOPER_SDK_DIR}`
AVAILABLE_PLATFORMS=`eval ls ${DEVELOPER_DIR}/Platforms`

GTMIPHONE_OPEN_EXTRAS=""
GTMIPHONE_BUILD_EXTRAS=""
GTM_OPEN_EXTRAS=""
GTM_BUILD_EXTRAS=""

# build up our GTMiPhone parts
if [ "${GTMIPHONE_PROJECT_TARGET}" != "" ]; then
  AVAILABLE_IPHONE_SDKS=`eval ls ${DEVELOPER_DIR}/Platforms/iPhoneSimulator.platform/Developer/SDKs`
  GTMIPHONE_OPEN_EXTRAS="
    if \"${AVAILABLE_PLATFORMS}\" contains \"iPhoneSimulator.platform\" then
      -- make sure both project files are open
      open posix file \"${SRCROOT}/GTMiPhone.xcodeproj\"
    end if"
  GTMIPHONE_BUILD_EXTRAS="
    if \"${AVAILABLE_PLATFORMS}\" contains \"iPhoneSimulator.platform\" then
      tell project \"GTMiPhone\"
        -- wait for stub build to finish before kicking off the real builds.
        set x to 0
        repeat while currently building
          delay 0.5
          set x to x + 1
          if x > 6 then
            display alert \"GTMiPhone is still building, can't start.\"
            return
          end if
        end repeat
        -- do the GTMiPhone builds
        with timeout of 9999 seconds
          if \"{$AVAILABLE_IPHONE_SDKS}\" contains \"iPhoneSimulator2.0.sdk\" then
            set active target to target \"${GTMIPHONE_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"iPhone2.0-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_IPHONE_SDKS}\" contains \"iPhoneSimulator2.1.sdk\" then
            set active target to target \"${GTMIPHONE_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"iPhone2.1-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_IPHONE_SDKS}\" contains \"iPhoneSimulator2.2.sdk\" then
            set active target to target \"${GTMIPHONE_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"iPhone2.2-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_IPHONE_SDKS}\" contains \"iPhoneSimulator2.2.1.sdk\" then
            set active target to target \"${GTMIPHONE_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"iPhone2.2.1-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_IPHONE_SDKS}\" contains \"iPhoneSimulator3.0.sdk\" then
            set active target to target \"${GTMIPHONE_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"iPhone3.0-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_IPHONE_SDKS}\" contains \"iPhoneSimulator3.1.sdk\" then
            set active target to target \"${GTMIPHONE_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"iPhone3.1-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_IPHONE_SDKS}\" contains \"iPhoneSimulator3.1.2.sdk\" then
            set active target to target \"${GTMIPHONE_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"iPhone3.1.2-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_IPHONE_SDKS}\" contains \"iPhoneSimulator3.1.3.sdk\" then
            set active target to target \"${GTMIPHONE_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"iPhone3.1.3-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_IPHONE_SDKS}\" contains \"iPhoneSimulator3.2.sdk\" then
            set active target to target \"${GTMIPHONE_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"iPhone3.2-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
        end timeout
      end tell
    end if"
fi

# build up our GTMiPhone parts
if [ "${GTM_PROJECT_TARGET}" != "" ]; then
  GTM_OPEN_EXTRAS="
    if \"${AVAILABLE_PLATFORMS}\" contains \"MacOSX.platform\" then
      open posix file \"${SRCROOT}/GTM.xcodeproj\"
    end if"
  GTM_BUILD_EXTRAS="
    if \"${AVAILABLE_PLATFORMS}\" contains \"MacOSX.platform\" then
      tell project \"GTM\"
        -- wait for stub build to finish before kicking off the real builds.
        set x to 0
        repeat while currently building
          delay 0.5
          set x to x + 1
          if x > 6 then
            display alert \"GTM is still building, can't start.\"
            return
          end if
        end repeat
        -- do the GTM builds
        with timeout of 9999 seconds
          if \"{$AVAILABLE_MACOS_SDKS}\" contains \"MacOSX10.4u.sdk\" then
            set active target to target \"${GTM_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"TigerOrLater-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_MACOS_SDKS}\" contains \"MacOSX10.5.sdk\" then
            set active target to target \"${GTM_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"LeopardOrLater-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
          if \"{$AVAILABLE_MACOS_SDKS}\" contains \"MacOSX10.6.sdk\" then
            set active target to target \"${GTM_PROJECT_TARGET}\"
            set buildResult to ${PROJECT_ACTION} using build configuration \"SnowLeopardOrLater-${REQUESTED_BUILD_STYLE}\"
            set active target to target \"${STARTING_TARGET}\"
            if buildResult is not equal to \"Build succeeded\" then
              return
            end if
          end if
        end timeout
      end tell
    end if"
fi

# build up our GTM AppleScript
OUR_BUILD_SCRIPT="on run
  tell application \"Xcode\"
    activate
    ${GTMIPHONE_OPEN_EXTRAS}
    ${GTM_OPEN_EXTRAS}
    ${GTMIPHONE_BUILD_EXTRAS}
    ${GTM_BUILD_EXTRAS}
  end tell
end run"

# Xcode won't actually let us spawn this and run it w/ osascript because it
# watches and waits for everything we have spawned to exit before the build is
# considered done, so instead we compile this to a script app, and then use
# open to invoke it, there by escaping our little sandbox.
#   xcode defeats this: ( echo "${OUR_BUILD_SCRIPT}" | osascript - & )
rm -rf "${SCRIPT_APP}"
echo "${OUR_BUILD_SCRIPT}" | osacompile -o "${SCRIPT_APP}" -x
open "${SCRIPT_APP}"
