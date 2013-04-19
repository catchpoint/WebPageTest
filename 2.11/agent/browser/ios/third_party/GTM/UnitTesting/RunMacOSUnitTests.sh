#!/bin/bash
#
#  RunMacOSUnitTests.sh
#  Copyright 2008 Google Inc.
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
#  Run the unit tests in this test bundle.
#  Set up some env variables to make things as likely to crash as possible.
#  See http://developer.apple.com/technotes/tn2004/tn2124.html for details.
#

set -o errexit
set -o nounset
# Uncomment the next line to trace execution.
#set -o verbose

# Controlling environment variables:
#
# GTM_DISABLE_ZOMBIES -
#   Set to a non-zero value to turn on zombie checks. You will probably
#   want to turn this off if you enable leaks.
GTM_DISABLE_ZOMBIES=${GTM_DISABLE_ZOMBIES:=0}

# GTM_ENABLE_LEAKS -
#   Set to a non-zero value to turn on the leaks check. You will probably want
#   to disable zombies, otherwise you will get a lot of false positives.
GTM_ENABLE_LEAKS=${GTM_ENABLE_LEAKS:=0}

# GTM_LEAKS_SYMBOLS_TO_IGNORE
#   List of comma separated symbols that leaks should ignore. Mainly to control
#   leaks in frameworks you don't have control over.
#   Search this file for GTM_LEAKS_SYMBOLS_TO_IGNORE to see examples.
#   Please feel free to add other symbols as you find them but make sure to
#   reference Radars or other bug systems so we can track them.
GTM_LEAKS_SYMBOLS_TO_IGNORE=${GTM_LEAKS_SYMBOLS_TO_IGNORE:=""}

# GTM_DO_NOT_REMOVE_GCOV_DATA
#   By default before starting the test, we remove any *.gcda files for the
#   current project build configuration so you won't get errors when a source
#   file has changed and the gcov data can't be merged.
#   We remove all the gcda files for the  current configuration for the entire
#   project so that if you are building a test bundle to test another separate
#   bundle we make sure to clean up the files for the test bundle and the bundle
#   that you are testing.
#   If you DO NOT want this to occur, set GTM_DO_NOT_REMOVE_GCOV_DATA to a
#   non-zero value.
GTM_DO_NOT_REMOVE_GCOV_DATA=${GTM_DO_NOT_REMOVE_GCOV_DATA:=0}

# GTM_REMOVE_TARGET_GCOV_ONLY
#   By default all *.gcda files are removed form the project.  Setting this to
#   1 causes only the *.gcda files for the target to be removed.
#   If GTM_DO_NOT_REMOVE_GCOV_DATA is set, this has no effect.
GTM_REMOVE_TARGET_GCOV_ONLY=${GTM_REMOVE_TARGET_GCOV_ONLY:=0}

# GTM_ONE_TEST_AT_A_TIME
#   By default your tests run how ever parallel your projects/targets are
#   setup.  Setting this to 1 will cause only one to run at a time, this is
#   useful if you are doing UI tests with the helper that controls the
#   colorsync profile, or any other machine wide state.
GTM_ONE_TEST_AT_A_TIME=${GTM_ONE_TEST_AT_A_TIME:=0}

ScriptDir=$(dirname "$(echo $0 | sed -e "s,^\([^/]\),$(pwd)/\1,")")
ScriptName=$(basename "$0")
ThisScript="${ScriptDir}/${ScriptName}"

GTMXcodeNote() {
  echo ${ThisScript}:${1}: note: GTM ${2}
}

# Helper that works like the linux flock util, so you can run something, but
# have only one run at a time.
MaybeFlock() {
  if [ $GTM_ONE_TEST_AT_A_TIME -ne 0 ]; then
    GTMXcodeNote ${LINENO} "Serializing test execution."
    python -c "import fcntl, subprocess, sys
file = open('$TMPDIR/GTM_one_test_at_a_time', 'a')
fcntl.flock(file.fileno(), fcntl.LOCK_EX)
sys.exit(subprocess.call(sys.argv[1:]))" "${@}"
  else
    GTMXcodeNote ${LINENO} "Allowing parallel test execution."
    "${@}"
  fi
}

