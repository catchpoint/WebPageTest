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

$error_message = $_SESSION['client-error'] ?? null;

$is_paid = $request_context->getUser()->isPaid();
$is_verified = $request_context->getUser()->isVerified();
$is_wpt_enterprise = $request_context->getUser()->isWptEnterpriseClient();
$user_id = $request_context->getUser()->getUserId();
$remainingRuns = $request_context->getUser()->getRemainingRuns();
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
$country_list = Util::getChargifyCountryList();
$state_list = Util::getChargifyUSStateList();

if ($is_paid) {
    if ($is_wpt_enterprise) {
        $billing_info = $request_context->getClient()->getPaidEnterpriseAccountPageInfo();
    } else {
        $billing_info = [
            'wptApiKey' => $request_context->getClient()->getApiKeys(),
            'wptCustomer' => $request_context->getClient()->getWptCustomer(),
        ];
        $subId = $billing_info['wptCustomer']->getSubscriptionId();
        $billing_info['transactionHistory'] = $request_context->getClient()->getTransactionHistory($subId);
    }
    $customer = $billing_info['wptCustomer'];
    $billing_frequency = $customer->getBillingFrequency() == 12 ? "Annually" : "Monthly";

    if (!is_null($customer->getPlanRenewalDate()) && $billing_frequency == "Annually") {
        $billing_info['runs_renewal'] = $customer->getPlanRenewalDate()->format('m/d/Y');
    }

    if (!is_null($customer->getNextBillingDate())) {
        $billing_info['plan_renewal'] = $customer->getNextBillingDate()->format('m/d/Y');
    }

    $billing_info['is_wpt_enterprise'] = $is_wpt_enterprise;
    $billing_info['status'] = $customer->getStatus();
    $billing_info['is_canceled'] = $customer->isCanceled();
    $billing_info['billing_frequency'] = $billing_frequency;
    $billing_info['cc_image_url'] = $customer->getCCImageUrl();
    $billing_info['masked_cc'] = $customer->getMaskedCreditCard();
    $billing_info['cc_expiration'] = $customer->getCCExpirationDate();
}
$plans = $request_context->getClient()->getWptPlans();
$annual_plans = array();
$monthly_plans = array();
usort($plans, function ($a, $b) {
    if ($a->getPrice() == $b->getPrice()) {
        return 0;
    }
    return ($a->getPrice() < $b->getPrice()) ? -1 : 1;
});
foreach ($plans as $plan) {
    if ($plan->getBillingFrequency() == "Monthly") {
        $monthly_plans[] = $plan;
    } else {
        $annual_plans[] = $plan;
    }
}
$plansList = array(
    'annual_plans' => $annual_plans,
    'monthly_plans' => $monthly_plans
);
$results = array_merge($contact_info, $billing_info, $plansList);
$results['csrf_token'] = $_SESSION['csrf_token'];
$results['validation_pattern'] = ValidatorPatterns::getContactInfo();
$results['validation_pattern_password'] = ValidatorPatterns::getPassword();
$results['country_list'] = $country_list;
$results['state_list'] = $state_list;
$results['country_list_json_blob'] = Util::getCountryJsonBlob();
$results['remainingRuns'] = $remainingRuns;

if (!is_null($error_message)) {
    $results['error_message'] = $error_message;
    unset($_SESSION['client-error']);
}
// DELETE ME LATER
$formBannerMessage = array(
    'type' => 'success',
    'text' => 'Your plan has successfully been updated!'
);
Util::set_banner_message('form', $formBannerMessage);

$formBannerMessage2 = array(
    'type' => 'info',
    'text' => 'Important Information about your account'
);
Util::set_banner_message('form', $formBannerMessage2);

$formBannerMessage3 = array(
    'type' => 'error',
    'text' => 'OH NO!'
);
Util::set_banner_message('form', $formBannerMessage3);

$formBannerMessage4 = array(
    'type' => 'warning',
    'text' => 'Running low on runs. <a href="#">upgrade today</a>'
);
Util::set_banner_message('form', $formBannerMessage4);


// get any messages
$results['messages'] = Util::get_banner_message();
$page = (string) filter_input(INPUT_GET, 'page', FILTER_SANITIZE_STRING);
$tpl = new Template('account');
$tpl->setLayout('account');

switch ($page) {
    case 'update_billing':
        echo $tpl->render('billing/billing-cycle', $results);
        break;
    case 'update_plan':
        echo $tpl->render('plans/upgrade-plan', $results);
        break;
    case 'plan_summary':
        $planCookie = $_COOKIE['upgrade-plan'];
        if (isset($planCookie) && $planCookie) {
            $results['plan'] = Util::getPlanFromArray($planCookie, $plans);
            if ($is_paid) {
                echo $tpl->render('plans/plan-summary-upgrade', $results);
            } else {
                $results['ch_client_token'] = Util::getSetting('ch_key_public');
                $results['ch_site'] = Util::getSetting('ch_site');
                echo $tpl->render('plans/plan-summary', $results);
            }
            break;
        } else {
            throw new ClientException("No plan chosen", $request->getRequestUri());
            break;
        }
    default:
        echo $tpl->render('my-account', $results);
        break;
}

exit();
