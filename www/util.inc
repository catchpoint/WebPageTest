<?php

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
