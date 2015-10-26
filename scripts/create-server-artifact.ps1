<#
Copyright (c) AppDynamics, Inc., and its affiliates 2015
All rights reserved

Build an artifact with the webpagetest sources
#>

$wptroot = $PSScriptRoot + "\.."

$wptserverdir = Get-ChildItem $wptroot www
$wptserverzip = ($wptroot + "\wptserver.zip")
if (Test-Path $wptserverzip) {
    Remove-Item $wptserverzip
}
Add-Type -Assembly System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($wptserverdir.fullname,
        $wptserverzip)

"-> $wptserverzip created"
