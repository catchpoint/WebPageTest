# WebPageTest

[![travis](https://img.shields.io/travis/WPO-Foundation/webpagetest.svg?label=travis)](http://travis-ci.org/WPO-Foundation/webpagetest)

This is the official repository for the [WebPageTest](https://www.webpagetest.org/) web-performance testing code.

If you are looking to install your own instance, I recommend grabbing the latest [private instance release](https://github.com/WPO-Foundation/webpagetest-docs/blob/master/user/Private%20Instances/README.md).

The platform is basically split into two parts:

* /www - The web UI (PHP)
* /agent - The code for running the tests on various browsers.

# Troubleshooting Private instances
If your instance is running, but you're having issues configuring agents, try navigating to {server_ip}/install and checking for a valid configuration.

# Agents
There are a few different agents depending on the browsers and platforms supported.

## Wptdriver
Wptdriver is the main Windows test agent and it supports IE, Chrome, Firefox and Safari.  It requires Visual Studio 2013 and is all C++.

The main project file for it is /webpagetest.sln

There are a few different components to it:

* /agent/wptdriver - This is the main exe that is launched.  It is responsible for:
    + polling the server for work
    + launching the browser
    + injecting the instrumentation
    + reporting the results
    + installing software and browser updates
* /agent/wpthook - This is the main test code that is injected into the browser, navigates and interacts as requested and records all of the activity.  It runs a local web server on port 8888 for the browser-specific extensions to communicate with and uses API hooking for most of the measurement.
* /agent/wptglobal - This is a system-wide hook that is used to watch for events that occur in browser processes other than the main one.  Right now that is only the Chrome GPU process where it watches for screen paints.
* /agent/wptwatchdog - A background process that automatically restarts wptdriver if it exited unexpectedly.
* /agent/wptupdate - A small executable that is included with wptdriver updates that can verify and apply the update.

There are also several browser-specific extensions for interacting with the various browsers (navigating, filling forms, capturing the load event, etc):

* /agent/browser/ie/wptbho - A c++ Browser Helper Object for IE.
* /agent/browser/chrome/extension - Extension for supporting Chrome (JS).  It relies on closure and must be compiled (there is a compile.cmd that will run the closure compiler for you).
* /agent/browser/firefox/webextension/extension - WebExtension for supporting Firefox (JS).
* /agent/browser/firefox/prefs.js - Default prefs file for the Firefox user profile.
* /agent/browser/safari - Extension for supporting Safari (JS).

## Urlblast/Pagetest
Urlblast and pagetest are the original agent that support IE only and requires Visual Studio 2008 SP3 to build (also all c++).  It is in the process of being deprecated but wptdriver is not quite at feature parity yet (a few script commands and PageSpeed integration).

The main project file for it is /agent/browser/ie/pagetest.sln

* /agent/browser/ie/urlBlast - Equivalent to wptdriver.  It is the main process that polls the server for work, launches the browser and reports results.
* /agent/browser/ie/pagetest - Browser Helper Object that instruments IE through API hooking and uses the supported BHO interfaces for driving the browser.  It also has an available UI for interactively running scripts.
* /agent/browser/ie/PageTestExe - A stand-alone exe that hosts the IE control in it's own window.  Useful if the BHO doesn't work because of other software on the PC (antivirus software in particular can get in the way).
* /agent/browser/ie/Pagetest Installer - Installer project for building the msi installer for the desktop install of pagetest.
* /agent/browser/ie/ptUpdate - A small executable that is included with urlblast updates that can verify and apply the update.

## NodeJS - Desktop and Mobile (experimental)
A cross-platform NodeJS agent that can be used to test Desktop Chrome, Chrome on Android and Safari on iOS.  It is still under very active development but can run basic URL tests and capture full dev tools timeline information.

* /agent/js - The NodeJS agent

## Chrome stand-alone extension (not yet functional)
An experiment in creating a stand-alone agent built entirely as a Chrome extension is located in /agent/browser/chrome/WebPagetest-lite

## Mobitest Mobile Agents
The Mobitest agents are managed by Akamai and are hosted on [Google code](https://code.google.com/p/mobitest-agent/).

# Documentation

[WebPageTest Documentation](https://github.com/WPO-Foundation/webpagetest-docs)

## API Examples
There are two examples using the [Restful API](https://github.com/WPO-Foundation/webpagetest-docs/blob/master/dev/api.md):

* /bulktest - A php cli project that can submit a bulk set of tests, gather the results and aggregate analysis.
* /batchtool - A python project that can submit a bulk set of tests and gather the results.
