#!/bin/bash

server=http://localhost:8888
location=Test
export WPT_VERBOSE=false
export WPT_MAX_LOGLEVEL=5
export WPT_DEBUG=false

while getopts vds:l:m: o
do  case "$o" in
  s)  server="$OPTARG";;
  l)  location="$OPTARG";;
  m)  export WPT_MAX_LOGLEVEL="$OPTARG";;
  v)  export WPT_VERBOSE="true";;
  d)  export WPT_DEBUG=true;;
  [?])  echo "Usage: $0 [-s server] [-l location] [-v] [-d] [-m]"
    echo "        -s    server       WebPagetest server"
    echo "        -l    location     location name of the WebPagetest server"
    echo "        -v    verbose      mirrors all logs to stdout"
    echo "        -d    debug        sets all debug and custom loglevels to -1 so that"
    echo "                           they are guaranteed to display"
    echo "        -m    max loglevel sets the maximum loglevel that will be saved"
    echo "                           the value can either be a number (0-8) or the name"
    echo "                           of a loglevel such as critical, warning, or debug"
    exit 1;;
  esac
done
shift $OPTIND-1

# Determine parent directory of the webpagetest project
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

agent="$project_root/webpagetest/agent/js"
devtools2har_jar="$project_root/webpagetest/lib/dt2har/target/dt2har-1.0-SNAPSHOT-jar-with-dependencies.jar"
selenium_build="$project_root/Selenium/selenium-read-only/build"

export NODE_PATH="${agent}:${agent}/src:${selenium_build}/javascript/webdriver"
echo "NODE_PATH=$NODE_PATH"

declare -a cmd=(node src/agent_main --wpt_server ${server} --location ${location} --chromedriver "$selenium_build/chromedriver" --selenium_jar "$selenium_build/java/server/src/org/openqa/grid/selenium/selenium-standalone.jar" --devtools2har_jar="$devtools2har_jar")

echo "${cmd[@]}"
"${cmd[@]}"
