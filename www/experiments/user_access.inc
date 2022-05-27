<?php

use WebPageTest\Util;

// experiments permissions checks
$experiments_logged_in = Util::getSetting('cp_auth') && (!is_null($request_context->getClient()) && $request_context->getClient()->isAuthenticated());
$experiments_paid = !is_null($request_context->getUser()) && $request_context->getUser()->isPaid();



?>