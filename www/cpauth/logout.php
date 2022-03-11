<?php

declare(strict_types=1);

require_once __DIR__ . '/../util.inc';
require_once __DIR__ . '/../common.inc';

use WebPageTest\Util;

$request_method = strtoupper($_SERVER['REQUEST_METHOD']);

if ($request_method === 'POST') {
    $protocol = getUrlProtocol();
    $host = Util::getSetting('host');

    $access_token = $request_context->getUser()->getAccessToken();
    $request_context->getClient()->revokeToken($access_token);

    setcookie("cp_access_token", "", time() - 3600, "/", $host);
    setcookie("cp_refresh_token", "", time() - 3600, "/", $host);

    $redirect_uri = isset($_GET["redirect_uri"]) ? htmlspecialchars($_GET["redirect_uri"]) : "{$protocol}://{$host}";

    header("Location: {$redirect_uri}");
    exit();
} else {
    $redirect_uri = isset($_GET["redirect_uri"]) ? htmlspecialchars($_GET["redirect_uri"]) : "{$protocol}://{$host}";

    header("Location: {$redirect_uri}");
    exit();
}
