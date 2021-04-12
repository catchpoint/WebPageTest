# WebPageTest

[![travis](https://img.shields.io/travis/WPO-Foundation/webpagetest.svg?label=travis)](http://travis-ci.org/WPO-Foundation/webpagetest)

This is the official repository for the [WebPageTest](https://www.webpagetest.org/) web-performance testing code.

If you are looking to install your own instance, I recommend grabbing the latest [private instance release](https://docs.webpagetest.org/private-instances/).

# Troubleshooting Private instances
If your instance is running, but you're having issues configuring agents, try navigating to {server_ip}/install and checking for a valid configuration.

# Agents
The cross-platform browser agent is [here](https://github.com/WPO-Foundation/wptagent).


# Documentation

[WebPageTest Documentation](https://github.com/WPO-Foundation/webpagetest-docs)

# API Examples
There are two examples using the [Restful API](https://docs.webpagetest.org/dev/api/):

* /bulktest - A php cli project that can submit a bulk set of tests, gather the results and aggregate analysis.
* /batchtool - A python project that can submit a bulk set of tests and gather the results.

# Contributing
There are 2 separate lies of development under different licenses and pull requests are accepted to either of them.  The master branch where most active development is occurring is under the [Polyform Shield 1.0.0 license](LICENSE.md) and there is an "apache" branch which is under the more permissive Apache 2.0 license.

# Change Log
View the [WebPageTest Change Log](https://docs.webpagetest.org/change-log)
