<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use Exception as BaseException;
use WebPageTest\RequestContext;
use WebPageTest\Exception\ClientException;
use WebPageTest\ValidatorPatterns;
use WebPageTest\Util;
use Respect\Validation\Rules;
use Respect\Validation\Exceptions\NestedValidationException;
use WebPageTest\BillingAddress;
use WebPageTest\Customer;

class Account
{
    public static function changeContactInfo(RequestContext $request_context): void
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
        } catch (BaseException $e) {
            throw new ClientException("Could not update user info", "/account", 400);
        }
    }

    public static function changePassword(RequestContext $request_context): void
    {
        $password_validator = new Rules\AllOf(
            new Rules\Length(8, 32),
            new Rules\Regex('/' . ValidatorPatterns::getPassword() . '/')
        );

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
        } catch (BaseException $e) {
            throw new ClientException($e->getMessage(), "/account", 400);
        }
    }

    public static function subscribeToAccount(RequestContext $request_context): void
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

        $billing_address = new BillingAddress([
          'city' => $city,
          'country' => $country,
          'state' => $state,
          'street_address' => $street_address,
          'zipcode' => $zipcode
        ]);

        $customer = new Customer([
          'payment_method_nonce' => $nonce,
          'billing_address_model' => $billing_address,
          'subscription_plan_id' => $plan
        ]);

        try {
            $data = $request_context->getClient()->addWptSubscription($customer);
            $redirect_uri = $request_context->getSignupClient()->getAuthUrl($data['loginVerificationId']);
            header("Location: {$redirect_uri}");
            exit();
        } catch (BaseException $e) {
            error_log($e->getMessage());
            throw new ClientException("There was an error", "/account");
        }
    }

    public static function cancelSubscription(RequestContext $request_context)
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
        } catch (BaseException $e) {
            error_log($e->getMessage());
            throw new ClientException("There was an error", "/account");
        }
    }
}
