<?php
// Copyright 2021 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
$privacy_policy = GetSetting('privacy_policy_url');
if ($privacy_policy) {
    header("Location: $privacy_policy");
} else {
    http_response_code(404);
}
