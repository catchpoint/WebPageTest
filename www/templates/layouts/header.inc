<?php

declare(strict_types=1);

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
use WebPageTest\Util;

require_once INCLUDES_PATH . '/page_data.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestResults.php';
require_once INCLUDES_PATH . '/include/TestRunResults.php';

if (!isset($noanalytics)) {
    require_once __DIR__ . '/google-tag-manager-noscript.inc';
}

if (isset($testPath)) {
    $testInfo = TestInfo::fromFiles($testPath);
    $testResults = TestResults::fromFiles($testInfo);
}

// For users that aren't logged in, include details about the test so it can be stored in indexdb for local history support
if (
    $id && isset($test) && is_array($test) &&
        isset($test['testinfo']['created']) &&
        isset($test['testinfo']['url']) &&
        !isset($user) && !isset($_COOKIE['google_email'])
) {
    $history = array(
        'id' => $id,
        'url' => $test['testinfo']['url'],
        'created' => $test['testinfo']['created'],
        'location' => isset($test['testinfo']['locationText']) ? $test['testinfo']['locationText'] : '',
        'runs' => isset($test['testinfo']['runs']) ? $test['testinfo']['runs'] : 1,
        'label' => isset($test['testinfo']['label']) ? $test['testinfo']['label'] : '',
        'video' => $test['testinfo']['video'] ? true : false
    );
    $history_json = json_encode($history);
    echo "\n<script>\nconst wptTestInfo=$history_json;\n</script>\n";
}

// If $tab is null, make it an empty string for strcasecmp
$tab ??= "";

if (EMBED) {
  // You don't need a header
    return;
}
?>

<?php
$alert = Util::getSetting('alert');
// in settings.ini add alert_expiration as a non unix timestamp '2021-11-17 13:02:18'
$alert_expiration = Util::getSetting('alert_expiration');
if (isset($client_error)) {
    echo '<div class="error-banner">' . $client_error . '</div>';
} elseif ($alert && $alert_expiration && new DateTime() < new DateTime($alert_expiration)) {
    echo '<div class="alert-banner">' . $alert . '</div>';
} elseif ($alert && empty($alert_expiration)) {
    echo '<div class="alert-banner">' . $alert . '</div>';
}

require_once __DIR__ . '/includes/wpt-header.php';

