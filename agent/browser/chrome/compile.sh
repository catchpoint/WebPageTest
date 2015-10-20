#!/bin/bash

# Script to build WPT chrome extension's release build using closure.

readonly here=$(dirname $0)
readonly extension="$here/extension"
readonly release="$extension/release"
readonly COMPILER_JAR="$here/compiler.jar"

closure() {
    python "$extension/third_party/closure-library/closure/bin/build/closurebuilder.py"  \
        --root="$extension/third_party/closure-library/" \
        --root="$extension/wpt" \
        --compiler_jar="$COMPILER_JAR" \
        --compiler_flags=--warning_level=VERBOSE \
        --compiler_flags=--externs="$extension/third_party/closure-compiler/contrib/externs/chrome_extensions.js" \
        --compiler_flags=--externs="$extension/third_party/closure-compiler/contrib/externs/webkit_console.js" \
        --compiler_flags=--externs="$extension/third_party/closure-compiler/contrib/externs/json.js" \
        --compiler_flags=--externs="$here/externs.js" \
        --output_mode=script \
        --input="$1" \
        --output_file="$2"
}

# Cleanup the existing artifacts and create the new directory structure.
rm -rf "$release"

mkdir -p "$release"
mkdir -p "$release/wpt"

# Build a unified allTests.js and background.js
closure "$extension/wpt/allTests.js" "$release/wpt/allTests.js"
closure "$extension/wpt/background.js" "$release/wpt/background.js"

# Copy all the necessary files into the release directory structure.
for fn in `ls "$extension/wpt"/*.{html,jpg,css}` `ls "$extension/wpt"/{script,browserActionPopup}.js` ; do
    cp "$fn" "$release/wpt"
done
cp "$extension/manifest.json" "$release/manifest.json"
