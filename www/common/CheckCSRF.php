<?php

declare(strict_types=1);

use WebPageTest\RequestContext;
use WebPageTest\Exception\ClientException;

(function (RequestContext $request) {
    $request_method = $request->getRequestMethod();
    if ($request_method == 'POST') {
        $csrf_token = filter_input(INPUT_POST, 'csrf_token', FILTER_SANITIZE_STRING);
        if ($csrf_token !== $_SESSION['csrf_token']) {
            throw new ClientException("Invalid CSRF Token", $request->getRequestUri());
        }
    } elseif ($request_method == 'GET') {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(35));
    }
})($request_context);
