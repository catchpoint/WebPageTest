<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use WebPageTest\RequestContext;
use WebPageTest\Util;
use WebPageTest\Template;
use WebPageTest\ValidatorPatterns;
use Respect\Validation\Rules;
use Respect\Validation\Exceptions\NestedValidationException;
use WebPageTest\CPGraphQlTypes\BraintreeBillingAddressInput as BillingAddress;
use WebPageTest\CPGraphQlTypes\ChargifyAddressInput;
use WebPageTest\CPGraphQlTypes\ChargifySubscription;
use WebPageTest\CPGraphQlTypes\CPSignupInput;
use WebPageTest\CPGraphQlTypes\CustomerInput;
use GuzzleHttp\Exception\RequestException;
use WebPageTest\Exception\ClientException;
use WebPageTest\Exception\UnauthorizedException;
use Illuminate\Http\Response;

class Signup
{
    public function __construct()
    {
        throw new \Error('Do not use, static methods only');
    }

    public static function getStepOne(RequestContext $request_context, array $vars): Response
    {
        $response = new Response();
        $tpl = new Template('account/signup');
        $tpl->setLayout('signup-flow-step-1');

        $wpt_plans = $request_context->getSignupClient()->getWptPlans();
        $vars['annual_plans'] = $wpt_plans->getAnnualPlans();
        $vars['monthly_plans'] = $wpt_plans->getMonthlyPlans();

        $content = $tpl->render('step-1', $vars);
        $response->setContent($content);
        return $response;
    }

    public static function getStepTwo(RequestContext $request_context, array $vars): string
    {
        $plan_id = $vars['plan'];
        $plan = null;
        $plans = $request_context->getSignupClient()->getWptPlans();

        foreach ($plans as $p) {
            if ($p->getId() == $plan_id) {
                $plan = $p;
                break;
            }
        }
        if (!is_null($plan)) {
            $vars['runs'] = $plan->getRuns();
            $vars['monthly_price'] = $plan->getMonthlyPrice();
            $vars['annual_price'] = $plan->getAnnualPrice();
            $vars['other_annual'] = $plan->getOtherAnnual();
            $vars['billing_frequency'] = $plan->getBillingFrequency();

            if (!$vars['is_plan_free']) {
                $vars['state_list'] = Util::getChargifyUSStateList();
                $vars['country_list'] = Util::getChargifyCountryList();
                $vars['country_list_json_blob'] = Util::getCountryJsonBlob();
            }
        }
        $vars['contact_info_pattern'] = ValidatorPatterns::getContactInfo();
        $vars['password_pattern'] = ValidatorPatterns::getPassword();
        $tpl = new Template('account/signup');
        $tpl->setLayout('signup-flow');
        return $tpl->render('step-2', $vars);
    }

    public static function getStepThree(RequestContext $request_context, array $vars): string
    {
        $tpl = new Template('account/signup');
        $tpl->setLayout('signup-flow');

        $plan_id = $vars['plan'];
        $plan = null;
        $plans = $request_context->getSignupClient()->getWptPlans();

        foreach ($plans as $p) {
            if ($p->getId() == $plan_id) {
                $plan = $p;
                break;
            }
        }
        if (!is_null($plan)) {
            $vars['runs'] = $plan->getRuns();
            $vars['monthly_price'] = $plan->getMonthlyPrice();
            $vars['annual_price'] = $plan->getAnnualPrice();
            $vars['other_annual'] = $plan->getOtherAnnual();
            $vars['billing_frequency'] = $plan->getBillingFrequency();
        }

        $vars['ch_client_token'] = Util::getSetting('ch_key_public');
        $vars['ch_site'] = Util::getSetting('ch_site');

        $vars['first_name'] = isset($_SESSION['signup-first-name']) ? htmlentities($_SESSION['signup-first-name']) : "";
        $vars['last_name'] = isset($_SESSION['signup-last-name']) ? htmlentities($_SESSION['signup-last-name']) : "";
        $vars['company_name'] = htmlentities($_SESSION['signup-company-name']);
        $vars['email'] = htmlentities($_SESSION['signup-email']);
        $vars['password'] = htmlentities($_SESSION['signup-password']);

        $vars['street_address'] = htmlentities($_SESSION['signup-street-address']);
        $vars['city'] = htmlentities($_SESSION['signup-city']);
        $vars['state_code'] = htmlentities($_SESSION['signup-state-code']);
        $vars['country_code'] = htmlentities($_SESSION['signup-country-code']);
        $vars['zipcode'] = htmlentities($_SESSION['signup-zipcode']);

        $signup_total_in_cents = $_SESSION['signup-total-in-cents'];
        $estimated_tax_in_cents = $_SESSION['signup-tax-in-cents'];

        $vars['total_including_tax'] = number_format(($signup_total_in_cents / 100), 2, ".", ",");
        $vars['estimated_tax'] = number_format(($estimated_tax_in_cents / 100), 2, ".", ",");

        $vars['country_list'] = Util::getChargifyCountryList();
        $vars['state_list'] = Util::getChargifyUSStateList();

        return $tpl->render('step-3', $vars);
    }

