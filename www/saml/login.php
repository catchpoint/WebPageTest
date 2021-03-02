<?php
chdir('..');
include 'common.inc';

header("Cache-Control: no-store, max-age=0");

// Store the referer page in a session cookie and redirect to the saml login
if (isset($_SERVER["HTTP_REFERER"])) {
    setcookie('samlsrc', base64_encode($_SERVER["HTTP_REFERER"]));
}
$login_url = GetSetting('saml_login', null);
if (isset($login_url) && is_string($login_url) && strlen($login_url)) {
    $protocol = getUrlProtocol();
    $url = getUrlProtocol() . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    $login_url .= '?return_path=' . urlencode(str_replace('login.php', 'response.php', $url));
    header("Location: $login_url");
}
