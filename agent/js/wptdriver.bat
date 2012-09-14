@echo off
set DP0=%~dp0
set WPT_SERVER=http://localhost:8888
set LOCATION=Test
set WPT_VERBOSE=false
set WPT_MAX_LOGLEVEL=5
set WPT_DEBUG=false

:loop
if NOT "%1"=="" (
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
    if "%1"=="-v" (
        set WPT_VERBOSE=true
        shift
        goto :loop
    )
    if "%1"=="-m" (
        set WPT_MAX_LOGLEVEL=%2
        shift
        shift
        goto :loop
    )
    if "%1"=="-d" (
        set WPT_DEBUG=true
        goto :loop
    )
    echo Usage: %0 [-s server] [-l location] [-v] [-d] [-m]
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

set PROJECT_ROOT=%~dp0

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

set AGENT=%PROJECT_ROOT%\webpagetest\agent\js
set DEVTOOLS2HAR_JAR=%PROJECT_ROOT%\webpagetest\lib\dt2har\target\dt2har-1.0-SNAPSHOT-jar-with-dependencies.jar
set SELENIUM_BUILD=%project_root%\Selenium\selenium-read-only\build
set NODE_PATH="%AGENT%;%AGENT%\src;%SELENIUM_BUILD%\javascript\webdriver

node src\agent_main --wpt_server %WPT_SERVER% --location %LOCATION% --chromedriver %SELENIUM_BUILD%\chromedriver.exe --selenium_jar %SELENIUM_BUILD%\java\server\src\org\openqa\grid\selenium\selenium-standalone.jar --devtools2har_jar=%DEVTOOLS2HAR_JAR%