    public static function postStepTwoFree(RequestContext $request_context, object $body): string
    {
        try {
            $auth_token = $request_context->getSignupClient()->getAuthToken();
            $request_context->getSignupClient()->authenticate($auth_token->access_token);

            $data = $request_context->getSignupClient()->signup([
                'first_name' => $body->first_name,
                'last_name' => $body->last_name,
                'company' => $body->company_name,
                'email' => $body->email,
                'password' => $body->password
            ]);

            $redirect_uri = $request_context->getSignupClient()->getAuthUrl($data['loginVerificationId']);
            return $redirect_uri;
        } catch (ClientException $e) {
            throw new ClientException($e->getMessage(), '/signup/2');
        }
    }

    public static function validatePostStepTwo(): object
    {
        $vars = (object)[];

        $plan = isset($_POST['plan']) ? htmlentities($_POST['plan']) : 'free';
        $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);

        $password = $_POST["password"];
        if ($password != $_POST['confirm-password']) {
            throw new ClientException('Passwords must match', '/signup/2');
        }

        $password_validator = new Rules\AllOf(
            new Rules\Length(8, 32),
            new Rules\Regex('/' . ValidatorPatterns::getPassword() . '/')
        );

        try {
            $password_validator->assert($password);
        } catch (NestedValidationException $e) {
            $msg = "The requirements are at least 8 characters, including a number, lowercase letter, uppercase ";
            $msg .= "letter and symbol. No <, >.";

            $message = $e->getMessages([
                'regex' => $msg
            ]);
            throw new ClientException(implode(', ', $message));
        }

        $contact_info_validator = new Rules\AllOf(
            new Rules\Regex('/' . ValidatorPatterns::getContactInfo() . '/'),
            new Rules\Length(0, 32)
        );

        $first_name = $_POST["first-name"];
        $last_name = $_POST["last-name"];
        $company_name = $_POST["company-name"] ?? null;
        $street_address = $_POST["street-address"] ?? null;
        $city = $_POST["city"] ?? null;
        $state_code = $_POST["state"] ?? null;
        $country_code = $_POST["country"] ?? null;
        $zipcode = $_POST["zipcode"] ?? null;

        try {
            $contact_info_validator->assert($first_name);
            $contact_info_validator->assert($last_name);

            if (!(is_null($company_name) || (empty($company_name)))) {
                $contact_info_validator->assert($company_name);
            }
        } catch (NestedValidationException $e) {
            $message = $e->getMessages([
                'regex' => 'input cannot contain <, >, or &#'
            ]);
            throw new ClientException(implode(', ', $message));
        }

        if ($plan != "free") {
            if (
                is_null($street_address) ||
                is_null($city) ||
                is_null($state_code) ||
                is_null($country_code) ||
                is_null($zipcode)
            ) {
                throw new ClientException("All billing address fields must be filled for a paid plan", "/signup/2");
            }
        }

        $vars->email = $email;
        $vars->password = $password;
        $vars->first_name = $first_name;
        $vars->last_name = $last_name;
        $vars->company_name = $company_name;
        $vars->street_address = $street_address;
        $vars->city = $city;
        $vars->state_code = $state_code;
        $vars->country_code = $country_code;
        $vars->zipcode = $zipcode;

        $vars->plan = $plan;