# The workaround below is due to
# Radar 6248062 otest won't run with MallocHistory enabled under rosetta
# Basically we go through and check what architecture we are running on
# and which architectures we can support
AppendToSymbolsLeaksShouldIgnore() {
  if [ "${GTM_LEAKS_SYMBOLS_TO_IGNORE}" = "" ]; then
    GTM_LEAKS_SYMBOLS_TO_IGNORE="${1}"
  else
    GTM_LEAKS_SYMBOLS_TO_IGNORE="${GTM_LEAKS_SYMBOLS_TO_IGNORE}, ${1}"
  fi
}

AppendToLeakTestArchs() {
  if [ "${LEAK_TEST_ARCHS}" = "" ]; then
    LEAK_TEST_ARCHS="${1}"
  else
    LEAK_TEST_ARCHS="${LEAK_TEST_ARCHS} ${1}"
  fi
}

AppendToNoLeakTestArchs() {
  if [ "${NO_LEAK_TEST_ARCHS}" = "" ]; then
    NO_LEAK_TEST_ARCHS="${1}"
  else
    NO_LEAK_TEST_ARCHS="${NO_LEAK_TEST_ARCHS} ${1}"
  fi
}

UpdateArchitecturesToTest() {
  case "${NATIVE_ARCH_ACTUAL}" in
    ppc)
      if [ "${1}" = "ppc" ]; then
        AppendToLeakTestArchs "${1}"
      fi
      ;;

    ppc64)
      if [ "${1}" = "ppc" -o "${1}" = "ppc64" ]; then
        AppendToLeakTestArchs "${1}"
      fi
      ;;

    i386)
      if [ "${1}" = "i386" ]; then
        AppendToLeakTestArchs "${1}"
      elif [ "${1}" = "ppc" ]; then
        AppendToNoLeakTestArchs "${1}"
      fi
      ;;

    x86_64)
      if [ "${1}" = "i386" -o "${1}" = "x86_64" ]; then
        AppendToLeakTestArchs "${1}"
      elif [ "${1}" = "ppc" -o "${1}" = "ppc64" ]; then
        AppendToNoLeakTestArchs "${1}"
      fi
      ;;

    *)
      echo "RunMacOSUnitTests.sh Unknown native architecture: ${NATIVE_ARCH_ACTUAL}"
      exit 1
      ;;
  esac
}

SetMemoryVariables() {
  # Jack up some memory stress so we can catch more bugs.

  # This is done via a helper so it can be invoked in two places at the
  # last possible moment to avoid the variables causing tracing from other
  # processes that are invoked along the way.

  if [ $GTM_DISABLE_ZOMBIES -eq 0 ]; then
    GTMXcodeNote ${LINENO} "Enabling zombies"
    # CFZombieLevel disabled because it doesn't play well with the
    # security framework
    # export CFZombieLevel=3
    export NSZombieEnabled=YES
  fi

  export MallocScribble=YES
  export MallocPreScribble=YES
  export MallocGuardEdges=YES
  export NSAutoreleaseFreedObjectCheckEnabled=YES

  # Turn on the mostly undocumented OBJC_DEBUG stuff.
  export OBJC_DEBUG_FRAGILE_SUPERCLASSES=YES
  export OBJC_DEBUG_UNLOAD=YES
  # Turned off due to the amount of false positives from NS classes.
  # export OBJC_DEBUG_FINALIZERS=YES
  export OBJC_DEBUG_NIL_SYNC=YES
}

