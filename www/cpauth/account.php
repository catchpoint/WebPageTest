<?php

declare(strict_types=1);

require_once(__DIR__ . '/../common.inc');

use WebPageTest\Template;
use WebPageTest\Util;
use WebPageTest\ValidatorPatterns;
use WebPageTest\Exception\ClientException;
use WebPageTest\Handlers\Account as AccountHandler;

if (!Util::getSetting('cp_auth')) {
    $protocol = $request_context->getUrlProtocol();
    $host = Util::getSetting('host');
    $route = '/';
    $redirect_uri = "{$protocol}://{$host}{$route}";

    header("Location: {$redirect_uri}");
    exit();
}

$access_token = $request_context->getUser()->getAccessToken();
if (is_null($access_token)) {
    $protocol = $request_context->getUrlProtocol();
    $host = Util::getSetting('host');
    $route = '/login';
    $query = http_build_query(["redirect_uri" => "/account"]);
    $redirect_uri = "{$protocol}://{$host}{$route}?{$query}";

    header("Location: {$redirect_uri}");
    exit();
}

$request_method = strtoupper($_SERVER['REQUEST_METHOD']);

if ($request_method !== 'POST' && $request_method !== 'GET') {
    throw new ClientException("HTTP Method not supported for this endpoint", "/");
}

if ($request_method === 'POST') {
    $type = filter_input(INPUT_POST, 'type', FILTER_SANITIZE_STRING);

    if ($type == 'contact_info') {
        AccountHandler::changeContactInfo($request_context);
    } elseif ($type == 'password') {
        AccountHandler::changePassword($request_context);
    } elseif ($type == "account-signup") {
        AccountHandler::subscribeToAccount($request_context);
    } elseif ($type == "account-signup-preview") {
        AccountHandler::previewCost($request_context);
    } elseif ($type == "cancel-subscription") {
        AccountHandler::cancelSubscription($request_context);
    } elseif ($type == "update-payment-method") {
        AccountHandler::updatePaymentMethod($request_context);
    } elseif ($type == "create-api-key") {
        try {
            $name = filter_input(INPUT_POST, 'api-key-name', FILTER_SANITIZE_STRING);
            $request_context->getClient()->createApiKey($name);
            $protocol = $request_context->getUrlProtocol();
            $host = Util::getSetting('host');
            $route = '/account#api-consumers';
            $redirect_uri = "{$protocol}://{$host}{$route}";

            header("Location: {$redirect_uri}");
            exit();
        } catch (Exception $e) {
            error_log($e->getMessage());
            throw new ClientException($e->getMessage(), "/account");
        }
    } elseif ($type == "delete-api-key") {
        AccountHandler::deleteApiKey($request_context);
    } elseif ($type == "upgrade-plan-1") {
        $body = AccountHandler::validatePlanUpgrade();
        $redirect_uri = AccountHandler::postPlanUpgrade($request_context);

        $host = Util::getSetting('host');
        setcookie('upgrade-plan', $body->plan, time() + (5 * 60), "/", $host);

        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == "upgrade-plan-2") {
        $body = [
            'plan' => $_POST['plan'],
            'subscription_id' => $_POST['subscription_id']
        ];
        $redirect_uri = AccountHandler::postUpdatePlanSummary($request_context, $body);

        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == "resend-verification-email") {
        try {
            $request_context->getClient()->resendEmailVerification();

            $protocol = $request_context->getUrlProtocol();
            $host = Util::getSetting('host');
            $route = '/account';
            $redirect_uri = "{$protocol}://{$host}{$route}";

            header("Location: {$redirect_uri}");
            exit();
        } catch (Exception $e) {
            error_log($e->getMessage());
            throw new ClientException("There was an error", "/account");
        }
    } else {
        throw new ClientException("Incorrect post type", "/account");
        exit();
    }
    exit();
}

AccountHandler::getAccountPage($request_context);
