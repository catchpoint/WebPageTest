<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';

use WebPageTest\Util;

global $admin;

if (
  (isset($request_context->getUser()) && $request_context->getUser()->isAdmin()) ||
  $admin
) {
  $host = Util::getSetting('host');
  header("Location: https://{$host}");
  exit();
}

error_reporting(-1);

$db = new SQLite3('./dat/labels.db');
$results = $db->query('SELECT * FROM labels');

// Some really basic CSS for the table
?>
<style>
    table {
        border-collapse: collapse;
    }
    th,td {
        padding:10px;
        border:1px solid gray;
    }

</style>

<?php
echo '<table>';
echo '<tr><th>Test ID</th><th>Label</th><th>User</th></tr>';
while ($row = $results->fetchArray()) {
    echo "<tr><td>" . $row['test_id'] . "</td><td>" . $row['label'] . "</td><td>" . $row['user_updated'] . "</td></tr>";
}
echo '</table>';