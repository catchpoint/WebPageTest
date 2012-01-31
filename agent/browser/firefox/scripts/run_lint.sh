#!/bin/bash

# Copyright 2012 Google Inc.
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
# Run lint on all JavaScript sources.
#
# Author: Sam Kerner (skerner at google dot com)
#
# Typical usage:
#
# $ scripts/run_lint.sh

# The latest release of the closure linter can be downloaded from
# http://closure-linter.googlecode.com/files/closure_linter-latest.tar.gz
# It includes install instructions using python's easy_install mechanism.
CLOSURE_LINTER=gjslint

# Command to lint javascript code.
LINT_JS="$CLOSURE_LINTER"

# Sources to check.
JS_SOURCES=$(find extension/ -name '*.js')

# Some errors are a pain to fix, and unlikely to show real issues.
# Disable them for now.
#
# E:0131 is 'Single-quoted string preferred over double-quoted string.'
# Because many string constants include a ' as a target separator, we
# are not strict about this rule.

# E:0214 is 'issuing description in @ tag'.  We use @param and @returns
# for type checking, but many values are obvious.  TODO(skerner): Fix
# all instances and enable this.
${LINT_JS} \
  $JS_SOURCES \
  | grep -v 'E:0131' \
  | grep -v 'E:0214' \
