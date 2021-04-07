<?php
chdir('..');
include 'common.inc';

header("Cache-Control: no-store, max-age=0");

// Store the referer page in a session cookie and redirect to the saml login
$url = getUrlProtocol() . '://' . $_SERVER['HTTP_HOST'] . '/';
//if (isset($_SERVER["HTTP_REFERER"]) && strlen($_SERVER["HTTP_REFERER"])) {
//    $url = $_SERVER["HTTP_REFERER"];
//}
// Set the cookie into the past
$saml_cookie = GetSetting('saml_cookie', 'samlu');
setcookie($saml_cookie, "", time() - 3600, '/'); 
header('Clear-Site-Data: "cache", "cookies", "storage", "executionContexts"');
header("Location: $url");
