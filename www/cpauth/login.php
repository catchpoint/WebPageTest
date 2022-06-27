<?php

declare(strict_types=1);

require_once __DIR__ . '/../common.inc';

use WebPageTest\Util;

$host = Util::getSetting('host');

if (!Util::getSetting('cp_auth')) {
    $protocol = $request_context->getUrlProtocol();
    $route = '/';
    $redirect_uri = "{$protocol}://{$host}{$route}";

    header("Location: {$redirect_uri}");
    exit();
}

$auth_host = Util::getSetting('cp_auth_host');
$redirect_uri = "{$auth_host}/auth/WptAccount/Login?ReturnUrl=https://{$host}/cpauth";

header("Location: $redirect_uri");
exit();
