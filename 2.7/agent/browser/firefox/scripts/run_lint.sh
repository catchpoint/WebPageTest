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
