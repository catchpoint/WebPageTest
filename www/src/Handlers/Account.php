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
use WebPageTest\CPGraphQlTypes\ChargifySubscriptionInputType;
use WebPageTest\CPGraphQlTypes\ChargifyAddressInput;
use WebPageTest\Template;

class Account
{
    /** Upgrading plans from Account  */
    // Validate that a plan is selected
    public static function validatePlanUpgrade(): object
    {
        if (isset($_POST['plan'])) {
            $vars = (object)[];
            $vars->plan =  filter_input(INPUT_POST, 'plan');
            return $vars;
        } else {
            throw new ClientException("No plan selected", "/account", 400);
        }
    }
    // Pass the plan id to the plan summary page
    public static function postPlanUpgrade(RequestContext $request_context): string
    {
        $host = Util::getSetting('host');
        $protocol = $request_context->getUrlProtocol();
        $redirect_uri = "{$protocol}://{$host}/account/plan_summary";
        return $redirect_uri;
    }

    // // before rendering the plan_
    // public static function getPlanSummary(RequestContext $request_context, array $vars): string

    // }

    // // validate the last step to upgrading
    // public static function validatePlanSummary(RequestContext $request_context): object
    // {
    //     subscribeToAccount($request_context)
    // }

    // Submit the plan upgrade
    public static function postUpdatePlanSummary(RequestContext $request_context, array $body): string
    {
        $request_context->getClient()->updatePlan($body['subscription_id'], $body['plan']);

        $host = Util::getSetting('host');
        $protocol = $request_context->getUrlProtocol();
        $redirect_uri = "{$protocol}://{$host}/account";
        return $redirect_uri;
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
        $plan = strtolower(filter_input(INPUT_POST, 'plan'));
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

        $address = new ChargifyAddressInput([
            'city' => $city,
            'country' => $country,
            'state' => $state,
            'street_address' => $street_address,
            'zipcode' => $zipcode
        ]);

        $subscription = new ChargifySubscriptionInputType($plan, $nonce, $address);
        try {
            $data = $request_context->getClient()->addWptSubscription($subscription);
            $redirect_uri = $request_context->getSignupClient()->getAuthUrl($data['loginVerificationId']);
            header("Location: {$redirect_uri}");
            exit();
        } catch (BaseException $e) {
            error_log($e->getMessage());
            throw new ClientException($e->getMessage(), "/account");
        }
    }

    public static function updatePaymentMethod(RequestContext $request_context): void
    {
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
                "street_address" => $_POST['street-address'],
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
            header('Content-type: application/json');
            echo json_encode([
                'error' => $e->getMessage()
            ]);
            error_log($e->getMessage());
            exit();
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
                    'cc_image_url' => "/images/cc-logos/{$customer->getCardType()}.svg",
                    'masked_cc' => $customer->getMaskedCreditCard(),
                    'cc_expiration' => $customer->getCCExpirationDate()
                ];
            }

            if (!is_null($customer->getPlanRenewalDate()) && $customer->getBillingFrequency() == "Annually") {
                $billing_info['runs_renewal'] = $customer->getPlanRenewalDate()->format('m/d/Y');
            }

            if (!is_null($customer->getNextBillingDate())) {
                $billing_info['plan_renewal'] = $customer->getNextBillingDate()->format('m/d/Y');
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
        if (!is_null($error_message)) {
            $results['error_message'] = $error_message;
            unset($_SESSION['client-error']);
        }

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
                    $plan = Util::getPlanFromArray($planCookie, $plans);;
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
                        $results['isUpgrade'] = Util::isUpgrade($oldPlan, $plan);
                        $results['renewaldate'] = $customer->getPlanRenewalDate()->format('m/d/Y');
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
                echo $tpl->render('my-account', $results);
                break;
        }

        exit();
    }
}
