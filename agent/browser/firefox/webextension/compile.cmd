@echo off
rmdir /S /Q "%~dp0extension/release"
mkdir "%~dp0extension/release"
mkdir "%~dp0extension/release/wpt"
set CLOSURE_COMPILER_JAR="%~dp0../../chrome/compiler.jar"
set COMPILE_JS=C:\Python27\python.exe "%~dp0../../chrome/extension/third_party/closure-library/closure/bin/build/closurebuilder.py" ^
  --root="%~dp0../../chrome/extension/third_party/closure-library/" ^
  --root="%~dp0extension/wpt" ^
  --compiler_jar=%CLOSURE_COMPILER_JAR% ^
  --compiler_flags=--warning_level=VERBOSE ^
	--output_mode=script
%COMPILE_JS% ^
  --input="%~dp0extension/wpt/allTests.js" ^
  --output_file="%~dp0extension/release/wpt/allTests.js"
copy "%~dp0extension\wpt\script.js" "%~dp0extension\release\wpt\script.js"
copy "%~dp0extension\wpt\browserActionPopup.js" "%~dp0extension\release\wpt\browserActionPopup.js"
%COMPILE_JS% ^
  --input="%~dp0extension/wpt/background.js" ^
  --output_file="%~dp0extension/release/wpt/background.js"
copy "%~dp0extension\manifest.json" "%~dp0extension\release\manifest.json"
copy "%~dp0extension\wpt\*.html" "%~dp0extension\release\wpt\"
copy "%~dp0extension\wpt\*.jpg"  "%~dp0extension\release\wpt\"
copy "%~dp0extension\wpt\*.css"  "%~dp0extension\release\wpt\"
