@echo off

set AGENT=%~dp0
set DP0=%~dp0

set WPT_MAX_LOGLEVEL='error'
set "WPT_VERBOSE=true"
set "GREP="
set "WPT_SPEC="
set "WPT_COVERAGE="
set "WPT_TESTS="
set "WPT_LINT="
set "WPT_DEBUG="
shift

:loop
if NOT "%0"=="" (
    set "MATCHED="
    set "TRUE="
    if "%0"=="-g" set TRUE=1
    if "%0"=="--grep" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set WPT_TESTS=%1
        shift
        shift
    )
    set "TRUE="
    if "%0"=="-t" set TRUE=1
    if "%0"=="--test" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set WPT_SPEC=true
        shift
    )
    set "TRUE="
    if "%0"=="-c" set TRUE=1
    if "%0"=="--coverage" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set WPT_COVERAGE=true
        shift
    )
    set "TRUE="
    if "%0"=="-l" set TRUE=1
    if "%0"=="--lint" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set WPT_LINT=true
        shift
    )
    set "TRUE="
    if "%0"=="-q" set TRUE=1
    if "%0"=="--quiet" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set WPT_VERBOSE=false
        shift
    )
    set "TRUE="
    if "%0"=="-m" set TRUE=1
    if "%0"=="--max_log" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set "WPT_MAX_LOGLEVEL=%1"
        shift
        shift
    )
    set "TRUE="
    if "%0"=="-d" set TRUE=1
    if "%0"=="--debug" set TRUE=1
    if defined TRUE (
        set MATCHED=1
        set WPT_DEBUG=true
        shift
    )
    if NOT defined MATCHED (
      echo %0
      echo Usage: %BATCH_NAME% [options]...
      echo.
      echo         -t, --test           Run unit tests.  This is the default unless '-c'
      echo                              and/or '-l' are specified.
      echo                              If it fails, make sure to "npm install -g mocha".
      echo.
      echo         -c, --coverage       Run jscover on unit tests, writes output to "cov.html".
      echo                              If it fails, make sure to "npm install -g jscover".
      echo.
      echo         -l, --lint           Run jshint ^(with .jshintrc^) and gjslint.
      echo.                             If it fails, make sure to "npm install -g jshint".
      echo.
      echo         -g, --grep STRING    Filter '-t' and '-c' to only include the tests with
      echo                              "it^(...^)" descriptions that contain the given string,
      echo                              e.g. 'wd_server'.
      echo.
      echo         -q, --quiet          Disable verbose logging to stdout.  Enabled by default
      echo                              for '-c'.
      echo.
      echo         -m, --max_log LEVEL  Sets the maximum loglevel that will be saved, where
      echo                              value can either be a number ^(0-8^) or the name of
      echo                              a loglevel such as critical, warning, or debug.
      echo                              Defaults to 'error'.
      echo.
      echo         -d, --debug          Enable debug output.
      cd %DP0%
      goto :eof
    )
    goto :loop
)

if not defined WPT_SPEC if not defined WPT_COVERAGE if not defined WPT_LINT set WPT_SPEC=true
if "%WPT_TESTS%"=="*" set "WPT_TESTS="
if "%WPT_TESTS%"=="all" set "WPT_TESTS="

rem Find the latest version of WD server jar, WDJS, platform-specific chromedriver
for %%J in (%AGENT%\lib\webdriver\java\selenium-standalone-*.jar) do set SELENIUM_JAR=%%J

for %%E in (%AGENT%\lib\webdriver\chromedriver\Win32\chromedriver-*.exe) do set CHROMEDRIVER=%%E
if defined CHROMEDRIVER set "CHROMEDRIVER_ARGS= --chromedriver ^"%CHROMEDRIVER%^""

set "NODE_PATH=%AGENT%;%AGENT%\src"

cd %AGENT%

if defined WPT_LINT (
  for %%F in (%AGENT%\src\*.js) do jshint %%F
  for %%F in (%AGENT%\test\*.js) do jshint %%F
)

if defined WPT_TESTS set "GREP=--grep ^"%WPT_TESTS%^""
if defined WPT_SPEC (
  mocha --reporter spec %GREP%
)

if defined WPT_COVERAGE (
  set "WPT_VERBOSE=false"
  rmdir /S /Q src-cov
  if defined WPT_DEBUG set "DEBUG=-v"
  jscover %DEBUG% src src-cov
  mocha --reporter html-cov %GREP% > cov.html
  echo Wrote cov.html
)
