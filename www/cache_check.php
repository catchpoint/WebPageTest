<?php

declare(strict_types=1);

require_once __DIR__ . '/common.inc';

use WebPageTest\RequestContext;

(function(RequestContext $request_context) {
  global $admin;

  $allowed = $admin || $request_context->getUser()->isAdmin();

  if (!$allowed) {
    header('HTTP/1.1 404 Not Found');
    exit();
  }

  print_r(apcu_cache_info());
  exit();


})($request_context);
