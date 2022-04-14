<?php

declare(strict_types=1);

require_once __DIR__ . '/../common.inc';

use WebPageTest\Exception\ClientException;
use WebPageTest\Util;
use WebPageTest\Util\OAuth as CPOAuth;
use WebPageTest\RequestContext;

(function (RequestContext $request_context) {
    $request_method = $request_context->getRequestMethod();

    if ($request_method !== 'POST' && $request_method !== 'GET') {
        throw new Error('Not implemented');
    }

    $host = Util::getSetting('host');
    $protocol = $request_context->getUrlProtocol();
    $redirect_uri = "{$protocol}://{$host}/cpauth";
    $code_verifier_cookie_name = Util::getCookieName('code_verifier');
    $nonce_cookie_name = Util::getCookieName('nonce');

    if ($request_method == 'GET') {
        $cpoauth = new CPOAuth(Util::getSetting('cp_auth_host'), Util::getSetting('cp_auth_client_id'));
        $code_verifier = $cpoauth->getCodeVerifier();
        $nonce = $cpoauth->getNonce();
        setcookie($code_verifier_cookie_name, $code_verifier, time() + 100, '/', $host);
        setcookie($nonce_cookie_name, $nonce, time() + 100, '/', $host);

        $redirect_to = $cpoauth->buildAuthorizeRequest($redirect_uri);

        header("Location: {$redirect_to}");
        exit();
    }

    $code = $_POST['code'];
    $id_token = $_POST['id_token'];
    $code_verifier = $_COOKIE[$code_verifier_cookie_name];
    $nonce = $_COOKIE[$nonce_cookie_name];
    setcookie($code_verifier_cookie_name, '', time() - 3600, '/', $host);
    setcookie($nonce_cookie_name, '', time() - 3600, '/', $host);

    if (!CPOAuth::verifyNonce($id_token, $nonce)) {
        throw new ClientException("There was a problem logging in");
    }

    $auth_token = $request_context->getClient()->login($code, $code_verifier, $redirect_uri);

    $cp_access_token_cookie_name = Util::getCookieName(CPOauth::$cp_access_token_cookie_key);
    $cp_refresh_token_cookie_name = Util::getCookieName(CPOauth::$cp_refresh_token_cookie_key);
    setcookie($cp_access_token_cookie_name, $auth_token->access_token, time() + $auth_token->expires_in, "/", $host);
    setcookie($cp_refresh_token_cookie_name, $auth_token->refresh_token, time() + 60 * 60 * 24 * 30, "/", $host);

    header("Location: {$protocol}://{$host}");

    exit();
})($request_context);
