<?php

declare(strict_types=1);

require_once __DIR__ . '/../common.inc';

use WebPageTest\Util;
use WebPageTest\Util\OAuth as CPOauth;
use WebPageTest\RequestContext;

(function (RequestContext $request_context) {
    if (!Util::getSetting('cp_auth')) {
        $protocol = $request_context->getUrlProtocol();
        $host = Util::getSetting('host');
        $route = '/';
        $redirect_uri = "{$protocol}://{$host}{$route}";

        header("Location: {$redirect_uri}");
        exit();
    }

    $cp_access_token_cookie_name = Util::getCookieName(CPOauth::$cp_access_token_cookie_key);
    $cp_refresh_token_cookie_name = Util::getCookieName(CPOauth::$cp_refresh_token_cookie_key);
    $request_method = $request_context->getRequestMethod();

    $protocol = $request_context->getUrlProtocol();
    $host = Util::getSetting('host');
    $redirect_uri = "{$protocol}://{$host}";

    if ($request_method === 'POST') {
        $access_token = $request_context->getUser()->getAccessToken();
        if (!is_null($access_token)) {
            $request_context->getClient()->revokeToken($access_token);
        }

        setcookie($cp_access_token_cookie_name, "", time() - 3600, "/", $host);
        setcookie($cp_refresh_token_cookie_name, "", time() - 3600, "/", $host);
    }

    header("Location: {$redirect_uri}");
    exit();
})($request_context);
