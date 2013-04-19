#!/bin/bash
# PlistCompiler.sh

# Copyright 2010 Google Inc.
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

# Takes a file (usually with a suffix of .plistsrc) and "compiles it" using
# the gcc preprocessor.
# The best way to use PlistCompiler is to add a custom build rule to your target
# in Xcode with the following settings:
# Process: "Source files with names matching:" "*.plistsrc"
# using: "Custom script:"
# "Path/to/PlistCompiler/relative/to/${SRCROOT}'
# with output files:
# ${BUILT_PRODUCTS_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/${INPUT_FILE_BASE}.plist
# You can control the include paths by setting the 
# GTM_PLIST_COMPILER_INCLUDE_PATHS environment variable to a colon delimited
# path string. It defaults to "."


set -o errexit
set -o nounset

PWD=$(pwd)
GTM_PLIST_COMPILER_INCLUDE_PATHS=${GTM_PLIST_COMPILER_INCLUDE_PATHS:=${PWD}}

if [[ $# -ne 2 && $# -ne 0 ]] ; then
  echo "usage: ${0} INPUT OUTPUT" >&2
  exit 1
fi

if [[ $# -eq 2 ]] ; then
  SCRIPT_INPUT_FILE="${1}"
  SCRIPT_OUTPUT_FILE="${2}"
else
  SCRIPT_INPUT_FILE="${INPUT_FILE_PATH}"
  SCRIPT_OUTPUT_FILE="${BUILT_PRODUCTS_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/${INPUT_FILE_BASE}.plist"
fi

# Split up the passed in include paths
SaveIFS=$IFS
IFS=":"

declare -a SPLIT_INCLUDE_PATHS
for a in ${GTM_PLIST_COMPILER_INCLUDE_PATHS};
do
  SPLIT_INCLUDE_PATHS[${#SPLIT_INCLUDE_PATHS[@]}]=-I
  SPLIT_INCLUDE_PATHS[${#SPLIT_INCLUDE_PATHS[@]}]="${a}"
done
IFS=$SaveIFS

NAME=$(basename $0)
TEMP=$(mktemp -t "${NAME}")

# run gcc and strip out lines starting with # that the preprocessor leaves behind.
gcc ${SPLIT_INCLUDE_PATHS[@]} -E -x c "${SCRIPT_INPUT_FILE}" -o "${TEMP}"
sed 's/^#.*//g' "${TEMP}" > "${SCRIPT_OUTPUT_FILE}"
rm -f "${TEMP}"

