#!/bin/bash

server=http://localhost:8888
location=Test

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
