<#
Copyright (c) AppDynamics, Inc., and its affiliates 2015
All rights reserved

Build script for wpt-driver. Usage:

create-update.ps1 Release # Build in Release mode
create-update.ps1 Debug   # Build in Debug mode

REQUIREMENTS:
- msbuild.exe and python.exe (required by the Chrome compile.cmd) should be in
  the path
- powershell v.4 or more recent, with Get-FileHash cmdlet

This script has been tested in GitHub's Git Shell.
Executing it in a regular PowerShell may also work, but you will have to
setup the path for each dependencies.
#>

param(
    [string]$configuration = "Release"
)

if ((Get-Command "python.exe" -ErrorAction SilentlyContinue) -eq $null) {
    "Error: python.exe is not installed or not in PATH, exiting"
    Exit 1;
}
if ((Get-Command "msbuild.exe" -ErrorAction SilentlyContinue) -eq $null) {
    "Error: MSBuild.exe is not installed or not in PATH, exiting"
    Exit 1;
}
if ((Get-Command "Get-FileHash" -ErrorAction SilentlyContinue) -eq $null) {
    "Error: Get-FileHash cmdlet not available, exiting"
    "You probably need to run this script with a more recent version of Powershell"
    Exit 1;
}


$wptroot = $PSScriptRoot + "\.."

"*** Building wpt-driver with $configuration configuration"

# ZipFiles implementation from:
# http://stackoverflow.com/a/13302548
function ZipFiles( $zipFilename, $sourceDir)
{
   Add-Type -Assembly System.IO.Compression.FileSystem
   $compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal
   [System.IO.Compression.ZipFile]::CreateFromDirectory($sourcedir,
        $zipfilename, $compressionLevel, $false)
}

$releasedir_path = $wptroot + "\" + $configuration
if (!(test-path $releasedir_path)) {
    New-Item -ItemType directory -Path $releasedir_path | Out-Null
}
$releasedir = Get-ChildItem $wptroot $configuration
$outdir = ($releasedir.fullname + "\dist")

# Create output directories
if (test-path $outdir) { Remove-Item -recurse $outdir }
mkdir $outdir | Out-Null
mkdir ($outdir + "\extension") | Out-Null

"-> Building the Visual Studio Solution in $configuration configuration"
"(log file is $wptroot\$configuration\msbuild.log)"
msbuild.exe webpagetest.sln /P:Configuration=$configuration | Out-File ($releasedir.fullname + "\msbuild.log")

# Copying compiled stuff into the output directory
$binaries = "wptbho.dll", "wptdriver.exe", "wpthook.dll", "wptload.dll", "wptupdate.exe", "wptwatchdog.exe"
foreach ($bin in $binaries) {
	Get-ChildItem -Path $wptroot\$configuration $bin | Copy-Item -Destination $outdir
}

"-> Building and copying Chrome extension"
"(log file is $wptroot\$configuration\chromebuild.log)"
& $wptroot\agent\browser\chrome\compile.cmd 2>&1 | Out-File ($releasedir.fullname + "\chromebuild.log")
Copy-Item -recurse $wptroot\agent\browser\chrome\extension\release\ $wptroot\$configuration\dist\extension\extension

"-> Copying Firefox extension"
Copy-Item -recurse $releasedir\templates $wptroot\$configuration\dist\extension\

"-> Zipping extension directory"
$extdir=Get-ChildItem $wptroot\$configuration\dist extension
Add-Type -Assembly System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($extdir.fullname,
	($outdir + "\extension.zip"))

Remove-Item -recurse ($outdir + "\extension")

"-> Writing wptupdate.ini with MD5 hashes"
$tohash= $binaries + "extension.zip"

$wptexec = ($releasedir.fullname + "\wptdriver.exe")
$ver = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($wptexec).FileVersion.split(".")[3]

$ini=@"
[version]
ver=$ver

[md5]
"@

$wptupdate = ($outdir + "\wptupdate.ini")
$ini | Out-File $wptupdate -Encoding "ASCII" -Append
foreach ($filename in $tohash) {
	$md5 = Get-FileHash ($outdir + "\" + $filename) -Algorithm MD5
	($filename + "=" + $md5.hash) | Out-File $wptupdate -Encoding "ASCII" -Append
}

$updatezip = ($releasedir.fullname + "\wptupdate.zip")
"-> Creating " + $updatezip
if (test-path $updatezip) { remove-item $updatezip }
[System.IO.Compression.ZipFile]::CreateFromDirectory($outdir, $updatezip)

"-> $updatezip created"
