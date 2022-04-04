<?php

declare(strict_types=1);

require_once(__DIR__ . '/../common.inc');

use Respect\Validation\Rules;
use Respect\Validation\Exceptions\NestedValidationException;

use WebPageTest\Template;
use WebPageTest\Util;
use WebPageTest\ValidatorPatterns;
use WebPageTest\Exception\ClientException;
use WebPageTest\RequestContext;
use Braintree\Gateway as BraintreeGateway;


if (!Util::getSetting('cp_auth')) {
    $protocol = $request_context->getUrlProtocol();
    $host = Util::getSetting('host');
    $route = '/';
    $redirect_uri = "{$protocol}://{$host}{$route}";

    header("Location: {$redirect_uri}");
    exit();
}

$gateway = new BraintreeGateway([
  'environment' => Util::getSetting('bt_environment'),
  'merchantId' => Util::getSetting('bt_merchant_id'),
  'publicKey' => Util::getSetting('bt_api_key_public'),
  'privateKey' => Util::getSetting('bt_api_key_private')
]);


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

if ($request_method === 'POST') {
    $csrf_token = filter_input(INPUT_POST, 'csrf_token', FILTER_SANITIZE_STRING);
    if ($csrf_token !== $_SESSION['csrf_token']) {
        throw new ClientException("Invalid CSRF Token", "/account");
    }

    $type = filter_input(INPUT_POST, 'type', FILTER_SANITIZE_STRING);

    if ($type == 'contact_info') {
        changeContactInfo($request_context);
    } elseif ($type == 'password') {
        changePassword($request_context);
    } elseif ($type == "account-signup") {
        subscribeToAccount($request_context);
    } elseif ($type == "cancel-subscription") {
        cancelSubscription($request_context);
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
            throw new ClientException("There was an error", "/account");
        }
    } elseif ($type == "delete-api-key") {
        try {
            $id = filter_input(INPUT_POST, 'api-key-id', FILTER_SANITIZE_NUMBER_INT);
            $request_context->getClient()->deleteApiKey(intval($id));

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
    $_SESSION['csrf_token'] = bin2hex(random_bytes(35));
    $error_message = $_SESSION['client-error'] ?? null;

    $is_paid = $request_context->getUser()->isPaid();
    $is_verified = $request_context->getUser()->isVerified();
    $user_id = $request_context->getUser()->getUserId();
    $user_contact_info = $request_context->getClient()->getUserContactInfo($user_id);

    $contact_info = array(
    'layout_theme' => 'b',
    'is_paid' => $is_paid,
    'is_verified' => $is_verified,
    'first_name' => htmlspecialchars($user_contact_info['firstName']),
    'last_name' => htmlspecialchars($user_contact_info['lastName']),
    'email' => $request_context->getUser()->getEmail(),
    'company_name' => htmlspecialchars($user_contact_info['companyName']),
    'id' => $request_context->getUser()->getUserId()
    );

    $billing_info = array();
    $client_token = "";

    if ($is_paid) {
        $billing_info = $request_context->getClient()->getPaidAccountPageInfo();
        $billing_frequency = $billing_info['braintreeCustomerDetails']['billingFrequency'] == 12 ? "Annually" : "Monthly";

        if (isset($billing_info['braintreeCustomerDetails']['planRenewalDate']) && $billing_frequency == "Annually") {
            $runs_renewal_date = new DateTime($billing_info['braintreeCustomerDetails']['planRenewalDate']);
            $billing_info['runs_renewal'] = $runs_renewal_date->format('m/d/Y');
        }

        if (isset($billing_info['braintreeCustomerDetails']['nextBillingDate'])) {
            $plan_renewal_date = new DateTime($billing_info['braintreeCustomerDetails']['nextBillingDate']);
            $billing_info['plan_renewal'] = $plan_renewal_date->format('m/d/Y');
        }

        $billing_info['billing_frequency'] = $billing_frequency;
        $client_token = $gateway->clientToken()->generate($billing_info['braintreeCustomerDetails']['customerId']);
    } else {
        $countryList = Util::getCountryList();
        $info = $request_context->getClient()->getUnpaidAccountpageInfo();
        $client_token = $gateway->clientToken()->generate();
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
                $monthly_plans[] = $plan;
            } else {
                $plan['monthly_price'] = number_format(($plan['price'] / 12.00), 2, ".", ",");
                $annual_plans[] = $plan;
            }
        }
        $billing_info = array(
        'braintree_client_token' => $info['braintreeClientToken'],
        'annual_plans' => $annual_plans,
        'monthly_plans' => $monthly_plans,
        'country_list' => $countryList
        );
    }

    $results = array_merge($contact_info, $billing_info);
    $results['csrf_token'] = $_SESSION['csrf_token'];
    $results['validation_pattern'] = ValidatorPatterns::getContactInfo();
    $results['validation_pattern_password'] = ValidatorPatterns::getPassword();
    $results['bt_client_token'] = $client_token;

    if (!is_null($error_message)) {
        $results['error_message'] = $error_message;
        unset($_SESSION['client-error']);
    }

    $tpl = new Template('account');
    echo $tpl->render('my-account', $results);
    exit();
} else {
    throw new ClientException("HTTP Method not supported for this endpoint", "/");
}

