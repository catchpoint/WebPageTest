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
    $redirect_uri = "{$protocol}://{$host}{$route}?redirect_uri={$protocol}://{$host}/account";

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
            $route = '/account';
            $redirect_uri = "{$protocol}://{$host}{$route}";

            header("Location: {$redirect_uri}");
            exit();
        } catch (Exception $e) {
            error_log($e->getMessage());
            throw new ClientException($e->getMessage(), "/account");
        }
    } elseif ($type == "delete-api-key") {
        AccountHandler::deleteApiKey($request_context);
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
} elseif ($request_method == 'GET') {
    $error_message = $_SESSION['client-error'] ?? null;

    $is_paid = $request_context->getUser()->isPaid();
    $is_verified = $request_context->getUser()->isVerified();
    $is_wpt_enterprise = $request_context->getUser()->isWptEnterpriseClient();
    $user_id = $request_context->getUser()->getUserId();
    $user_contact_info = $request_context->getClient()->getUserContactInfo($user_id);
    $user_email = $request_context->getUser()->getEmail();
    $first_name = $user_contact_info['firstName'] ?? "";
    $last_name = $user_contact_info['lastName'] ?? "";
    $company_name = $user_contact_info['companyName'] ?? "";

    $contact_info = array(
        'layout_theme' => 'b',
        'is_paid' => $is_paid,
        'is_verified' => $is_verified,
        'first_name' => htmlspecialchars($first_name),
        'last_name' => htmlspecialchars($last_name),
        'email' => $user_email,
        'company_name' => htmlspecialchars($company_name),
        'id' => $user_id
    );

    $billing_info = array();
    $client_token = "";
    $country_list = Util::getCountryList();

    if ($is_paid) {
        if ($is_wpt_enterprise) {
            $billing_info = $request_context->getClient()->getPaidEnterpriseAccountPageInfo();
        } else {
            $billing_info = $request_context->getClient()->getPaidAccountPageInfo();
        }
        $customer_details = $billing_info['braintreeCustomerDetails'];
        $billing_frequency = $customer_details['billingFrequency'] == 12 ? "Annually" : "Monthly";

        if (isset($customer_details['planRenewalDate']) && $billing_frequency == "Annually") {
            $runs_renewal_date = new DateTime($customer_details['planRenewalDate']);
            $billing_info['runs_renewal'] = $runs_renewal_date->format('m/d/Y');
        }

        if (isset($customer_details['nextBillingDate'])) {
            $plan_renewal_date = new DateTime($customer_details['nextBillingDate']);
            $billing_info['plan_renewal'] = $plan_renewal_date->format('m/d/Y');
        }

        $billing_info['is_wpt_enterprise'] = $is_wpt_enterprise;
        $billing_info['is_canceled'] = str_contains($customer_details['status'], 'CANCEL');
        $billing_info['billing_frequency'] = $billing_frequency;
        $client_token = $billing_info['braintreeClientToken'];
    } else {
        $info = $request_context->getClient()->getUnpaidAccountpageInfo();
        $client_token = $info['braintreeClientToken'];
        $plans = $info['wptPlans'];
        $annual_plans = array();
        $monthly_plans = array();
        usort($plans, function ($a, $b) {
            if ($a['price'] == $b['price']) {
                return 0;
            }
            return ($a['price'] < $b['price']) ? -1 : 1;
        });
        foreach ($plans as $plan) {
            if ($plan['billingFrequency'] == 1) {
                $plan['price'] = number_format(($plan['price']), 2, ".", ",");
                $plan['annual_price'] = number_format(($plan['price'] * 12.00), 2, ".", ",");
                $monthly_plans[] = $plan;
            } else {
                $plan['annual_price'] = number_format(($plan['price']), 2, ".", ",");
                $plan['monthly_price'] = number_format(($plan['price'] / 12.00), 2, ".", ",");
                $annual_plans[] = $plan;
            }
        }
        $billing_info = array(
            'annual_plans' => $annual_plans,
            'monthly_plans' => $monthly_plans
        );
    }

    $results = array_merge($contact_info, $billing_info);
    $results['csrf_token'] = $_SESSION['csrf_token'];
    $results['validation_pattern'] = ValidatorPatterns::getContactInfo();
    $results['validation_pattern_password'] = ValidatorPatterns::getPassword();
    $results['bt_client_token'] = $client_token;
    $results['country_list'] = $country_list;

    if (!is_null($error_message)) {
        $results['error_message'] = $error_message;
        unset($_SESSION['client-error']);
    }

    $tpl = new Template('account');
    $tpl->setLayout('account');
    echo $tpl->render('my-account', $results);
    exit();
} else {
    throw new ClientException("HTTP Method not supported for this endpoint", "/");
    exit();
}
