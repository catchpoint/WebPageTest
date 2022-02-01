<?php declare(strict_types=1);

require_once __DIR__ . '/../common_lib.inc';

use WebPageTest\CPClient;

(function($request) {

  $client = new CPClient(GetSetting('cp_services_host'), array(
    'auth_client_options' => array(
      'base_uri' => GetSetting('cp_auth_host'),
      'client_id' => GetSetting('cp_auth_client_id'),
      'client_secret' => GetSetting('cp_auth_client_secret'),
      'grant_type' => GetSetting('cp_auth_grant_type'),
    )
  ));

  $request->setClient($client);
})($request);

?>