function changeContactInfo(RequestContext $request_context): void
{
    $contact_info_validator = new Rules\AllOf(
        new Rules\Regex('/' . ValidatorPatterns::getContactInfo() . '/'),
        new Rules\Length(0, 32)
    );

    $id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);
    $first_name = filter_input(INPUT_POST, 'first-name');
    $last_name = filter_input(INPUT_POST, 'last-name');
    $company_name = filter_input(INPUT_POST, 'company-name');

    try {
        $contact_info_validator->assert($first_name);
        $contact_info_validator->assert($last_name);
        $contact_info_validator->assert($company_name);
    } catch (NestedValidationException $e) {
        $message = $e->getMessages([
        'regex' => 'input cannot contain <, >, or &#'
        ]);
        throw new ClientException(implode(', ', $message));
    }

    $email = $request_context->getUser()->getEmail();

    $options = array(
    'email' => $email,
    'first_name' => $first_name,
    'last_name' => $last_name,
    'company_name' => $company_name
    );

    try {
        $request_context->getClient()->updateUserContactInfo($id, $options);
        $protocol = $request_context->getUrlProtocol();
        $host = Util::getSetting('host');
        $route = '/account';
        $redirect_uri = "{$protocol}://{$host}{$route}";

        header("Location: {$redirect_uri}");
        exit();
    } catch (Exception $e) {
        throw new ClientException("Could not update user info", "/account", 400);
    }
}

function changePassword(RequestContext $request_context): void
{
    $password_validator = new Rules\AllOf(
        new Rules\Length(8, 32),
        new Rules\Regex('/' . ValidatorPatterns::getPassword() . '/')
    );

    $id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);
    $current_password = filter_input(INPUT_POST, 'current-password');
    $new_password = filter_input(INPUT_POST, 'new-password');
    $confirm_new_password = filter_input(INPUT_POST, 'confirm-new-password');

    if ($new_password !== $confirm_new_password) {
        throw new ClientException("New Password must match confirmed password", "/account", 400);
    }

    try {
        $password_validator->assert($new_password);
        $password_validator->assert($confirm_new_password);
    } catch (NestedValidationException $e) {
        $msg = "The requirements are at least 8 characters, including a number, lowercase letter, uppercase ";
        $msg .= "letter and symbol. No <, >.";

        $message = $e->getMessages([
        'regex' => $msg
        ]);
        throw new ClientException(implode(', ', $message));
    }

    try {
        $request_context->getClient()->changePassword($new_password, $current_password);
        $protocol = $request_context->getUrlProtocol();
        $host = Util::getSetting('host');
        $route = '/account';
        $redirect_uri = "{$protocol}://{$host}{$route}";

        header("Location: {$redirect_uri}");
        exit();
    } catch (Exception $e) {
        throw new ClientException($e->getMessage(), "/account", 400);
    }
}

function subscribeToAccount(RequestContext $request_context): void
{
    $nonce = filter_input(INPUT_POST, 'nonce');
    $plan = filter_input(INPUT_POST, 'plan');
    $city = filter_input(INPUT_POST, 'city');
    $country = filter_input(INPUT_POST, 'country');
    $state = filter_input(INPUT_POST, 'state');
    $street_address = filter_input(INPUT_POST, 'street-address');
    $zipcode = filter_input(INPUT_POST, 'zipcode');

    if (
        empty($nonce) ||
        empty($plan) ||
        empty($city) ||
        empty($country) ||
        empty($state) ||
        empty($street_address) ||
        empty($zipcode)
    ) {
        throw new ClientException("Please complete all required fields", "/account");
    }

    $billing_address = array(
    'city' => $city,
    'country' => $country,
    'state' => $state,
    'street_address' => $street_address,
    'zipcode' => $zipcode
    );

    try {
        $request_context->getClient()->addWptSubscription($nonce, $plan, $billing_address);
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
}

function cancelSubscription(RequestContext $request_context)
{

    $subscription_id = filter_input(INPUT_POST, 'subscription-id', FILTER_SANITIZE_STRING);
    $protocol = $request_context->getUrlProtocol();
    $host = Util::getSetting('host');
    $route = '/account';
    $redirect_uri = "{$protocol}://{$host}{$route}";

    header("Location: {$redirect_uri}");
    exit();
    try {
        $request_context->getClient()->cancelWptSubscription($subscription_id);
    } catch (Exception $e) {
        error_log($e->getMessage());
        throw new ClientException("There was an error", "/account");
    }
}
