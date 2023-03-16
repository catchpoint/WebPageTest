<?php

declare(strict_types=1);

require_once __DIR__ . '/common.inc';

use WebPageTest\Handlers\Admin as AdminHandler;
use WebPageTest\RequestContext;

(function (RequestContext $request_context) {
    $page = (string) filter_input(INPUT_GET, 'page', FILTER_UNSAFE_RAW);
    switch ($page) {
        case ('chargify-sandbox'):
            $response = AdminHandler::getChargifySandbox($request_context);
            $response->send();
            exit();
        case ('cache-check'):
            $response = AdminHandler::cacheCheck($request_context);
            $response->send();
            exit();
        default:
            http_response_code(404);
            die();
    }
})($request_context);
