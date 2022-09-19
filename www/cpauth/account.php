<?php

declare(strict_types=1);

require_once(__DIR__ . '/../common.inc');

use WebPageTest\Util;
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

    if ($type == 'contact-info') {
        $body = AccountHandler::validateChangeContactInfo($_POST);
        $redirect_uri = AccountHandler::changeContactInfo($request_context, $body);

        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == 'password') {
        $body = AccountHandler::validateChangePassword($_POST);
        $redirect_uri = AccountHandler::changePassword($request_context, $body);
        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == "account-signup") {
        $body = AccountHandler::validateSubscribeToAccount($_POST);
        $redirect_uri = AccountHandler::subscribeToAccount($request_context, $body);

        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == "account-signup-preview") {
        $response_body = "{}";
        try {
            $body = AccountHandler::validatePreviewCost($_POST);
            $preview = AccountHandler::previewCost($request_context, $body);
            $response_body = json_encode($preview);
        } catch (ClientException $e) {
            $response_body = json_encode([
                'error' => $e->getMessage()
            ]);
        }

        header('Content-type: application/json');
        echo $response_body;
        exit();
    } elseif ($type == "cancel-subscription") {
        $redirect_uri = AccountHandler::cancelSubscription($request_context);
        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == "update-payment-method") {
        throw new ClientException('There was an error.', '/account');
        // AccountHandler::updatePaymentMethod($request_context);
    } elseif ($type == "create-api-key") {
        $body = AccountHandler::validateCreateApiKey($_POST);
        $redirect_uri = AccountHandler::createApiKey($request_context, $body);
        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == "delete-api-key") {
        $body = AccountHandler::validateDeleteApiKey($_POST);
        $redirect_uri = AccountHandler::deleteApiKey($request_context, $body);
        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == "upgrade-plan-1") {
        $body = AccountHandler::validatePlanUpgrade($_POST);
        $redirect_uri = AccountHandler::postPlanUpgrade($request_context, $body);

        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == "upgrade-plan-2") {
        $body = AccountHandler::validatePostUpdatePlanSummary($_POST);
        $redirect_uri = AccountHandler::postUpdatePlanSummary($request_context, $body);

        header("Location: {$redirect_uri}");
        exit();
    } elseif ($type == "resend-verification-email") {
        try {
            $redirect_uri = AccountHandler::resendEmailVerification($request_context);
            $successMessage = array(
                'type' => 'success',
                'text' => 'Email Verification link has been sent.'
            );
            Util::setBannerMessage('form', $successMessage);
            header("Location: {$redirect_uri}");
            exit();
        } catch (Exception $e) {
            error_log($e->getMessage());
            $errorMessage = array(
                'type' => 'error',
                'text' => $e->getMessage()
            );
            Util::setBannerMessage('form', $errorMessage);
            $host = Util::getSetting('host');
            $protocol = $request_context->getUrlProtocol();
            $redirect_uri = "{$protocol}://{$host}/account";
            header("Location: {$redirect_uri}");
            exit();
        }
    } else {
        throw new ClientException("Incorrect post type", "/account");
        exit();
    }
    exit();
}

$page = (string) filter_input(INPUT_GET, 'page', FILTER_SANITIZE_STRING);
$contents = AccountHandler::getAccountPage($request_context, $page);
echo $contents;
exit();
