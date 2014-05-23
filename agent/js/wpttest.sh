#!/bin/bash -eu
# Copyright 2013 Google Inc. All Rights Reserved.
# Author: wrightt@google.com (Todd Wright)
#
# Run lint, unit tests, and/or code coverage.

export WPT_MAX_LOGLEVEL='error'

usage() {
  cat <<EOF
Usage: $0 [OPTION]...

  -t, --test           Run unit tests.  This is the default unless '-c'
                       and/or '-l' are specified.

  -c, --coverage       Run jscover on unit tests, writes output to "cov.html".

  -l, --lint           Run jshint (with .jshintrc) and gjslint.

  -g, --grep STRING    Filter '-t' and '-c' to only include the tests with
                       "it(...)" descriptions that contain the given string,
                       e.g. 'wd_server'.

  -q, --quiet          Disable verbose logging to stdout.  Enabled by default
                       for '-c'.

  -m, --max_log LEVEL  Sets the maximum loglevel that will be saved, where
                       value can either be a number (0-8) or the name of
                       a loglevel such as critical, warning, or debug.
                       Defaults to 'error'.

  -d, --debug          Enable debug output.
EOF
  exit 1
}

# Parse args
declare spec=
declare cov=
declare tests=
declare lint=
declare debug=
while [[ $# -gt 0 ]]; do
  declare opt="$1"; shift 1
  case "$opt" in
  -g | --grep)
    tests="${1:-*}"
    [[ $# -gt 0 ]] && shift 1;;
  -t | --test)
    spec=true;;
  -c | --coverage)
    cov=true;;
  -l | --lint)
    lint=true;;
  -q | --quiet)
    export WPT_VERBOSE=false;;
  -m | --max_log)
    export WPT_MAX_LOGLEVEL="${1:-null}"
    [[ $# -gt 0 ]] && shift 1;;
  -d | --debug)
    debug=true;;
  -h | --help)
    usage;;
  *) echo "Unknown option: $opt"; exit 1;;
  esac
done
if [[ ! -z "$debug" ]]; then
 set -x
fi

# Set defaults
if [[ -z "$spec" && -z "$cov" && -z "$lint" ]]; then
  spec=true
fi
if [[ "$tests" == '*' || "$tests" == 'all' ]]; then
  tests=
fi

# Set paths, copied from wptdriver.sh
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
declare agent="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

declare -a chromedrivers=("$agent/lib/webdriver/chromedriver/$(uname -ms)/chromedriver-"*)
declare -a chromedriver=(--chromedriver "${chromedrivers[${#chromedrivers[@]}-1]}")
declare src_dir="src${cov:+-cov}"
export NODE_PATH="${agent}:${agent}/src${cov:+-cov}"

export PATH="${agent}/node_modules/.bin:${PATH}"

cd "$agent"

if [[ ! -z "$lint" ]]; then
  if which jshint >/dev/null; then
    jshint src/*.js test/*.js
  else
    echo 'Missing jshint.  To install, run:'
    if ! which npm >/dev/null; then
      if uname -s | grep -iq darwin; then
        echo '  brew install npm'
      else
        echo '  sudo apt-get install npm'
      fi
    fi
    echo '  npm install jshint'
    exit 1
  fi

  if which gjslint >/dev/null; then
    gjslint src/*.js test/*.js
  else
    cat <<"EOF"
Missing gjslint (code.google.com/p/closure-linter).  To install, run:
  svn checkout http://closure-linter.googlecode.com/svn/trunk/ closure-linter
  cd closure-linter
  sudo python ./setup.py install
EOF
    exit 1
  fi
fi

if [[ ! -z "$spec" ]]; then
  mocha --reporter spec ${tests:+--grep "$tests"}
fi

if [[ ! -z "$cov" ]]; then
  if which jscover >/dev/null; then
    export WPT_VERBOSE=false
    [[ -d src-cov ]] && rm -R src-cov
    jscover ${debug:+-v} src src-cov
  else
    echo 'Missing jscover.  To install, run:'
    if uname -s | grep -i darwin; then
      echo '  brew install jscover'
    else
      echo '  sudo apt-get install jscover'
    fi
    exit 1
  fi
  mocha --reporter html-cov ${tests:+--grep "$tests"} > cov.html
  echo 'Wrote cov.html'
fi
