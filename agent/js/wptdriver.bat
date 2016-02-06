@echo off
rem Copyright 2013 Google Inc. All Rights Reserved.
rem Author: wrightt@google.com (Todd Wright)
rem
rem TODO update to match wptdriver.sh

set AGENT=%~dp0
set DP0=%~dp0
set WPT_SERVER=http://localhost:8888
set LOCATION=Test
set BROWSER=chrome
set "WPT_MAX_LOGLEVEL=error"
set "WPT_VERBOSE=true"
set "OPT_ARGS="
set "HTTPS_ARGS="
set "BATCH_NAME=%0"
shift

:loop
if NOT "%~0"=="" (
    set "MATCHED="
    set "TRUE="
    if "%~0"=="-s" set TRUE=1
    if "%~0"=="--serverUrl" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set WPT_SERVER=%1
        shift
        shift
    )
    set "TRUE="
    if "%~0"=="-i" set TRUE=1
    if "%~0"=="--insecure" set TRUE=1
    if defined TRUE (
        set "HTTPS_ARGS=%HTTPS_ARGS% --insecure true"
        set MATCHED=1
        shift
    )
    set "TRUE="
    if "%~0"=="-k" set TRUE=1
    if "%~0"=="--clientCert" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set "HTTPS_ARGS=%HTTPS_ARGS% --clientCert %1"
        shift
        shift
    )
    set "TRUE="
    if "%~0"=="-p" set TRUE=1
    if "%~0"=="--clientCertPass" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set "HTTPS_ARGS=%HTTPS_ARGS% --clientCertPass %1"
        shift
        shift
    )
    set "TRUE="
    if "%~0"=="-l" set TRUE=1
    if "%~0"=="--location" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set LOCATION=%1
        shift
        shift
    )
    set "TRUE="
    if "%~0"=="-b" set TRUE=1
    if "%~0"=="-c" set TRUE=1
    if "%~0"=="--browser" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set BROWSER=%1
        shift
        shift
    )
    set "TRUE="
    if "%~0"=="-q" set TRUE=1
    if "%~0"=="--quiet" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set WPT_VERBOSE=false
        shift
    )
    set "TRUE="
    if "%~0"=="-m" set TRUE=1
    if "%~0"=="--max_log" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set "WPT_MAX_LOGLEVEL=%1"
        shift
        shift
    )
    set "TRUE="
    if "%~0"=="-h" set TRUE=1
    if "%~0"=="--help" set TRUE=1
    if defined TRUE (
      set MATCHED=1
      echo Usage: %BATCH_NAME% [options]...
      echo.
      echo         -s, --serverUrl URL         URL of the local server that the agent will connect to
      echo                                     Defaults to 'http://localhost:8888'.
      echo.
      echo         -i, --insecure              Ignore invalid server certificate
      echo                                     Defaults to require valid server certificate
      echo.
      echo         -k, --clientCert PATH       Path to PFX client certificate. Only supported for https URLs.
      echo.
      echo         -p, --clientCertPass VALUE  Password for the client certificate specified in the -c option
      echo.
      echo         -l, --location NAME         Location name for this WebPagetest device.
      echo                                     Defaults to 'Test'.
      echo.
      echo         -b, --browser VALUE         Browser type, which must be one of:
      echo                                     chrome       # Local Chrome browser
      echo                                     android:DID  # Android device id
      echo                                     Defaults to 'chrome'.
      echo.
      echo         -q, --quiet                 Disable verbose logging to stdout.
      echo.
      echo         -m, --max_log LEVEL         Sets the maximum loglevel that will be saved, where
      echo                                     value can either be a number ^(0-8^) or the name of
      echo                                     a loglevel such as critical, warning, or debug.
      echo                                     Defaults to 'info'.
      echo.
      echo     More information at https://sites.google.com/a/webpagetest.org/docs/private-instances/node-js-agent/setup#TOC-Start-the-agent
      echo.
      cd %DP0%
      goto :eof
    )
    if NOT defined MATCHED (
      set "OPT_ARGS=%OPT_ARGS% %0"
      shift
    )
    goto :loop
)

rem Find the latest version of WD server jar, WDJS, platform-specific chromedriver
for %%J in (%AGENT%\lib\webdriver\java\selenium-standalone-*.jar) do set SELENIUM_JAR=%%J

for %%E in (%AGENT%\lib\webdriver\chromedriver\Win32\chromedriver-*.exe) do set CHROMEDRIVER=%%E
if defined CHROMEDRIVER set "CHROMEDRIVER_ARGS= --chromedriver ^"%CHROMEDRIVER%^""

set "NODE_PATH=%AGENT%;%AGENT%\src"

rem First, split the browser string into it's browser:device components
set "DEVICE_SERIAL=%BROWSER:*:=%"
set "BROWSER=%BROWSER::="^&REM #%

rem Configure the browser options
set "KNOWN_BROWSER="
if "%BROWSER%"=="chrome" (
  set KNOWN_BROWSER=1
  set "BROWSER_ARGS= --browser browser_local_chrome.BrowserLocalChrome%CHROMEDRIVER_ARGS%"
)
if "%BROWSER%"=="android" (
  set KNOWN_BROWSER=1
  set "BROWSER_ARGS= --browser browser_android_chrome.BrowserAndroidChrome --deviceSerial %DEVICE_SERIAL% --captureDir ^"%AGENT%\lib\capture^"%CHROMEDRIVER_ARGS%"
)
if NOT defined KNOWN_BROWSER (
  echo Unknown browser %BROWSER%
  cd %DP0%
  goto :eof
)

cd %AGENT%
set "CMD=node --max-old-space-size=4096 --expose-gc src\agent_main --serverUrl %WPT_SERVER% --location %LOCATION%%HTTPS_ARGS%%BROWSER_ARGS%%OPT_ARGS%"
echo %CMD%
%CMD%
