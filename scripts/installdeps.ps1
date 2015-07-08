<#
Copyright (c) AppDynamics, Inc., and its affiliates 2015
All rights reserved

Installation script to setup dependencies using the Chocoloatey package manager.
#>

# Install choco
iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))

# Install webpagetest dependencies
# WARNING: the google-chrome-x64 Chocolatey is incompatible with WPT hook, as
# the hook is compiled in 32bit mode. GoogleChrome is the 32bit version of
# Chrome
choco install -y visualstudiocommunity2013 python2
