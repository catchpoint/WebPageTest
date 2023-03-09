<?php

declare(strict_types=1);

use WebPageTest\RequestContext;
use WebPageTest\CPSignupClient;
use WebPageTest\Util;

(function (RequestContext $request) {
    $client = new CPSignupClient(array(
      'base_uri' => Util::getSetting('cp_auth_login_verification_host'),
      'redirect_base_uri' => Util::getSetting('cp_auth_host'),
      'client_id' => Util::getSetting('cp_signup_client_id'),
      'client_secret' => Util::getSetting('cp_signup_client_secret'),
      'grant_type' => Util::getSetting('cp_signup_grant_type'),
      'gql_uri' => Util::getSetting('cp_signup_service_host')
    ));

    $request->setSignupClient($client);
})($request_context);
