# Setup & Build scripts

This directory contains a few scripts to simplify setting up the Windows agent
of webpagetest.

The scripts have been developed and tested on Windows 8.1 Enterprise

## Requirements
```
# Use at our own risks.
Set-ExecutionPolicy Unrestricted
```

## Setup script
```installdeps.ps1``` simplifies installing webpagetest dependencies, such as
Visual Studio for compiling wpt-driver. It will first download
and install [Chocolatey](https://chocolatey.org), a package manager for Windows.

Usage:
from a Powershell with Administrative power
```
cd \Path\To\WebPageTest
.\scripts\installdeps.ps1
```

## Building wpt-driver update archive
```create-update.ps``` compiles the wpt-driver Visual Studio solution using
whichever version of Visual Studio is available in the path. If you used
```installdeps.ps1``` for setting up your machine, it will most likely be Visual
Studio 2013 Community Edition. It will then bundle up the binary along with the
browser extensions and produce a zip file suitable for updating agents

It is recommended to run this script from the a GitHub powershell, as it's PATH
is already miraculously setup to contain everything needed

Usage:
```
cd \Path\To\WebPageTest
.\scripts\create-update.ps1
```

### Troubleshooting
If you see a whole bunch of red lines when executing one of these scripts, you
have a problem. Here are a few things to check:
* You are running in a shell with administrative powers
* You have all the dependencies installed (in particular, Visual Studio)
* ```MSBuild.exe``` is in the PATH
* ```python.exe``` is in the PATH

# Copyright
Copyright (c) AppDynamics, Inc., and its affiliates 2015  
All rights reserved
