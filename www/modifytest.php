<?php
include 'common.inc';

// Handle an Ajax call to update a test ID
if (isset($_POST['label'])) {
    $data = array('label' => htmlspecialchars($_POST['label']));
    $update_log_result = updateTestLog($_POST['testID'], (int)$_POST['date'], $data, $uid, $user, $owner);
    $update_info_result = updateTestInfo($_POST['testID'], $data);

    var_dump($update_log_result);
    var_dump($update_info_result);
    if ($update_log_result !== false && $update_info_result !== false) {
        $result = 'Success';
    } else {
        $result = 'Failed to save new label!';
    }
} else {
    $result = 'Invalid options';
}

header('Content-type: application/json');
echo json_encode($result);