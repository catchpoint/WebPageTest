<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
$page_keywords = array('About', 'Contact', 'WebPageTest', 'Website Speed Test', 'Page Speed');
$page_description = "More information about WebPageTest website speed testing and how to contact us.";

require_once __DIR__ . '/common.inc';
echo view('pages.about', [
    'page_title' => 'WebPageTest - About',
    'body_class' => 'about',
]);
