<?php

declare(strict_types=1);

require_once __DIR__ . '/../common.inc';

use WebPageTest\RequestContext;
use WebPageTest\Util;
use WebPageTest\Exception\ClientException;
use WebPageTest\Template;

(function (RequestContext $request_context) {
    if (!Util::getSetting('cp_auth')) {
        $protocol = $request_context->getUrlProtocol();
        $host = Util::getSetting('host');
        $route = '/';
        $redirect_uri = "{$protocol}://{$host}{$route}";

        header("Location: {$redirect_uri}");
        exit();
    }

    $request_method = strtoupper($_SERVER['REQUEST_METHOD']);

    if ($request_method == 'POST') {
        exit();
    } elseif ($request_method == 'GET') {
        $csrf_token = bin2hex(random_bytes(32));
        $_SERVER['csrf_token'] = $csrf_token;

        $vars = array(
        'csrf_token' => $csrf_token
        );
        $tpl = new Template('account');
        echo $tpl->render('signup', $vars);
        exit();
    } else {
        throw new ClientException("Method not supported on this endpoint");
    }
})($request_context);
