20140228 wrightt

A tiny iOS App to open a URL, e.g.:
  idevice-app-runner -s com.google.openURL --args http://foo.com

We use this to launch MobileSafari on an iOS device.

The main code is in openURL/OpenURLAppDelegate.m
  didFinishLaunchingWithOptions
  applicationDidEnterBackground

All the rest is boilerplate!
