<?php

declare(strict_types=1);

use WebPageTest\RequestContext;
use Predis\Client as RedisClient;
use WebPageTest\Util;

(function (RequestContext $request) {
    $client = new RedisClient([
        'scheme' => 'tcp',
        'host'   => Util::getSetting('redis_api_keys'),
        'port'   => 6379,
    ]);

    $request->setRedisClient($client);
})($request_context);
