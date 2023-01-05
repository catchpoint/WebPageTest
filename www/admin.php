<?php

declare(strict_types=1);

require_once __DIR__ . '/common.inc';

use WebPageTest\Handlers\Admin as AdminHandler;

$page = (string) filter_input(INPUT_GET, 'page', FILTER_SANITIZE_STRING);
switch ($page) {
    case ('chargify-sandbox'):
        $contents = AdminHandler::getChargifySandbox($request_context);
        echo $contents;
        exit();
    default:
        http_response_code(404);
        die();
}
