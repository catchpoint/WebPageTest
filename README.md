This is the official repository for the [WebPagetest](http://www.webpagetest.org/) web performance testing code.

If you are looking to install your own instance, I recommend grabbing the latest [private instance release](https://sites.google.com/a/webpagetest.org/docs/private-instances).

The platform is basically split into two parts:

* /www - The web UI (PHP)
* /agent - The code for running the tests on various browsers.

#Agents
There are a few different agents depending on the browsers and platforms supported.

##Wptdriver
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
* /agent/browser/firefox/extension - Extension for supporting Firefox (JS).
* /agent/browser/firefox/prefs.js - Default prefs file for the Firefox user profile.
* /agent/browser/safari - Extension for supporting Safari (JS).

##Urlblast/Pagetest
Urlblast and pagetest are the original agent that support IE only and requires Visual Studio 2008 SP3 to build (also all c++).  It is in the process of being deprecated but wptdriver is not quite at feature parity yet (a few script commands and PageSpeed integration).

The main project file for it is /agent/browser/ie/pagetest.sln

* /agent/browser/ie/urlBlast - Equivalent to wptdriver.  It is the main process that polls the server for work, launches the browser and reports results.
* /agent/browser/ie/pagetest - Browser Helper Object that instruments IE through API hooking and uses the supported BHO interfaces for driving the browser.  It also has an available UI for interactively running scripts.
* /agent/browser/ie/PageTestExe - A stand-alone exe that hosts the IE control in it's own window.  Useful if the BHO doesn't work because of other software on the PC (antivirus software in particular can get in the way).
* /agent/browser/ie/Pagetest Installer - Installer project for building the msi installer for the desktop install of pagetest.
* /agent/browser/ie/ptUpdate - A small executable that is included with urlblast updates that can verify and apply the update.

##NodeJS - Desktop and Mobile (experimental)
A cross-platform NodeJS agent that can be used to test Desktop Chrome, Chrome on Android and Safari on iOS.  It is still under very active development but can run basic URL tests and capture full dev tools timeline information.

* /agent/js - The NodeJS agent

##Chrome stand-alone extension (not yet functional)
An experiment in creating a stand-alone agent built entirely as a Chrome extension is located in /agent/browser/chrome/WebPagetest-lite

##Mobitest Mobile Agents
The Mobitest agents are managed by Akamai and are hosted on [Google code](https://code.google.com/p/mobitest-agent/).

#API Examples
There are two examples using the [Restful API](https://sites.google.com/a/webpagetest.org/docs/advanced-features/webpagetest-restful-apis):

* /bulktest - A php cli project that can submit a bulk set of tests, gather the results and aggregate analysis.
* /batchtool - A python project that can submit a bulk set of tests and gather the results.

#Communicating sensitive information

If you need to communicate sensitive information in an issue or through mail please use the following GPG key to encrypt the data:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: WebPageTest
Comment: pmeenan@webpagetest.org

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
4nHIkA==
=BMAU
-----END PGP PUBLIC KEY BLOCK-----
```
