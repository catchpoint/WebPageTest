<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
$page_keywords = array('Missing');
$page_description = "Page Not Found.";

require_once __DIR__ . '/common.inc';
echo view('pages.404', [
    'page_title' => 'WebPageTest - Page Not Found',
    'body_class' => 'four-oh-four',
]);
