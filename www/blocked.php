<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once __DIR__ . '/common.inc';
echo view('pages.blocked', [
    'page_title' => 'WebPageTest - Access Denied',
    'body_class' => 'four-oh-four',
    'contact' => GetSetting('contact'),
    'ip' => $_SERVER['REMOTE_ADDR'],
]);
