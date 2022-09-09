<?php

declare(strict_types=1);

use WebPageTest\RequestContext;
use WebPageTest\BannerMessageManager;

(function (RequestContext $request) {
    $mgr = new BannerMessageManager();
    $request->setBannerMessageManager($mgr);
})($request_context);
