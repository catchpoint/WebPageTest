<?php
include 'common.inc';

error_reporting(-1);

// Only allow admins to view this data
if (empty($settings['enable_google_csi'])) {
    die('Not Authorized');
}

$db = new SQLite3('./dat/labels.db');
$results = $db->query('SELECT * FROM labels');

// Some really basic CSS for the table
?>
<style type="text/css">
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