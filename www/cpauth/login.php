<?php

declare(strict_types=1);

require_once __DIR__ . '/../common.inc';

use WebPageTest\Util;

$auth_host = Util::getSetting('cp_auth_host');
$redirect_uri = "$auth_host/auth/WptAccount/Login";

header("Location: $redirect_uri");
