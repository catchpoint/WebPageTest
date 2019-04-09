<?php

function isSslConnection() {
    return ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? true : false;
}

function getUrlProtocol() {
    return isSslConnection() ? 'https' : 'http';
}
?>

