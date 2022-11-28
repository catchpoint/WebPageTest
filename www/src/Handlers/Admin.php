<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use WebPageTest\RequestContext;
use WebPageTest\Template;
use WebPageTest\Util;
use WebPageTest\Environment;

class Admin
{
  /**
   * This should only be available in QA and Dev environments.
   * Does not require Admin credentials.
   *
   * @param WebPageTest\RequestContext $request_context
   *
   * @return string $contents the contents of the page
   *
   */
    public static function getChargifySandbox(RequestContext $request_context): string
    {
        $environment = $request_context->getEnvironment();
        if (!($environment == Environment::$Development || $environment == Environment::$QA)) {
            http_response_code(404);
            die();
        }

        $tpl = new Template('admin');
        $tpl->setLayout('account');

        $variables = [
        'country_list' => Util::getChargifyCountryList(),
        'state_list' => Util::getChargifyUSStateList(),
        'country_list_json_blob' => Util::getCountryJsonBlob(),
        'ch_client_token' => Util::getSetting('ch_key_public'),
        'ch_site' => Util::getSetting('ch_site')
        ];
        $contents = $tpl->render('chargify-sandbox', $variables);
        return $contents;
    }
}
