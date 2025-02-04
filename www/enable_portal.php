<?php

// Copyright 2024 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';

use WebPageTest\Util;

if (!isset($request_context)) {
    header("Location: /");
    return;
}

$user = $request_context->getUser();
if (is_null($user)) {
    header("Location: /");
    return;
}

if ($user->isAnon()) {
    header("Location: /");
    return;
}

if ($user->isFree() && !Util::getSetting('cp_portal_enable_free')) {
    header("Location: /");
    return;
}

if ($user->isPaid() && !Util::getSetting('cp_portal_enable_pro')) {
    header("Location: /");
    return;
}

$value = isset($req_value) ? (bool) $req_value : true;
$client =  $request_context->getClient();
$portal_enabled = $client->enablePortalPreview($value);
$location = $portal_enabled ? Util::getSetting('cp_portal_url') : '/';

header('Location: ' . $location);
return;
