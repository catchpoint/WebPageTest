<#
Copyright (c) AppDynamics, Inc., and its affiliates 2015
All rights reserved

Installation script to setup dependencies using the Chocoloatey package manager.
#>

# Install choco
iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))

# Install webpagetest dependencies
choco install -y visualstudiocommunity2013 python2
