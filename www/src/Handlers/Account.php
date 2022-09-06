<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use Exception as BaseException;
use stdClass;
use WebPageTest\RequestContext;
use WebPageTest\Exception\ClientException;
use WebPageTest\ValidatorPatterns;
use WebPageTest\Util;
use Respect\Validation\Rules;
use Respect\Validation\Exceptions\NestedValidationException;
use WebPageTest\CPGraphQlTypes\ChargifySubscriptionInputType;
use WebPageTest\CPGraphQlTypes\ChargifyAddressInput;
use WebPageTest\Template;

class Account
{
    /** Upgrading plans from Account  */
    // Validate that a plan is selected
    //
    // #[ValidationMethod]
    // #[Route(Http::POST, '/account', 'upgrade-plan-1')]
    public static function validatePlanUpgrade(array $post_body): object
    {
        if (isset($post_body['plan'])) {
            $vars = new stdClass();
            $vars->plan = $post_body['plan'];
            return $vars;
        } else {
            throw new ClientException("No plan selected", "/account", 400);
        }
    }

    // Pass the plan id to the plan summary page
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'upgrade-plan-1')]
    public static function postPlanUpgrade(RequestContext $request_context, object $body): string
    {
        $host = $request_context->getHost();
        setcookie('upgrade-plan', $body->plan, time() + (5 * 60), "/", $host);
        $protocol = $request_context->getUrlProtocol();
        $redirect_uri = "{$protocol}://{$host}/account/plan_summary";
        return $redirect_uri;
    }

    // validate PostUpdatePlanSummary
    //
    // #[ValidatorMethod]
    // #[Route(Http::POST, '/account', 'upgrade-plan-2')]
    public static function validatePostUpdatePlanSummary(array $post_body): object
    {
        $body = new stdClass();
        $body->plan = $post_body['plan'];
        $body->subscription_id = $post_body['subscription_id'];
        $body->is_upgrade = !empty($post_body['is_upgrade']);
        return $body;
    }

    // Submit the plan upgrade
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'upgrade-plan-2')]
    public static function postUpdatePlanSummary(RequestContext $request_context, object $body): string
    {
        $request_context->getClient()->updatePlan($body->subscription_id, $body->plan, $body->is_upgrade);

        $host = $request_context->getHost();
        $protocol = $request_context->getUrlProtocol();
        $redirect_uri = "{$protocol}://{$host}/account";
        return $redirect_uri;
    }


    // Validate change info
    //
    // #[ValidatorMethod]
    // #[Route(Http::POST, '/account', 'change-info')]
    public static function validateChangeContactInfo(array $post_body): object
    {
        $body = new stdClass();

        $contact_info_validator = new Rules\AllOf(
            new Rules\Regex('/' . ValidatorPatterns::getContactInfo() . '/'),
            new Rules\Length(0, 32)
        );

        if (
            !((isset($post_body['id'])) &&
                (isset($post_body['first-name'])) &&
                (isset($post_body['last-name'])))
        ) {
            throw new ClientException("Required fields must be filled", "/account");
        }

        $id = filter_var($post_body['id'], FILTER_SANITIZE_NUMBER_INT);
        $first_name = $post_body['first-name'];
        $last_name = $post_body['last-name'];
        $company_name = $post_body['company-name'] ?? null;

        try {
            $contact_info_validator->assert($first_name);
            $contact_info_validator->assert($last_name);
            if (!is_null($company_name)) {
                $contact_info_validator->assert($company_name);
            }
        } catch (NestedValidationException $e) {
            $message = $e->getMessages([
                'regex' => 'input cannot contain <, >, or &#'
            ]);
            throw new ClientException(implode(', ', $message));
        }

        $body->id = $id;
        $body->first_name = $first_name;
        $body->last_name = $last_name;
        if (!is_null($company_name)) {
            $body->company_name = $company_name;
        }

        return $body;
    }

    // Change contact info
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'change-info')]
    public static function changeContactInfo(RequestContext $request_context, object $body): string
    {
        $email = $request_context->getUser()->getEmail();

        $options = [
            'email' => $email,
            'first_name' => $body->first_name,
            'last_name' => $body->last_name,
            'company_name' => $body->company_name ?? ""
        ];

        try {
            $request_context->getClient()->updateUserContactInfo($body->id, $options);
            $protocol = $request_context->getUrlProtocol();
            $host = $request_context->getHost();
            $route = '/account';
            $redirect_uri = "{$protocol}://{$host}{$route}";
            $successMessage = array(
                'type' => 'success',
                'text' => 'Your contact information has been updated!'
            );
            Util::setBannerMessage('form', $successMessage);
            return $redirect_uri;
        } catch (BaseException $e) {
            error_log($e->getMessage());
            throw new ClientException("Could not update user info", "/account", 400);
        }
    }

    // Validate change password
    //
    // #[ValidatorMethod]
    // #[Route(Http::POST, '/account', 'password')]
    public static function validateChangePassword(array $post_body): object
    {
        $body = new stdClass();

        $password_validator = new Rules\AllOf(
            new Rules\Length(8, 32),
            new Rules\Regex('/' . ValidatorPatterns::getPassword() . '/')
        );

        $current_password = $post_body['current-password'];
        $new_password = $post_body['new-password'];
        $confirm_new_password = $post_body['confirm-new-password'];

        if ($new_password !== $confirm_new_password) {
            throw new ClientException("New Password must match confirmed password", "/account", 400);
        }

        try {
            $password_validator->assert($new_password);
        } catch (NestedValidationException $e) {
            $msg = "The requirements are at least 8 characters, including a number, lowercase letter, uppercase ";
            $msg .= "letter and symbol. No <, >.";

            $message = $e->getMessages([
                'regex' => $msg
            ]);
            throw new ClientException(implode(', ', $message));
        }

        $body->current_password = $current_password;
        $body->new_password = $new_password;

        return $body;
    }

    // Change password
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'password')]
    public static function changePassword(RequestContext $request_context, object $body): string
    {
        try {
            $request_context->getClient()->changePassword($body->new_password, $body->current_password);
            $protocol = $request_context->getUrlProtocol();
            $host = $request_context->getHost();
            $route = '/account';
            return "{$protocol}://{$host}{$route}";
        } catch (BaseException $e) {
            throw new ClientException($e->getMessage(), "/account", 400);
        }
    }

    /* Validate existing free user subscribes to a paid account

     * #[ValidatorMethod]
     * #[Route(Http::POST, '/account', 'account-signup')]
     *
     * @param array{
     *  nonce: string,
     *  plan: string,
     *  city: string,
     *  country: string,
     *  state: string,
     *  'street-address': string,
     *  zipcode: string} $post_body
     *
     * @return object{
     *  nonce: string,
     *  plan: string,
     *  city: string,
     *  country: string,
     *  state: string,
     *  street_address: string,
     *  zipcode: string
     *  } $body
     */
    public static function validateSubscribeToAccount(array $post_body): object
    {
        $body = new stdClass();

        $nonce = $post_body['nonce'] ?? "";
        $plan = $post_body['plan'] ?? "";
        $city = $post_body['city'] ?? "";
        $country = $post_body['country'] ?? "";
        $state = $post_body['state'] ?? "";
        $street_address = $post_body['street-address'] ?? "";
        $zipcode = $post_body['zipcode'] ?? "";

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

        $body->nonce = $nonce;
        $body->plan = $plan;
        $body->city = $city;
        $body->country = $country;
        $body->state = $state;
        $body->street_address = $street_address;
        $body->zipcode = $zipcode;

        return $body;
    }

    // Existing free user subscribes to a paid account
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'account-signup')]
    public static function subscribeToAccount(RequestContext $request_context, object $body): string
    {
        $address = new ChargifyAddressInput([
            'city' => $body->city,
            'country' => $body->country,
            'state' => $body->state,
            'street_address' => $body->street_address,
            'zipcode' => $body->zipcode
        ]);

        $subscription = new ChargifySubscriptionInputType($body->plan, $body->nonce, $address);
        try {
            $data = $request_context->getClient()->addWptSubscription($subscription);
            $redirect_uri = $request_context->getSignupClient()->getAuthUrl($data['loginVerificationId']);
            $successMessage = array(
                'type' => 'success',
                'text' => 'Your plan as been successfully updated! '
            );
            Util::setBannerMessage('form', $successMessage);
            return $redirect_uri;
        } catch (BaseException $e) {
            error_log($e->getMessage());
            $errorMessage = array(
                'type' => 'error',
                'text' => $e->getMessage()
            );
            Util::setBannerMessage('form', $errorMessage);
            throw new ClientException($e->getMessage(), "/account");
        }
    }

    // TODO: change user's credit card
    //
    // #[NotImplemented]
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'update-payment-method')]
    public static function updatePaymentMethod(RequestContext $request_context): void
    {
    }

    // Cancel a paid subscription
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'cancel-subscription')]
    public static function cancelSubscription(RequestContext $request_context): string
    {

        $subscription_id = filter_input(INPUT_POST, 'subscription-id', FILTER_SANITIZE_STRING);

        try {
            $request_context->getClient()->cancelWptSubscription($subscription_id);
            $protocol = $request_context->getUrlProtocol();
            $host = Util::getSetting('host');
            $route = '/account';
            $redirect_uri = "{$protocol}://{$host}{$route}";
            $cancelSuccessMessage = array(
                'type' => 'success',
                'text' => 'Your plan has been cancelled. You will not be charged next pay period.'
            );
            Util::setBannerMessage('form', $cancelSuccessMessage);
            return $redirect_uri;
        } catch (BaseException $e) {
            error_log($e->getMessage());
            $cancelSuccessMessage = array(
                'type' => 'error',
                'text' => 'There was an error with canceling your account. Please try again.'
            );
            Util::setBannerMessage('form', $cancelSuccessMessage);
            throw new ClientException("There was an error", "/account");
        }
    }

    // Create a WPT api key for a user
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'create-api-key')]
    public static function createApiKey(RequestContext $request_context): void
    {
        try {
            $name = filter_input(INPUT_POST, 'api-key-name', FILTER_SANITIZE_STRING);
            $request_context->getClient()->createApiKey($name);
            $protocol = $request_context->getUrlProtocol();
            $host = Util::getSetting('host');
            $route = '/account#api-consumers';
            $redirect_uri = "{$protocol}://{$host}{$route}";

            header("Location: {$redirect_uri}");
            exit();
        } catch (\Exception $e) {
            error_log($e->getMessage());
            throw new ClientException($e->getMessage(), "/account");
        }
    }

    // Delete a WPT api key for a user
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'delete-api-key')]
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
     *
     * Previews cost (including taxes) of signing up with plan
     *
     * @return object $body
     *
     * #[ValidatorMethod]
     * #[Route(Http::POST, '/account', 'account-signup-preview')]
     */
    public static function validatePreviewCost(array $post): object
    {
        $body = new stdClass();

        if (
            !(isset($post['plan']) &&
                isset($post['street-address']) &&
                isset($post['city']) &&
                isset($post['state']) &&
                isset($post['country']) &&
                isset($post['zipcode'])
            )
        ) {
            $msg = "Plan, street address, city, state, country, and zipcode must all be filled";
            throw new ClientException($msg, "/account");
        }

        $body->plan = $post['plan'];
        $body->street_address = $post['street-address'];
        $body->city = $post['city'];
        $body->state = $post['state'];
        $body->country = $post['country'];
        $body->zipcode = $post['zipcode'];

        return $body;
    }

    /**
     *
     * @return string $totals where totals are a json-encoding version of a SubscriptionPreview
     *
     * Previews cost (including taxes) of signing up with plan
     *
     * #[HandlerMethod]
     * #[Route(Http::POST, '/account', 'account-signup-preview')]
     */
    public static function previewCost(RequestContext $request_context, object $body): string
    {
        try {
            $plan = $body->plan;
            $address = new ChargifyAddressInput([
                "street_address" => $body->street_address,
                "city" => $body->city,
                "state" => $body->state,
                "country" => $body->country,
                "zipcode" => $body->zipcode
            ]);

            $preview_totals = $request_context->getClient()->getChargifySubscriptionPreview($plan, $address);
            return json_encode($preview_totals);
        } catch (\Exception $e) {
            error_log($e->getMessage());
            return json_encode([
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     *
     * Triggers sending email verification email to a user
     *
     * #[HandlerMethod]
     * #[Route(Http::POST, '/account', 'resend-email-verification')]
     */
    public static function resendEmailVerification(RequestContext $request_context): string
    {
        try {
            $request_context->getClient()->resendEmailVerification();

            $protocol = $request_context->getUrlProtocol();
            $host = Util::getSetting('host');
            $route = '/account';
            $redirect_uri = "{$protocol}://{$host}{$route}";
            return $redirect_uri;
        } catch (\Exception $e) {
            error_log($e->getMessage());
            throw new ClientException($e->getMessage(), "/account");
        }
    }

    public static function getAccountPage(RequestContext $request_context)
    {
        $error_message = $_SESSION['client-error'] ?? null;

        $is_paid = $request_context->getUser()->isPaid();
        $is_verified = $request_context->getUser()->isVerified();
        $is_wpt_enterprise = $request_context->getUser()->isWptEnterpriseClient();
        $user_id = $request_context->getUser()->getUserId();
        $remainingRuns = $request_context->getUser()->getRemainingRuns();
        $user_email = $request_context->getUser()->getEmail();
        $first_name = $request_context->getUser()->getFirstName();
        $last_name = $request_context->getUser()->getLastName();
        $company_name = $request_context->getUser()->getCompanyName();


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
        $country_list = Util::getChargifyCountryList();
        $state_list = Util::getChargifyUSStateList();

        if ($is_paid) {
            if ($is_wpt_enterprise) {
                $billing_info = $request_context->getClient()->getPaidEnterpriseAccountPageInfo();
            } else {
                $acct_info = $request_context->getClient()->getPaidAccountPageInfo();
                $customer = $acct_info->getCustomer();
                $subId = $customer->getSubscriptionId();

                $billing_info = [
                    'api_keys' => $acct_info->getApiKeys(),
                    'wptCustomer' => $customer,
                    'transactionHistory' => $request_context->getClient()->getTransactionHistory($subId),
                    'is_wpt_enterprise' => $is_wpt_enterprise,
                    'status' => $customer->getStatus(),
                    'is_canceled' => $customer->isCanceled(),
                    'billing_frequency' => $customer->getBillingFrequency() == 12 ? "Annually" : "Monthly",
                    'cc_image_url' => "/assets/images/cc-logos/{$customer->getCardType()}.svg",
                    'masked_cc' => $customer->getMaskedCreditCard(),
                    'cc_expiration' => $customer->getCCExpirationDate()
                ];

                if (!is_null($customer->getNextBillingDate())) {
                    $billing_info['plan_renewal'] = $customer->getNextBillingDate()->format('F d, Y');
                }
            }
        }
        $plans = $request_context->getClient()->getWptPlans();

        $results = array_merge($contact_info, $billing_info);
        $results['csrf_token'] = $_SESSION['csrf_token'];
        $results['validation_pattern'] = ValidatorPatterns::getContactInfo();
        $results['validation_pattern_password'] = ValidatorPatterns::getPassword();
        $results['country_list'] = $country_list;
        $results['state_list'] = $state_list;
        $results['country_list_json_blob'] = Util::getCountryJsonBlob();
        $results['remainingRuns'] = $remainingRuns;
        $results['plans'] = $plans;
        $results['messages'] = Util::getBannerMessage();
        if (!is_null($error_message)) {
            $results['error_message'] = $error_message;
            unset($_SESSION['client-error']);
        }
        $page = (string) filter_input(INPUT_GET, 'page', FILTER_SANITIZE_STRING);
        $tpl = new Template('account');
        $tpl->setLayout('account');

        switch ($page) {
            case 'update_billing':
                $oldPlan = Util::getPlanFromArray($customer->getWptPlanId(), $plans);
                $newPlan = Util::getAnnualPlanByRuns($oldPlan->getRuns(), $plans->getAnnualPlans());
                $results['oldPlan'] = $oldPlan;
                $results['newPlan'] = $newPlan;
                $sub_id = $customer->getSubscriptionId();
                $billing_address = $request_context->getClient()->getBillingAddress($sub_id);
                $addr = ChargifyAddressInput::fromChargifyInvoiceAddress($billing_address);
                $preview = $request_context->getClient()->getChargifySubscriptionPreview($newPlan->getId(), $addr);
                $results['sub_total'] = number_format($preview->getSubTotalInCents() / 100, 2);
                $results['tax'] = number_format($preview->getTaxInCents() / 100, 2);
                $results['total'] = number_format($preview->getTotalInCents() / 100, 2);
                $results['renewaldate'] = $customer->getNextPlanStartDate()->format('m/d/Y');
                echo $tpl->render('billing/billing-cycle', $results);
                break;
            case 'update_plan':
                $oldPlan = Util::getPlanFromArray($customer->getWptPlanId(), $plans);
                $results['oldPlan'] = $oldPlan;
                echo $tpl->render('plans/upgrade-plan', $results);
                break;
            case 'plan_summary':
                $planCookie = $_COOKIE['upgrade-plan'];
                if (isset($planCookie) && $planCookie) {
                    $plan = Util::getPlanFromArray($planCookie, $plans);
                    $oldPlan = Util::getPlanFromArray($customer->getWptPlanId(), $plans);
                    $results['plan'] = $plan;
                    if ($is_paid) {
                        $sub_id = $customer->getSubscriptionId();
                        $billing_address = $request_context->getClient()->getBillingAddress($sub_id);
                        $addr = ChargifyAddressInput::fromChargifyInvoiceAddress($billing_address);
                        $preview = $request_context->getClient()->getChargifySubscriptionPreview($plan->getId(), $addr);
                        $results['sub_total'] = number_format($preview->getSubTotalInCents() / 100, 2);
                        $results['tax'] = number_format($preview->getTaxInCents() / 100, 2);
                        $results['total'] = number_format($preview->getTotalInCents() / 100, 2);
                        $results['isUpgrade'] = $plan->isUpgrade($oldPlan);
                        $results['renewaldate'] = $customer->getNextPlanStartDate();
                        echo $tpl->render('plans/plan-summary-upgrade', $results);
                    } else {
                        $results['ch_client_token'] = Util::getSetting('ch_key_public');
                        $results['ch_site'] = Util::getSetting('ch_site');
                        echo $tpl->render('plans/plan-summary', $results);
                    }
                    break;
                } else {
                    echo $tpl->render('plans/upgrade-plan', $results);
                    break;
                }
            default:
                $nextPlan = $customer->getNextWptPlanId();
                if (isset($nextPlan)) {
                    $results['upcoming_plan'] =  Util::getPlanFromArray($nextPlan, $plans);
                }
                echo $tpl->render('my-account', $results);
                break;
        }

        exit();
    }
}
