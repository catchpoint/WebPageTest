#!/bin/bash -eu
# Copyright 2013 Google Inc. All Rights Reserved.
# Author: wrightt@google.com (Todd Wright)

declare server=http://localhost:8888
declare location=Test
declare browser=chrome
declare -a opt_args=()
declare -a https_args=()

usage() {
  cat <<EOF
Usage: $0 [OPTION]...

  -s, --serverUrl URL         WebPagetest server URL.
                              Defaults to 'http://localhost:8888'.

  -i, --insecure              Ignore invalid server certificate
                              Defaults to require valid server certificate

  -k, --clientCert PATH       Path to PFX client certificate. Only supported for https URLs.

  -p, --clientCertPass VALUE  Password for the client certificate specified in the -c option

  -l, --location NAME         Location name for this WebPagetest device.
                              Defaults to 'Test'.

  -b, --browser VALUE         Browser type, which must be one of:
                                chrome       # Local Chrome browser
                                osx          # Chrome Canary on OSX
                                android:DID  # Android device id
                                ios:UDID     # iOS 40-char device id
                              Defaults to 'chrome'.

  -q, --quiet                 Disable verbose logging to stdout.

  -m, --max_log LEVEL         Sets the maximum loglevel that will be saved, where
                              value can either be a number (0-8) or the name of
                              a loglevel such as critical, warning, or debug.
                              Defaults to 'info'.

  --*                         Additional browser arguments, passed verbatim
EOF
  exit 1
}

# Parse args
while [[ $# -gt 0 ]]; do
  OPTION=$1; shift 1
  case "$OPTION" in
  -s | --serverUrl)
     server="$1"; shift 1;;
  -i | --insecure)
      https_args=("${https_args[@]:+${https_args[@]}}" "--insecure" "true");;
  -k | --clientCert)
     https_args=("${https_args[@]:+${https_args[@]}}" "--clientCert" "$1"); shift 1;;
  -p | --clientCertPass)
     https_args=("${https_args[@]:+${https_args[@]}}" "-clientCertPass" "$1"); shift 1;;
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

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
declare agent="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

export NODE_PATH="${agent}:${agent}/src"

# Find the latest platform-specific chromedriver
declare -a chromedrivers=( \
  "$agent/lib/webdriver/chromedriver/$(uname -ms)/chromedriver-"*)
declare chromedriver="${chromedrivers[@]:+${chromedrivers[${#chromedrivers[@]}-1]}}"

case "${browser}" in
  chrome | osx)
    # Select chrome binary
    declare chrome=
    if [[ "$browser" == "osx" ]]; then
      declare -a chromes=( \
         "/Applications/Google Chrome"*".app/Contents/MacOS/Google Chrome"*)
      chrome="${chromes[@]:+${chromes[0]}}"
    fi
    declare -a browser_args=( \
        --browser 'browser_local_chrome.BrowserLocalChrome' \
        ${chromedriver:+--chromedriver "${chromedriver}"} \
        ${chrome:+--chrome "${chrome}"});;
  android:*)
    declare deviceSerial="${browser#*:}"
    declare -a browser_args=( \
        --browser 'browser_android_chrome.BrowserAndroidChrome' \
        --deviceSerial "$deviceSerial" \
        ${chromedriver:+--chromedriver "${chromedriver}"} \
        --captureDir "$agent/lib/capture");;
  ios:*)
    declare deviceSerial="${browser#*:}"
    declare -a url_apps=("$agent/lib/ios/openURL/openURL"*.ipa)
    declare url_app="${url_apps[${#url_apps[@]}-1]}"
    declare -a browser_args=( \
        --browser 'browser_ios.BrowserIos' \
        --deviceSerial "$deviceSerial" \
        --captureDir "$agent/lib/capture" \
        --iosIDeviceDir "$agent/lib/ios/idevice/$(uname -ms)" \
        --iosDevImageDir "$agent/lib/ios/DeviceSupport" \
        --iosSshProxyDir "$agent/lib/ios/usbmux_python_client" \
        --iosVideoDir "$agent/lib/ios/video" \
        ${url_app:+--iosUrlOpenerApp "$url_app"});;
  *)
    echo "Unknown browser type \"${browser}\""
    exit 1;;
esac

cd ${agent}
declare -a cmd=(node --expose-gc src/agent_main \
    --serverUrl ${server} --location ${location} \
    "${https_args[@]:+${https_args[@]}}" \
    "${browser_args[@]:+${browser_args[@]}}" \
    "${opt_args[@]:+${opt_args[@]}}")

echo "${cmd[@]}"
exec "${cmd[@]}"
