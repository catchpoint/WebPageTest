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
use WebPageTest\CPGraphQlTypes\ChargifyAddressInput;
use WebPageTest\CPGraphQlTypes\ChargifySubscriptionInputType;
use WebPageTest\CustomerPaymentUpdateInput;
use WebPageTest\Template;
use GuzzleHttp\Exception\RequestException;

class Account
{


    public static function updatePlan(RequestContext $request_context, array $vars): string
    {
        $tpl = new Template('account/plans');
        $tpl->setLayout('account');

        try {
            // get all plans to show on update plan page
            $wpt_plans = $request_context->getSignupClient()->getWptPlans();
            $annual_plans = array();
            $monthly_plans = array();
            usort($wpt_plans, function ($a, $b) {
                if ($a->getPrice() == $b->getPrice()) {
                    return 0;
                }
                return ($a->getPrice() < $b->getPrice()) ? -1 : 1;
            });
            foreach ($wpt_plans as $plan) {
                if ($plan->getBillingFrequency() == "Monthly") {
                    $monthly_plans[] = $plan;
                } else {
                    $annual_plans[] = $plan;
                }
            }
            $vars['annual_plans'] = $annual_plans;
            $vars['monthly_plans'] = $monthly_plans;
        } catch (RequestException $e) {
            if ($e->getCode() == 401) {
                // get auth token again and retry!
                unset($_SESSION['signup-auth-token']);
                $auth_token = $request_context->getSignupClient()->getAuthToken()->access_token;
                $_SESSION['signup-auth-token'] = $auth_token;
                $request_context->getSignupClient()->authenticate($auth_token);
                unset($vars['auth_token']);
                $vars['auth_token'] = $auth_token;
                $vars['wpt_plans'] = $request_context->getSignupClient()->getWptPlans();
            } else {
                throw $e;
            }
        }

        return $tpl->render('upgrade-plan', $vars);
    }

    public static function viewPlanSummary(RequestContext $request_context, array $vars): string
    {
        $tpl = new Template('account/plans');
        $tpl->setLayout('account');
        return $tpl->render('plan-summary', $vars);
    }

    public static function updateBillingCycle(RequestContext $request_context, array $vars): string
    {
        $tpl = new Template('account/billing');
        $tpl->setLayout('account');
        return $tpl->render('billing-cycle', $vars);
    }


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
            $data = $request_context->getClient()->addWptSubscription($subscription);
            $redirect_uri = $request_context->getSignupClient()->getAuthUrl($data['loginVerificationId']);
            header("Location: {$redirect_uri}");
            exit();
        } catch (BaseException $e) {
            error_log($e->getMessage());
            throw new ClientException("There was an error", "/account");
        }
    }

    public static function updatePaymentMethod(RequestContext $request_context): void
    {
        $nonce = filter_input(INPUT_POST, 'nonce');
        $city = filter_input(INPUT_POST, 'city');
        $country = filter_input(INPUT_POST, 'country');
        $state = filter_input(INPUT_POST, 'state');
        $street_address = filter_input(INPUT_POST, 'streetAddress');
        $zipcode = filter_input(INPUT_POST, 'zipcode');

        if (
            empty($nonce) ||
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

        $customer = new CustomerPaymentUpdateInput([
            'payment_method_nonce' => $nonce,
            'billing_address_model' => $billing_address
        ]);

        try {
            $request_context->getClient()->updateWptSubscription($customer);
            $protocol = $request_context->getUrlProtocol();
            $host = Util::getSetting('host');
            $redirect_uri = "{$protocol}://{$host}/account";
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

        try {
            $request_context->getClient()->cancelWptSubscription($subscription_id);
            $protocol = $request_context->getUrlProtocol();
            $host = Util::getSetting('host');
            $route = '/account';
            $redirect_uri = "{$protocol}://{$host}{$route}";

            header("Location: {$redirect_uri}");
            exit();
        } catch (BaseException $e) {
            error_log($e->getMessage());
            throw new ClientException("There was an error", "/account");
        }
    }

    public static function deleteApiKey(RequestContext $request_context)
    {
        try {
            $api_key_ids = $_POST['api-key-id'];
            if (!empty($api_key_ids)) {
                $sanitized_keys = array_filter($api_key_ids, function ($v) {
                    return filter_var($v, FILTER_SANITIZE_NUMBER_INT);
                });
                $ints = array_map(function ($v) {
                    return intval($v);
                }, $sanitized_keys);

                $request_context->getClient()->deleteApiKey($ints);
            }


            $protocol = $request_context->getUrlProtocol();
            $host = Util::getSetting('host');
            $route = '/account';
            $redirect_uri = "{$protocol}://{$host}{$route}";

            header("Location: {$redirect_uri}");
            exit();
        } catch (\Exception $e) {
            error_log($e->getMessage());
            throw new ClientException("There was an error", "/account");
        }
    }

    /**
     * responds in JSON
     */
    public static function previewCost(RequestContext $request_context)
    {
        try {
            $plan = $_POST['plan'];
            $address = new ChargifyAddressInput([
                "street_address" => $_POST['street_address'],
                "city" => $_POST['city'],
                "state" => $_POST['state'],
                "country" => $_POST['country'],
                "zipcode" => $_POST['zipcode']
            ]);

            $preview_totals = $request_context->getClient()->getChargifySubscriptionPreview($plan, $address);
            header('Content-type: application/json');
            echo json_encode($preview_totals);
            exit();
        } catch (\Exception $e) {
            error_log($e->getMessage());
        }
    }
}
