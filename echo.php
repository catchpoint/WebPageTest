<?php
// Copyright 2023 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/common.inc';
if (!$privateInstall && !$admin) {
    header("HTTP/1.1 403 Unauthorized");
    exit;
}
set_time_limit(0);
$admin = true;

$title = 'WebPageTest - Echo';
require_once INCLUDES_PATH . '/include/admin_header.inc';
echo '<pre>'; print_r($_SERVER); echo '</pre>';
require_once INCLUDES_PATH . '/include/admin_footer.inc';
?>
