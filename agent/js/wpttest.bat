@echo off

set PROJECT_ROOT=%~dp0
set DP0=%~dp0

set WPT_SERVER=http://localhost:8888
set LOCATION=Test
set tests=""
set WPT_VERBOSE=false
set WPT_MAX_LOGLEVEL=5
set WPT_DEBUG=false

:loop
if NOT "%1"=="" (
	if "%1"=="-g" (
        set tests=%2
        shift
        shift
        goto :loop
    )
    if "%1"=="-s" (
        set WPT_SERVER=%2
        shift
        shift
        goto :loop
    )
    if "%1"=="-l" (
        set LOCATION=%2
        shift
        shift
        goto :loop
    )
    if "%1"=="-m" (
        set WPT_MAX_LOGLEVEL=%2
        shift
        shift
        goto :loop
    )
    if "%1"=="-v" (
        set WPT_VERBOSE=true
        shift
        goto :loop
    )
    if "%1"=="-d" (
        set WPT_DEBUG=true
        shift
        goto :loop
    )
    echo Usage: %0 [-s server] [-l location] [-v] [-d] [-m level]
    echo         -s    server       WebPagetest server
    echo         -l    location     location name of the WebPagetest server
    echo         -v    verbose      mirrors all logs to stdout
    echo         -d    debug        sets all debug and custom loglevels to -1 so that
    echo                            they are guaranteed to display
    echo         -m    max loglevel sets the maximum loglevel that will be saved
    echo                            the value can either be a number or the name
    echo                            of a loglevel such as critical, warning, or debug
    goto :EOF
)

:FINDPROJECTROOT
if not exist webpagetest\agent\js goto NOTFOUNDPROJECTROOT
goto FOUNDPROJECTROOT

:NOTFOUNDPROJECTROOT
cd ..
if %CD%==%CD:~0,3% goto :PROJECTROOTERROR
goto :FINDPROJECTROOT

:PROJECTROOTERROR
echo Couldn't find project root
cd %DP0%
goto :eof

:FOUNDPROJECTROOT
set PROJECT_ROOT=%CD%
cd %DP0%

set agent=%PROJECT_ROOT%\webpagetest\agent\js
set SELENIUM_BUILD=%project_root%\Selenium\selenium-read-only\build
set NODE_PATH=%agent%;%agent%\src;%SELENIUM_BUILD%\javascript\webdriver

IF NOT [%tests%]==[""] GOTO RUN_MOCHA_WITH_GREP
goto RUN_MOCHA_WITHOUT_GREP

:RUN_MOCHA_WITH_GREP
mocha  --grep %tests%
goto :EOF

:RUN_MOCHA_WITHOUT_GREP
mocha
goto :EOF