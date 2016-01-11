@echo OFF
REM set THIS_DIR=%~dp0
set THIS_DIR=.

attrib -R -A -S -H  "%THIS_DIR%\*.aps"
attrib -R -A -S -H  "%THIS_DIR%\*.ncb"
attrib -R -A -S -H  "%THIS_DIR%\*.suo"
attrib -R -A -S -H  "%THIS_DIR%\*.sdf"
attrib -R -A -S -H  "%THIS_DIR%\*.user"

del "%THIS_DIR%\*.aps" /q
del "%THIS_DIR%\*.ncb" /q
del "%THIS_DIR%\*.suo" /q
del "%THIS_DIR%\*.sdf" /q
del "%THIS_DIR%\cryptlib.user" /q
del "%THIS_DIR%\cryptdll.user" /q
del "%THIS_DIR%\dlltest.user" /q
del "%THIS_DIR%\adhoc.cpp" /q
del "%THIS_DIR%\cryptopp.mac.done" /q
del "%THIS_DIR%\adhoc.cpp.copied" /q

REM New Visual Studio 2005 and VC 6.0
del "%THIS_DIR%\cryptlib.vcproj" /q
del "%THIS_DIR%\cryptest.vcproj" /q
del "%THIS_DIR%\cryptdll.vcproj" /q
del "%THIS_DIR%\dlltest.vcproj" /q
del "%THIS_DIR%\cryptopp.vcproj" /q
del "%THIS_DIR%\cryptlib.dsp" /q
del "%THIS_DIR%\cryptest.dsp" /q
del "%THIS_DIR%\cryptdll.dsp" /q
del "%THIS_DIR%\dlltest.dsp" /q
del "%THIS_DIR%\cryptest.dsw" /q

REM Visual Studio build artifacts
rmdir /Q /S "%THIS_DIR%\Debug\"
rmdir /Q /S "%THIS_DIR%\Release\"
rmdir /Q /S "%THIS_DIR%\Win32\"
rmdir /Q /S "%THIS_DIR%\x64\"
rmdir /Q /S "%THIS_DIR%\ipch\"
rmdir /Q /S "%THIS_DIR%\.vs\"

REM Visual Studio VCUpgrade artifacts
del "%THIS_DIR%\*.old" /q
del "%THIS_DIR%\UpgradeLog.htm" /q
del "%THIS_DIR%\UpgradeLog.XML" /q
rmdir /Q /S "%THIS_DIR%\_UpgradeReport_Files\"
rmdir /Q /S "%THIS_DIR%\Backup\"

