# WebPageTest

This is the official repository for the performance-testing code that runs at [webpagetest.org](https://www.webpagetest.org).

- 🥡 [Install your own instance](https://docs.webpagetest.org/private-instances/)
- 📕 [Documentation](https://github.com/WPO-Foundation/webpagetest-docs)
- 🕒 [Changelog](https://docs.webpagetest.org/change-log)
- 🌐 [Cross-platform browser agent](https://github.com/WPO-Foundation/wptagent)
- 💤 [REST API](https://docs.webpagetest.org/api/) examples:
  - 🐘 [`/bulktest`](/bulktest/): A PHP command-line tool that can submit a bulk set of tests, gather the results, and aggregate analyses.
  - 🐍 [`/batchtool`](/batchtool/): A Python tool that can submit a bulk set of tests and gather the results.

## Troubleshooting private instances

If your instance runs, but you’re having issues configuring agents, navigate to `http://{your_instance’s_ip}/install` to [check for a valid configuration](https://docs.webpagetest.org/private-instances/#web-server-install).

## Contributing

There are separate lines of development under different licenses (pull requests accepted to either):

- The `master` branch where most active development occurs has the [Polyform Shield 1.0.0 license](LICENSE.md)
- The `apache` branch has the more permissive [Apache 2.0 license](https://opensource.org/licenses/Apache-2.0)

### Testing

WebPageTest uses [PHPUnit](https://phpunit.de) for unit tests. To set up and run the unit tests:

1. Install [Composer](https://getcomposer.org)
2. Run `composer install`
3. Run `composer test`
