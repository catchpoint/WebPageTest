#!/bin/bash -eu
# Copyright 2013 Google Inc. All Rights Reserved.
# Author: wrightt@google.com (Todd Wright)

declare server=http://localhost:8888
declare location=Test
declare browser=chrome
declare -a opt_args=()

usage() {
  cat <<EOF
Usage: $0 [OPTION]...

  -s, --serverUrl URL  WebPagetest server URL.
                       Defaults to 'http://localhost:8888'.

  -l, --location NAME  Location name for this WebPagetest device.
                       Defaults to 'Test'.

  -b, --browser VALUE  Browser type, which must be one of:
                         chrome       # Local Chrome browser
                         osx          # Chrome Canary on OSX
                         android:DID  # Android device id
                         ios:UDID     # iOS 40-char device id
                       Defaults to 'chrome'.

  -q, --quiet          Disable verbose logging to stdout.

  -m, --max_log LEVEL  Sets the maximum loglevel that will be saved, where
                       value can either be a number (0-8) or the name of
                       a loglevel such as critical, warning, or debug.
                       Defaults to 'info'.

  --*                  Additional browser arguments, passed verbatim
EOF
  exit 1
}

# Parse args
while [[ $# -gt 0 ]]; do
  OPTION=$1; shift 1
  case "$OPTION" in
  -s | --serverUrl)
     server="$1"; shift 1;;
  -l | --location)
     location="$1"; shift 1;;
  -b | --browser | -c)
     browser="$1"; shift 1;;
  -q | --quiet)
     export WPT_VERBOSE=false;;
  -m | --max_log)
    export WPT_MAX_LOGLEVEL="$1"; shift 1;;
  -h | --help)
    usage;;
  --*)
    opt_args=("${opt_args[@]:+${opt_args[@]}}" "$OPTION" "$1"); shift 1;;
  *) echo "Unknown option: $OPTION"; exit 1;;
  esac
done

# Determine parent directory of the webpagetest project
declare wpt_root=
if [ -L $0 ]; then
  wpt_root=$(readlink $0)
else
  case "$0" in
    /*) wpt_root="$0" ;;
    *)  wpt_root="$PWD/$0" ;;
  esac
fi
while [[ ! -d "$wpt_root/agent/js/src" ]]; do
  wpt_root="${wpt_root%/*}"
  if [[ -z "$wpt_root" ]]; then
    echo "Cannot determine project root from $0" 1>&2
    exit 2
  fi
done

declare agent="$wpt_root/agent/js"

# Use the latest WebDriver javascript
declare -a wdjs_dirs=("${wpt_root}/lib/webdriver/javascript/node-"*)
declare wdjs_dir="${wdjs_dirs[${#wdjs_dirs[@]}-1]}"
export NODE_PATH="${agent}:${agent}/src:${wdjs_dir}"
echo "NODE_PATH=$NODE_PATH"

case "${browser}" in 
  chrome | osx)
    # Find the latest, platform-specific Selenium and chromedriver
    declare -a selenium_jars=("${wpt_root}/lib/webdriver/java/selenium-standalone-"*.jar)
    declare selenium_jar="${selenium_jars[@]:+${selenium_jars[${#selenium_jars[@]}-1]}}"
    declare -a chromedrivers=( \
      "$wpt_root/lib/webdriver/chromedriver/$(uname -ms)/chromedriver-"*)
    declare chromedriver="${chromedrivers[@]:+${chromedrivers[${#chromedrivers[@]}-1]}}"
    # Select chrome binary
    declare chrome=
    if [[ "$browser" = "osx" ]]; then
      declare -a chromes=( \
         "/Applications/Google Chrome"*".app/Contents/MacOS/Google Chrome"*)
      chrome="${chromes[@]:+${chromes[${#chromes[@]}-1]}}"
    fi
    declare -a browser_args=( \
        --browser 'browser_local_chrome.BrowserLocalChrome' \
        ${chromedriver:+--chromedriver "${chromedriver}"} \
        ${selenium_jar:+--seleniumJar "${selenium_jar}"} \
        ${chrome:+--chrome "${chrome}"});;
  android:*)
    declare deviceSerial="${browser#*:}"
    declare -a browser_args=( \
        --browser 'browser_android_chrome.BrowserAndroidChrome' \
        --deviceSerial "$deviceSerial" \
        --captureDir "$wpt_root/lib/capture");;
  ios:*)
    declare deviceSerial="${browser#*:}"
    declare -a url_apps=("$wpt_root/lib/ios/openURL/openURL"*.ipa)
    declare url_app="${url_apps[${#url_apps[@]}-1]}"
    declare -a browser_args=( \
        --browser 'browser_ios.BrowserIos' \
        --deviceSerial "$deviceSerial" \
        --captureDir "$wpt_root/lib/capture" \
        --iosIDeviceDir "$wpt_root/lib/ios/idevice/$(uname -ms)" \
        --iosDevImageDir "$wpt_root/lib/ios/DeviceSupport" \
        --iosSshProxyDir "$wpt_root/lib/ios/usbmux_python_client" \
        ${url_app:+--iosUrlOpenerApp "$url_app"});;
  *)
    echo "Unknown browser type \"${browser}\""
    exit 1;;
esac

cd ${agent}
declare -a cmd=(node src/agent_main \
    --serverUrl ${server} --location ${location} \
    "${browser_args[@]:+${browser_args[@]}}" \
    "${opt_args[@]:+${opt_args[@]}}")

echo "${cmd[@]}"
exec "${cmd[@]}"
