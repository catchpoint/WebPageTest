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

$hidden = ["argv", "REDIRECT_DOCUMENT_ROOT", "DOCUMENT_ROOT","CONTEXT_DOCUMENT_ROOT","SCRIPT_FILENAME","ORIG_PATH_TRANSLATED","SERVER_ADMIN","SERVER_SOFTWARE","PATH","REDIRECT_HANDLER"];
foreach($hidden as $x) {
  unset($_SERVER[$x]);
}
echo '<pre>'; print_r($_SERVER); echo '</pre>';

require_once INCLUDES_PATH . '/include/admin_footer.inc';
?>
