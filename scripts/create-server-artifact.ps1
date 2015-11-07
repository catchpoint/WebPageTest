<#
Copyright (c) AppDynamics, Inc., and its affiliates 2015
All rights reserved

Build an artifact with the webpagetest sources
#>

$wptroot = $PSScriptRoot + "\.."
$outdir = ($wptroot + "\_dist-www")

if (Test-Path $outdir) {
    Remove-Item -Recurse -Force $outdir
}
mkdir $outdir | Out-Null

$wptserverdir = Get-ChildItem $wptroot www
Copy-Item $wptserverdir ($outdir + "\www") -recurse

$wptserverzip = ($wptroot + "\wptserver.zip")
if (Test-Path $wptserverzip) {
    Remove-Item $wptserverzip
}
Add-Type -Assembly System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($outdir,
        $wptserverzip)

"-> $wptserverzip created"