RunTests() {
  if [ "${CURRENT_ARCH}" = "" ]; then
    CURRENT_ARCH=`arch`
  fi

  if [ "${ONLY_ACTIVE_ARCH}" = "YES" ]; then
    ARCHS="${CURRENT_ARCH}"
  fi

  if [ "${ARCHS}" = "" ]; then
    ARCHS=`arch`
  fi

  if [ "${VALID_ARCHS}" = "" ]; then
    VALID_ARCHS=`arch`
  fi

  if [ "${NATIVE_ARCH_ACTUAL}" = "" ]; then
    NATIVE_ARCH_ACTUAL=`arch`
  fi

  LEAK_TEST_ARCHS=""
  NO_LEAK_TEST_ARCHS=""

  for TEST_ARCH in ${ARCHS}; do
    for TEST_VALID_ARCH in ${VALID_ARCHS}; do
      if [ "${TEST_VALID_ARCH}" = "${TEST_ARCH}" ]; then
        UpdateArchitecturesToTest "${TEST_ARCH}"
      fi
    done
  done

  # These are symbols that leak on OS 10.5.5
  # radar 6247293 NSCollatorElement leaks in +initialize.
  AppendToSymbolsLeaksShouldIgnore "+[NSCollatorElement initialize]"
  # radar 6247911 The first call to udat_open leaks only on x86_64
  AppendToSymbolsLeaksShouldIgnore "icu::TimeZone::initDefault()"
  # radar 6263983 +[IMService allServices] leaks
  AppendToSymbolsLeaksShouldIgnore "-[IMServiceAgentImpl allServices]"
  # radar 6264034 +[IKSFEffectDescription initialize] Leaks
  AppendToSymbolsLeaksShouldIgnore "+[IKSFEffectDescription initialize]"
  # radar 7598715 Leak when creating new NSColor using lab color space.
  AppendToSymbolsLeaksShouldIgnore "CMSSetLabCLUT"

  # Running leaks on architectures that support leaks.
  export MallocStackLogging=YES
  export GTM_LEAKS_SYMBOLS_TO_IGNORE="${GTM_LEAKS_SYMBOLS_TO_IGNORE}"
  ARCHS="${LEAK_TEST_ARCHS}"
  VALID_ARCHS="${LEAK_TEST_ARCHS}"
  GTMXcodeNote ${LINENO} "Leak checking enabled for $ARCHS. Ignoring leaks from $GTM_LEAKS_SYMBOLS_TO_IGNORE."
  SetMemoryVariables
  MaybeFlock "${SYSTEM_DEVELOPER_DIR}/Tools/RunUnitTests"

  # Running leaks on architectures that don't support leaks.
  unset MallocStackLogging
  unset GTM_ENABLE_LEAKS
  ARCHS="${NO_LEAK_TEST_ARCHS}"
  VALID_ARCHS="${NO_LEAK_TEST_ARCHS}"
  GTMXcodeNote ${LINENO} "Leak checking disabled for $ARCHS due to no support for leaks on platform".
  MaybeFlock "${SYSTEM_DEVELOPER_DIR}/Tools/RunUnitTests"
}

if [ ! $GTM_DO_NOT_REMOVE_GCOV_DATA ]; then
  GTM_GCOV_CLEANUP_DIR="${CONFIGURATION_TEMP_DIR}"
  if [ $GTM_REMOVE_TARGET_GCOV_ONLY ]; then
    GTM_GCOV_CLEANUP_DIR="${OBJECT_FILE_DIR}-${CURRENT_VARIANT}"
  fi
  if [ "${GTM_GCOV_CLEANUP_DIR}" != "-" ]; then
    if [ -d "${GTM_GCOV_CLEANUP_DIR}" ]; then
      GTMXcodeNote ${LINENO} "Removing gcov data files from ${GTM_GCOV_CLEANUP_DIR}"
      (cd "${GTM_GCOV_CLEANUP_DIR}" && \
        find . -type f -name "*.gcda" -print0 | xargs -0 rm -f )
    fi
  fi
fi

# If leaks testing is enabled, we have to go through our convoluted path
# to handle architectures that don't allow us to do leak testing.
if [ $GTM_ENABLE_LEAKS -ne 0 ]; then
  RunTests
else
  GTMXcodeNote ${LINENO} "Leak checking disabled."
  SetMemoryVariables
  MaybeFlock "${SYSTEM_DEVELOPER_DIR}/Tools/RunUnitTests"
fi
