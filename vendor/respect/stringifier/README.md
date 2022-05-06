# Respect\Stringifier

[![Build Status](https://img.shields.io/travis/Respect/Stringifier/master.svg?style=flat-square)](http://travis-ci.org/Respect/Stringifier)
[![Scrutinizer Code Quality](https://img.shields.io/scrutinizer/g/Respect/Stringifier/master.svg?style=flat-square)](https://scrutinizer-ci.com/g/Respect/Stringifier/?branch=master)
[![Code Coverage](https://img.shields.io/scrutinizer/coverage/g/Respect/Stringifier/master.svg?style=flat-square)](https://scrutinizer-ci.com/g/Respect/Stringifier/?branch=master)
[![Latest Stable Version](https://img.shields.io/packagist/v/respect/stringifier.svg?style=flat-square)](https://packagist.org/packages/respect/stringifier)
[![Total Downloads](https://img.shields.io/packagist/dt/respect/stringifier.svg?style=flat-square)](https://packagist.org/packages/respect/stringifier)
[![License](https://img.shields.io/packagist/l/respect/stringifier.svg?style=flat-square)](https://packagist.org/packages/respect/stringifier)

Converts any PHP value into a string.

## Installation

Package is available on [Packagist](https://packagist.org/packages/respect/stringifier), you can install it
using [Composer](http://getcomposer.org).

```bash
composer require respect/stringifier
```

This library requires PHP >= 7.1.

## Feature Guide

Below a quick guide of how to use the library.

### Namespace import

Respect\Stringifier is namespaced, and you can make your life easier by importing
a single function into your context:

```php
use function Respect\Stringifier\stringify;
```

Stringifier was built using objects, the `stringify()` is a easy way to use it.

### Usage

Simply use the function to convert any value you want to:

```php
echo stringify($value);
```

To see more examples of how to use the library check the [integration tests](tests/integration).
