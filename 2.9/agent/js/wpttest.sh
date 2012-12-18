#!/bin/bash

export WPT_SERVER=http://localhost:8888
export LOCATION=Test
export WPT_VERBOSE=false
export WPT_MAX_LOGLEVEL=extra
src_dir="src"

while getopts vds:l:m:g:c o
do  case "$o" in
  s)  export WPT_SERVER="$OPTARG";;
  l)  export LOCATION="$OPTARG";;
  g)  export tests="$OPTARG";;
  c)  export src_dir="src-cov";;
  m)  export WPT_MAX_LOGLEVEL="$OPTARG";;
  v)  export WPT_VERBOSE=true;;
  d)  export WPT_DEBUG=true;;
  [?])  echo "Usage: $0 [-s server] [-l location] [-v] [-d] [-m level] [-c]"
    echo "        -g    test-type    One of: client, server, sandbox"
    echo "        -s    server       WebPagetest server"
    echo "        -l    location     location name of the WebPagetest server"
    echo "        -v    verbose      mirrors all logs to stdout"
    echo "        -d    debug        sets all debug and custom loglevels to -1 so that"
    echo "                           they are guaranteed to display"
    echo "        -m    max loglevel sets the maximum loglevel that will be saved"
    echo "                           the value can either be a number (0-8) or the name"
    echo "                           of a loglevel such as critical, warning, or debug"
    echo "        -c    coverage     enables code coverage. It is not recommended to use"
    echo "                           this with -v as the console output will display on top"
    echo "                           of the coverage analysis."
    echo "                           The coverage will be saved to cov.html"
    echo "                           NOTE: this requires jscoverage to be installed on the path."
    exit 1;;
  esac
done

case "$0" in
  /*) wpt_root="$0" ;;
  *)  wpt_root="$PWD/$0" ;;
esac
while true; do
  if [[ -d "$wpt_root/agent/js/src" ]]; then
    break
  fi
  wpt_root="${wpt_root%/*}"
  if [[ -z "$wpt_root" ]]; then
    echo "Cannot determine project root from $0" 1>&2
    exit 2
  fi
done

# Find the latest version of WDJS
declare -a wdjs_dirs=("${wpt_root}/lib/webdriver/javascript/node-"*)
wdjs_dir="${wdjs_dirs[${#wdjs_dirs[@]}-1]}"

agent="${wpt_root}/agent/js"

# Find the latest version of WD server jar, WDJS, platform-specific chromedriver
declare -a selenium_jars=("${wpt_root}/lib/webdriver/java/selenium-standalone-"*.jar)
export SELENIUM_JAR="${selenium_jars[${#selenium_jars[@]}-1]}"

declare -a chromedrivers=("$wpt_root/lib/webdriver/chromedriver/$(uname -ms)/chromedriver-"*)
export CHROMEDRIVER="${chromedrivers[${#chromedrivers[@]}-1]}"

export NODE_PATH="${agent}:${agent}/${src_dir}:${wdjs_dir}"
export PATH="${agent}/node_modules/.bin:${PATH}"

if [ -z "${tests}" ]; then
  if [ "$src_dir" = "src-cov" ]; then
    rm -R src-cov
    jscoverage src src-cov
    mocha --reporter html-cov > cov.html
  else
    mocha --reporter spec
  fi
else
  case tests in
    "server") tests="wd_server";;
    "client") tests="wpt_client";;
    "sandbox") tests="wd_sandbox";;
    "all") unset tests;;
    "") unset tests;;
  esac

  if [ "$src_dir" = "src-cov" ]; then
    rm -R src-cov
    jscoverage src src-cov
    mocha --reporter html-cov --grep "$tests" > cov.html
  else
    mocha --reporter spec --grep "$tests"
  fi
fi
