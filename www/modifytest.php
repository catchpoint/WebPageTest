<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';

// Handle an AJAX call to update a test ID
if (isset($_POST['label']) && isset($_POST['testID'])) {
    $new_label = $_POST['label'];
    $update_label_result = updateLabel($_POST['testID'], $new_label, $uid, $user, $owner);

    if ($update_label_result !== false) {
        $result = 'Success';
    } else {
        $result = 'Failed to save new label!';
    }
} else {
    $result = 'Invalid options';
}

header('Content-type: application/json');
echo json_encode($result);
