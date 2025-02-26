<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

define('APP_ROOT', realpath(__DIR__ . '/../'));
define('WWW_PATH', realpath(APP_ROOT . '/www/'));
define('ASSETS_PATH', realpath(WWW_PATH . '/assets/'));
define('TESTS_PATH', realpath(APP_ROOT . '/tests/'));
define('INCLUDES_PATH', WWW_PATH); // same as www for now
define('SETTINGS_PATH', realpath(WWW_PATH . '/settings/'));
define('TEMP_DIR', realpath(WWW_PATH . '/tmp/'));
define('OE_PATH', realpath(WWW_PATH . '/experiments/'));

define('WPT_SALT', '2502');  // used to force assets hash
define('VER_WEBPAGETEST', '21.07');   // webpagetest version
define('VER_TYPOGRAPHY_CSS', @md5_file(ASSETS_PATH . '/css/typography.css') . WPT_SALT);          // version of the typography css file
define('VER_LAYOUT_CSS', @md5_file(ASSETS_PATH . '/css/layout.css') . WPT_SALT);          // version of the layout css file
define('VER_CSS', @md5_file(ASSETS_PATH . '/css/pagestyle2.css') . WPT_SALT);          // version of the sitewide css file
define('VER_HEADER_CSS', @md5_file(ASSETS_PATH . '/css/wpt-header.css') . WPT_SALT); // version of the header css file
define('VER_ACCOUNT_CSS', @md5_file(ASSETS_PATH . '/css/account.css') . WPT_SALT); // version of the account css file
define('VER_PRICE_CHANGER_JS', @md5_file(ASSETS_PATH . '/js/signup-price-changer.js') . WPT_SALT);
define('VER_FAQ_JS', @md5_file(ASSETS_PATH . '/js/accessible-faq.js') . WPT_SALT);
define('VER_BUTTON_CSS', @md5_file(ASSETS_PATH . '/css/button.css') . WPT_SALT);   // version of the button css file
define('VER_JS', @md5_file(ASSETS_PATH . '/js/site.js') . WPT_SALT);                 // version of the sitewide javascript file
define('VER_JS_TEST', @md5_file(ASSETS_PATH . '/js/test.js') . WPT_SALT);            // version of the javascript specific to the test pages
define('VER_JS_RUNNING', @md5_file(ASSETS_PATH . '/js/running.js') . WPT_SALT);          // version of the javascript specific to the test running status page
define('VER_JS_ACCOUNT', @md5_file(ASSETS_PATH . '/js/account.js') . WPT_SALT);          // version of the javascript specific to the test running status page
define('VER_JS_ESTIMATE_TAXES', @md5_file(ASSETS_PATH . '/js/estimate-taxes.js') . WPT_SALT);
define('VER_JS_COUNTRY_LIST', @md5_file(ASSETS_PATH . '/js/country-list/country-list.js') . WPT_SALT);
define('UNKNOWN_TIME', -1);           // Value used as a flag for an unknown time.

define('BREAKDOWN_CACHE_VERSION', 4);
define('VIDEO_CODE_VERSION', 20);

define('EMBED', isset($_REQUEST['embed']));
