<?php

declare(strict_types=1);

use WebPageTest\CPClient;
use WebPageTest\Util;

(function ($request) {

    $host = Util::getSetting('host');

    $client = new CPClient(Util::getSetting('cp_services_host'), array(
        'auth_client_options' => array(
            'base_uri' => Util::getSetting('cp_auth_host'),
            'client_id' => Util::getSetting('cp_auth_client_id'),
            'client_secret' => Util::getSetting('cp_auth_client_secret'),
            'grant_type' => Util::getSetting('cp_auth_grant_type'),
        )
    ));

  $access_token = null;
  $refresh_token = null;

  if (isset($_COOKIE['cp_access_token']) && $_COOKIE['cp_access_token'] != null) {
    $access_token = $_COOKIE['cp_access_token'];
  }
  if (isset($_COOKIE['cp_refresh_token']) && $_COOKIE['cp_refresh_token'] != null) {
    $refresh_token = $_COOKIE['cp_refresh_token'];
  }

  if (!is_null($access_token)) {
    $client->authenticate($access_token);
  } else if (is_null($access_token) && !is_null($refresh_token)) {
    $auth_token = $client->refreshAuthToken($refresh_token);
    $client->authenticate($auth_token->access_token);
    setcookie('cp_access_token', $auth_token->access_token, time() + $auth_token->expires_in, "/", $host);
    setcookie('cp_refresh_token', $auth_token->refresh_token, time() + 60*60*24*30, "/", $host);
  }

    $request->setClient($client);
})($request_context);

?>
