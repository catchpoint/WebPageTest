#!/bin/bash

export WPT_SERVER=http://localhost:8888
export LOCATION=Test
export SRC_PATH="src"
export WPT_VERBOSE=false
export WPT_DEBUG=false
export WPT_MAX_LOGLEVEL=5

while getopts mvds:l:g:c o
do  case "$o" in
  s)  export WPT_SERVER="$OPTARG";;
  l)  export LOCATION="$OPTARG";;
  g)  export tests="$OPTARG";;
  c)  export SRC_PATH="src-cov";;
  m)  export WPT_MAX_LOGLEVEL="$OPTARG";;
  v)  export WPT_VERBOSE=true;;
  d)  export WPT_DEBUG=true;;
  [?])  echo "Usage: $0 [-s server] [-l location] [-v] [-d] [-m level] [-c]"
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
  /*) project_root="$0" ;;
  *)  project_root="$PWD/$0" ;;
esac
while true; do
  if [[ -d "$project_root/webpagetest/agent/js" ]]; then
    break
  fi
  project_root="${project_root%/*}"
  if [[ -z "$project_root" ]]; then
    echo "Cannot determine project root from $0" 1>&2
    exit 2
  fi
done
export PROJECT_ROOT="${project_root}"

export SELENIUM_BUILD="${PROJECT_ROOT}/Selenium/selenium-read-only/build"
agent="${PROJECT_ROOT}/webpagetest/agent/js"
export NODE_PATH="${agent}:${agent}/${SRC_PATH}:${SELENIUM_BUILD}/javascript/webdriver"

if [ -z "${tests}" ]; then
  if [ "$SRC_PATH" = "src-cov" ]; then
    rm -R src-cov
    jscoverage src src-cov
    mocha --reporter html-cov > cov.html
  else
    mocha
  fi
else
  case tests in
    "server") tests="wd_server";;
    "client") tests="wpt_client";;
    "sandbox") tests="wd_sandbox";;
    "all") unset tests;;
    "") unset tests;;
  esac

  if [ "$SRC_PATH" = "src-cov" ]; then
    rm -R src-cov
    jscoverage src src-cov
    mocha --grep $tests --reporter html-cov > cov.html
  else
    mocha --grep $tests
  fi
fi