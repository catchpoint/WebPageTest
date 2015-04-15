@echo off
rem Copyright 2015 Google Inc. All Rights Reserved.
rem Author: pmeenan@webpagetest.org (Patrick Meenan)

Setlocal EnableDelayedExpansion
set "COMMAND="
set "SERVER="
set "USER="
set "PASSWORD="
set "DOWN_PIPE="
set "DOWN_BW=0"
set DOWN_DELAY=0
set DOWN_PLR=0
set "UP_PIPE="
set UP_BW=0
set UP_DELAY=0
set UP_PLR=0
shift

:loop
if NOT "%0"=="" (
    if "%0"=="set" (
        set COMMAND=%0
        shift
    )
    if "%0"=="clear" (
        set COMMAND=%0
        shift
    )
    if "%0"=="--server" (
        set SERVER=%1
        shift
        shift
    )
    if "%0"=="--user" (
        set USER=%1
        shift
        shift
    )
    if "%0"=="--pw" (
        set PASSWORD=%1
        shift
        shift
    )
    if "%0"=="--down_pipe" (
        set DOWN_PIPE=%1
        shift
        shift
    )
    if "%0"=="--down_bw" (
        set DOWN_BW=%1
        shift
        shift
    )
    if "%0"=="--down_delay" (
        set DOWN_DELAY=%1
        shift
        shift
    )
    if "%0"=="--down_plr" (
        set DOWN_PLR=%1
        shift
        shift
    )
    if "%0"=="--up_pipe" (
        set UP_PIPE=%1
        shift
        shift
    )
    if "%0"=="--up_bw" (
        set UP_BW=%1
        shift
        shift
    )
    if "%0"=="--up_delay" (
        set UP_DELAY=%1
        shift
        shift
    )
    if "%0"=="--up_plr" (
        set UP_PLR=%1
        shift
        shift
    )
    goto :loop
)

set "IPFW_DOWN="
set "IPFW_UP="
if "%COMMAND%"=="clear" (
	set IPFW_DOWN=ipfw pipe !DOWN_PIPE! config
	set IPFW_UP=ipfw pipe !UP_PIPE! config
)
if "%COMMAND%"=="set" (
	set IPFW_DOWN=ipfw pipe !DOWN_PIPE! config
	if NOT "!DOWN_BW!"=="0" (
		set IPFW_DOWN=!IPFW_DOWN! bw !DOWN_BW!Kbit/s
	)
	if NOT "!DOWN_DELAY!"=="0" (
		set IPFW_DOWN=!IPFW_DOWN! delay !DOWN_DELAY!ms
	)
	if NOT "!DOWN_PLR!"=="0" (
		set IPFW_DOWN=!IPFW_DOWN! plr !DOWN_PLR!
	)
	set IPFW_UP=ipfw pipe !UP_PIPE! config
	if NOT "!UP_BW!"=="0" (
		set IPFW_UP=!IPFW_UP! bw !UP_BW!Kbit/s
	)
	if NOT "!UP_DELAY!"=="0" (
		set IPFW_UP=!IPFW_UP! delay !UP_DELAY!ms
	)
	if NOT "!UP_PLR!"=="0" (
		set IPFW_UP=!IPFW_UP! plr !UP_PLR!
	)
)
set DOWNCMD=cmd /C "plink %IPFW_DOWN%"
set UPCMD=cmd /C "plink %IPFW_UP%"
echo %DOWNCMD%
%DOWNCMD%
echo %UPCMD%
%UPCMD%