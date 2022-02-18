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

  $cache_info = apcu_cache_info();
  $list = $cache_info['cache_list'];
  $infos = array_map(fn($val) => $val['info'], $list);
  $filtered = array_filter($infos, function($k) {
    return preg_match('/rladdr_per_month/', $k);
  });

  echo '<pre>';
  echo var_dump($filtered);
  echo '</pre>';
  exit();


})($request_context);
