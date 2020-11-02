<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

function isSslConnection() {
    return (
        (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') ||
        (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On') ||
        (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] == "https")
    ) ? true : false;
}

function getUrlProtocol() {
    return isSslConnection() ? 'https' : 'http';
}
?>
