<?php

declare(strict_types=1);

use WebPageTest\RequestContext;
use WebPageTest\Exception\ClientException;

(function (RequestContext $request) {
  /**
   * Gate this for account stuff only, for now
   */
    if (
        str_contains($request->getRequestUri(), "account") ||
        str_contains($request->getRequestUri(), "signup") ||
        str_contains($request->getRequestUri(), "logout")
    ) {
        $request_method = $request->getRequestMethod();
        if ($request_method == 'POST') {
            $csrf_token = filter_input(INPUT_POST, 'csrf_token', FILTER_SANITIZE_STRING);
            if ($csrf_token !== $_SESSION['csrf_token']) {
                throw new ClientException("Invalid CSRF Token", $request->getRequestUri());
            }
        } elseif ($request_method == 'GET') {
            unset($_SESSION['csrf_token']);
            $_SESSION['csrf_token'] = bin2hex(random_bytes(35));
        }
    }
})($request_context);
