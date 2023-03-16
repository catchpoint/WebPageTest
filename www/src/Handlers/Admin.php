<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use WebPageTest\RequestContext;
use WebPageTest\Template;
use WebPageTest\Util;
use WebPageTest\Environment;
use Illuminate\Http\Response;
use WebPageTest\Exception\ForbiddenException;
use APCUIterator;

class Admin
{
  /**
   * This should only be available in QA and Dev environments.
   * Does not require Admin credentials.
   *
   * @param RequestContext $request_context
   *
   * @return Response $response
   *
   */
    public static function getChargifySandbox(RequestContext $request_context): Response
    {
        $response = new Response();
        $environment = $request_context->getEnvironment();
        if (!($environment == Environment::$Development || $environment == Environment::$QA)) {
            throw new ForbiddenException();
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
        $response->setContent($contents);
        return $response;
    }


    /**
     * REQUIRES ADMIN CREDENTIALS
     *
     **/
    public static function cacheCheck(RequestContext $request_context): Response
    {
        $response = new Response();
        $current_user = $request_context->getUser();

        if (is_null($current_user)) {
            throw new ForbiddenException();
        }

        if (!$current_user->isAdmin()) {
            throw new ForbiddenException();
        }
        $iter = new APCUIterator('/rladdr_per_month/');
        $content = "";
        $content .= "<body>";
        $content .= "<h1>";
        $content .= "Total count: {$iter->getTotalCount()}";
        $content .= "</h1>";
        $content .= '<pre>';
        foreach ($iter as $val) {
            $content .= "$val[key]: " . implode("\n", $val['value']) . "\n";
        }
        $content .= '</pre>';
        $content .= "</body>";

        $response->setContent($content);

        return $response;
    }
}
