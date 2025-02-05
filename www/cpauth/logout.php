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

    $protocol = $request_context->getUrlProtocol();
    $host = Util::getSetting('host');
    $redirect_uri = "{$protocol}://{$host}";

    try {
        $access_token = $request_context->getUser()->getAccessToken();
        if (!is_null($access_token)) {
            $request_context->getClient()->revokeToken($access_token);
        }
    } finally {
        setcookie($cp_access_token_cookie_name, "", time() - 3600, "/", $host);
        setcookie($cp_refresh_token_cookie_name, "", time() - 3600, "/", $host);

        // Destroy the session
        $_SESSION = array();

        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }

        session_destroy();
    }

    header("Location: {$redirect_uri}");
    exit();
})($request_context);
