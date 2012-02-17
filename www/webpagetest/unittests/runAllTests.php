<?php
// Entry point to run unit tests.  Invoke as follows:
// $ cd www/webpagetest/unittests
// $ php runAllTests.php

// Include the test framework.
include_once('../lib/EnhanceTestFramework.php');

// Find the tests - '.' is the current directory.
// It would be nice to put tests in the same directory as the code
// being tested.  Unfortunately, WebPageTest code uses the word 'test'
// in many file and function names that are not unit tests.  Placing
// unit tests in the same directory would be confusing.
\Enhance\Core::discoverTests('tests');

// Run the tests.
\Enhance\Core::runTests();
?>
