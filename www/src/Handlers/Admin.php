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

    public static function getTestInfo(RequestContext $request_context): Response
    {

        // psalm workaround
        if (!function_exists('GetTestInfo')) {
            function GetTestInfo()
            {
                return 'no GetTestInfo() in sight';
            }
        }

        $response = new Response();
        $current_user = $request_context->getUser();
        if (is_null($current_user)) {
            throw new ForbiddenException();
        }

        if (!$current_user->isAdmin()) {
            throw new ForbiddenException();
        }

        $raw = $request_context->getRaw();
        if (empty($raw['test'])) {
            $response->setContent('Please pass a test id like &test=221103_ABC123_ABC');
        } else {
            $info = GetTestInfo($raw['test']);
            if (!empty($raw['f']) && $raw['f'] === 'json') {
                header('Content-type: application/json; charset=utf-8');
                $response->setContent(json_encode($info));
            } else {
                dd($info);
            }
        }

        return $response;
    }

    public static function getBrowsers(RequestContext $request_context): Response
    {

        $response = new Response();
        $current_user = $request_context->getUser();
        if (is_null($current_user)) {
            throw new ForbiddenException();
        }

        if (!$current_user->isAdmin()) {
            throw new ForbiddenException();
        }

        $locations = Util\SettingsFileReader::ini('locations.ini', true);

        ob_start();
        $title = 'WebPageTest - configured browsers';
        require_once INCLUDES_PATH . '/include/admin_header.inc';
        foreach ($locations as $name => $loc) {
            if ($loc['browser']) {
                echo '<details open>';
                echo sprintf('<summary>%s (%s)</summary>', $loc['label'], $name);
                echo '<ul><li>';
                $b = explode(',', $loc['browser']);
                echo implode('</li><li>', $b);
                echo '</li></ul>';
                echo '</details>';
            }
        }
        require_once INCLUDES_PATH . '/include/admin_footer.inc';
        $content = ob_get_contents();
        ob_end_clean();

        $response->setContent($content);
        return $response;
    }
}
