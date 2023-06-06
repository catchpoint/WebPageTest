<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/common.inc';
if ($CURL_CONTEXT !== false) {
    curl_setopt($CURL_CONTEXT, CURLOPT_CONNECTTIMEOUT, 30);
    curl_setopt($CURL_CONTEXT, CURLOPT_TIMEOUT, 30);
}

// load the locations
$isPaid = !is_null($request_context->getUser()) && $request_context->getUser()->isPaid();
$includePaid = $isPaid || $admin;
$locations = LoadLocationsIni($includePaid);

$title = 'WebPageTest - configured browsers';
require_once INCLUDES_PATH . '/include/admin_header.inc';

foreach ($locations as $name => $loc) {
    if ($loc['browser']) {
        $b = explode(',', $loc['browser']);
        echo $name;
        echo '<ul><li>';
        echo implode('</li><li>', $b);
        echo '</li></ul>';
    }
}
