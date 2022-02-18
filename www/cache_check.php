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

  echo '<pre>';
  echo print_r(apcu_cache_info());
  echo '</pre>';
  exit();


})($request_context);
