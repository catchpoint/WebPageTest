<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

// old index.php pseudonyms
if (in_array($_SERVER['REQUEST_URI'], [
    '/comprehensive',
    '/easy',
    '/ez',
    '/simple',
    '/test',
])) {
    $loc = sprintf('Location: %s://%s/', $_SERVER['REQUEST_SCHEME'], $_SERVER['HTTP_HOST']);
    header($loc, true, 302);
    exit();
}

// home aka index
if (in_array($_SERVER['REQUEST_URI'], [
    '/',
    '/index.php',
    '/boo',
])) {
    require_once __DIR__ . '/home.php';
    exit();
}

require_once __DIR__ . '/404.php';