        return $vars;
    }

    public static function postStepTwoPaid(RequestContext $request_context, object $body): string
    {
        // set values for next page
        $_SESSION['signup-first-name'] = $body->first_name;
        $_SESSION['signup-last-name'] = $body->last_name;
        $_SESSION['signup-company-name'] = $body->company_name;
        $_SESSION['signup-email'] = $body->email;
        $_SESSION['signup-password'] = $body->password;

        $chargify_address = new ChargifyAddressInput([
          "street_address" => $body->street_address,
          "city" => $body->city,
          "state" => $body->state_code,
          "country" => $body->country_code,
          "zipcode" => $body->zipcode
        ]);

        $plan = $body->plan;

        try {
            $auth_token = $request_context->getSignupClient()->getAuthToken();
            $request_context->getSignupClient()->authenticate($auth_token->access_token);

            $total = $request_context->getSignupClient()->getChargifySubscriptionPreview($plan, $chargify_address);

            $_SESSION['signup-street-address'] = $body->street_address;
            $_SESSION['signup-city'] = $body->city;
            $_SESSION['signup-state-code'] = $body->state_code;
            $_SESSION['signup-country-code'] = $body->country_code;
            $_SESSION['signup-zipcode'] = $body->zipcode;

            $_SESSION['signup-total-in-cents'] = $total->getTotalInCents();
            $_SESSION['signup-subtotal-in-cents'] = $total->getSubTotalInCents();
            $_SESSION['signup-tax-in-cents'] = $total->getTaxInCents();
        } catch (\Exception $e) {
            throw new ClientException($e->getMessage(), '/signup/2');
        }

        $host = Util::getSetting('host');
        setcookie('signup-plan', $body->plan, time() + (5 * 60), "/", $host);

        $protocol = $request_context->getUrlProtocol();
        $host = Util::getSetting('host');

        $redirect_uri = "{$protocol}://{$host}/signup/3";
        return $redirect_uri;
    }

    public static function validatePostStepThree(): object
    {
        $vars = (object)[];
        $plan = isset($_POST['plan']) ? htmlentities($_POST['plan']) : 'free';
        $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);

        $password = $_POST["password"];

        $password_validator = new Rules\AllOf(
            new Rules\Length(8, 32),
            new Rules\Regex('/' . ValidatorPatterns::getPassword() . '/')
        );

        try {
            $password_validator->assert($password);
        } catch (NestedValidationException $e) {
            $msg = "The requirements are at least 8 characters, including a number, lowercase letter, uppercase ";
            $msg .= "letter and symbol. No <, >.";

            $message = $e->getMessages([
                'regex' => $msg
            ]);
            throw new ClientException(implode(', ', $message), '/signup/2');
        }

        $contact_info_validator = new Rules\AllOf(
            new Rules\Regex('/' . ValidatorPatterns::getContactInfo() . '/'),
            new Rules\Length(0, 32)
        );

        $first_name = $_POST["first-name"];
        $last_name = $_POST["last-name"];
        $company_name = $_POST["company-name"] ?? null;

        try {
            $contact_info_validator->assert($first_name);
            $contact_info_validator->assert($last_name);

            if (!(is_null($company_name) || (empty($company_name)))) {
                $contact_info_validator->assert($company_name);
            }
        } catch (NestedValidationException $e) {
            $message = $e->getMessages([
                'regex' => 'input cannot contain <, >, or &#'
            ]);
            throw new ClientException(implode(', ', $message), '/signup/2');
        }

        $nonce = $_POST['nonce'];
        $street_address = $_POST['street-address'];
        $city = $_POST['city'];
        $state = $_POST['state'];
        $country = $_POST['country'];
        $zipcode = $_POST['zipcode'];

        $vars->plan = strtolower($plan);
        $vars->nonce = $nonce;
        $vars->street_address = $street_address;
        $vars->city = $city;
        $vars->state = $state;
        $vars->country = $country;
        $vars->zipcode = $zipcode;
        $vars->first_name = $first_name;
        $vars->last_name = $last_name;
        $vars->company = $company_name;
        $vars->password = $password;
        $vars->email = $email;

        return $vars;
    }

    public static function postStepThree(RequestContext $request_context, object $body): string
    {
        // build query items
        $billing_address = new BillingAddress([
            'street_address' => $body->street_address,
            'city' => $body->city,
            'state' => $body->state,
            'country' => $body->country,
            'zipcode' => $body->zipcode
        ]);

        $chargify_address = new ChargifyAddressInput([
            'street_address' => $body->street_address,
            'city' => $body->city,
            'state' => $body->state,
            'country' => $body->country,
            'zipcode' => $body->zipcode
        ]);

        $customer = new CustomerInput([
          "payment_method_nonce" => $body->nonce,
          "subscription_plan_id" => $body->plan
        ], $billing_address);

        $subscription = new ChargifySubscription([
          "plan_handle" => $body->plan,
          "payment_token" => $body->nonce
        ], $chargify_address);

        $options = [
                'first_name' => $body->first_name,
                'last_name' => $body->last_name,
                'company' => $body->company,
                'email' => $body->email,
                'password' => $body->password,
        ];

        $cp_signup_input = new CPSignupInput($options, $customer, $subscription);

        // handle signup
        try {
            $auth_token = $request_context->getSignupClient()->getAuthToken();
            $request_context->getSignupClient()->authenticate($auth_token->access_token);
            $data = $request_context->getSignupClient()->signupWithChargify($cp_signup_input);

            $redirect_uri = $request_context->getSignupClient()->getAuthUrl($data['loginVerificationId']);
            return $redirect_uri;
        } catch (\Exception $e) {
            throw new ClientException($e->getMessage(), '/signup/3');
        }
    }

    public static function validatePostStepOne(): object
    {
        $vars = (object)[];
        $vars->plan = isset($_POST['plan']) ? htmlentities($_POST['plan']) : 'free';
        return $vars;
    }

    public static function postStepOne(RequestContext $request_context): string
    {
        $host = Util::getSetting('host');
        $protocol = $request_context->getUrlProtocol();
        $redirect_uri = "{$protocol}://{$host}/signup/2";
        return $redirect_uri;
    }
}
