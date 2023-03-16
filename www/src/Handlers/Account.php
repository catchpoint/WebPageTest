<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use Exception as BaseException;
use stdClass;
use Illuminate\Http\Response;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\Cookie;
use WebPageTest\RequestContext;
use WebPageTest\Exception\ClientException;
use WebPageTest\ValidatorPatterns;
use WebPageTest\Util;
use Respect\Validation\Rules;
use Respect\Validation\Exceptions\NestedValidationException;
use WebPageTest\CPGraphQlTypes\ChargifySubscriptionInputType;
use WebPageTest\CPGraphQlTypes\ChargifyAddressInput;
use WebPageTest\Template;
use WebPageTest\CPGraphQlTypes\ChargifySubscriptionPreviewResponse as SubscriptionPreview;

class Account
{
    /* Validate the form for a canceled account signing up again
     *
     * #[ValidationMethod]
     * #[Route(Http::POST, '/account', 'canceled-account-signup')]
     *
     *  @param array{plan: string} $post_body
     *  @return object{plan: string} $vars
     */
    public static function validateCanceledAccountSignup(array $post_body): object
    {
        $body = new stdClass();
        $body->is_upgrade = !empty($post_body['is-upgrade']);

        $subscription_id = $post_body['subscription-id'] ?? "";
        $nonce = $post_body['nonce'] ?? "";
        $city = $post_body['city'] ?? "";
        $country = $post_body['country'] ?? "";
        $state = $post_body['state'] ?? "";
        $street_address = $post_body['street-address'] ?? "";
        $zipcode = $post_body['zipcode'] ?? "";

        if (
            empty($city) ||
            empty($country) ||
            empty($state) ||
            empty($street_address) ||
            empty($zipcode) ||
            empty($nonce) ||
            empty($subscription_id)
        ) {
            throw new ClientException("Please complete all required fields", "/account");
        }

        $body->subscription_id = $subscription_id;
        $body->token = $nonce;
        $body->address = new ChargifyAddressInput([
          'city' => $city,
          'country' => $country,
          'state' => $state,
          'street_address' => $street_address,
          'zipcode' => $zipcode
        ]);

        $body->plan = $post_body['plan'];

        return $body;
    }

    public static function canceledAccountSignup(RequestContext $request_context, object $body): RedirectResponse
    {
        $up = $request_context->getClient()->updatePaymentMethod($body->token, $body->address);
        $new = $up && $request_context->getClient()->updatePlan($body->subscription_id, $body->plan, $body->is_upgrade);

        if ($new) {
            $success_message = [
              'type' => 'success',
              'text' => 'Your plan has been successfully updated!'
            ];
            $request_context->getBannerMessageManager()->put('form', $success_message);
        } else {
            $error_message = [
              'type' => 'error',
              'text' => 'Your plan was not updated successfully. Please try again or contact customer service.'
            ];
            $request_context->getBannerMessageManager()->put('form', $error_message);
        }

        $protocol = $request_context->getUrlProtocol();
        $host = $request_context->getHost();
        $redirect_uri = "{$protocol}://{$host}/account";
        return new RedirectResponse($redirect_uri);
    }

    /* Validate that a plan is selected
     *
     * #[ValidationMethod]
     * #[Route(Http::POST, '/account', 'upgrade-plan-1')]
     *
     *  @param array{plan: string} $post_body
     *  @return object{plan: string} $vars
     */
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

    /* Pass the plan id to the plan summary page by setting a cookie to be retrieved
    *
    *  #[HandlerMethod]
    *  #[Route(Http::POST, '/account', 'upgrade-plan-1')]
    *
    *  @param WebPageTest\RequestContext $request_context
    *  @param object{plan: string} $body
    *  @return Symfony\Component\HttpFoundation\Response
    */
    public static function postPlanUpgrade(RequestContext $request_context, object $body): RedirectResponse
    {
        $host = $request_context->getHost();
        $protocol = $request_context->getUrlProtocol();
        $redirect_uri = "{$protocol}://{$host}/account/plan_summary";
        $response = new RedirectResponse($redirect_uri);
        $cookie = Cookie::create('upgrade-plan')
            ->withValue($body->plan)
            ->withExpires(time() + (5 * 60))
            ->withPath("/")
            ->withDomain($host);
        $response->headers->setCookie($cookie);
        return $response;
    }

    /* validate PostUpdatePlanSummary
     *
     * #[ValidatorMethod]
     * #[Route(Http::POST, '/account', 'upgrade-plan-2')]
     *
     *  @param array{plan: string, subscription_id: string, is_upgrade: string, runs: string} $post_body
     *  @return object{plan: string, subscription_id: string, is_upgrade: bool, runs: int} $body
     */
    public static function validatePostUpdatePlanSummary(array $post_body): object
    {
        $body = new stdClass();
        $body->plan = $post_body['plan'];
        $body->subscription_id = $post_body['subscription_id'];
        $body->is_upgrade = !empty($post_body['is_upgrade']);
        $body->runs = (int)filter_var($post_body['runs'] ?? "", FILTER_SANITIZE_NUMBER_INT);
        return $body;
    }

    /* Submit the plan upgrade
     *
     * #[HandlerMethod]
     * #[Route(Http::POST, '/account', 'upgrade-plan-2')]
     *
     *  @param WebPageTest\RequestContext $request_context
     *  @param object{plan: string, subscription_id: string, is_upgrade: bool, runs: int} $body
     *  @return Symfony\Component\HttpFoundation\RedirectResponse
     */
    public static function postUpdatePlanSummary(RequestContext $request_context, object $body): RedirectResponse
    {
        $host = $request_context->getHost();
        $protocol = $request_context->getUrlProtocol();

        try {
            $request_context->getClient()->updatePlan($body->subscription_id, $body->plan, $body->is_upgrade);

            $success_message = [
                'type' => 'success',
                'text' => 'Your plan has been successfully updated!'
            ];
            $request_context->getBannerMessageManager()->put('form', $success_message);

            // NOTE1: doing this to beat out a race condition, yay distributed systems
            if ($body->is_upgrade) {
                $_SESSION['new-run-count'] = $body->runs;
            }

            return new RedirectResponse("{$protocol}://{$host}/account");
        } catch (\Exception $e) {
            error_log($e->getMessage());
            $error_message = [
                'type' => 'error',
                'text' => 'There was an error updating your plan. Please try again or contact customer service.'
            ];
            $request_context->getBannerMessageManager()->put('form', $error_message);
            return new RedirectResponse("{$protocol}://{$host}/account");
        }
    }


    /* Validate change info
     *
     * #[ValidatorMethod]
     * #[Route(Http::POST, '/account', 'change-info')]
     *
     *  @param array{id: string, first-name: string, last-name: string, company-name: ?string} $post_body
     *  @return object{id: string, first_name: string, last_name: string, company_name: ?string} $body
     */
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
            if (!is_null($company_name) && !empty($company_name)) {
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

    /* Change contact info
     *
     * #[HandlerMethod]
     * #[Route(Http::POST, '/account', 'change-info')]
     *
     * @param WebPageTest\RequestContext $request_context
     * @param object{first_name: string, last_name: string, company_name: ?string} $body
     * @return string $redirect_uri
     */
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

    /* Change password
     *
     * #[HandlerMethod]
     * #[Route(Http::POST, '/account', 'password')]
     *
     * @param WebPageTest\RequestContext $request_context
     * @param object{new_password: string, current_password: string} $body
     *
     * @return string $redirect_uri
     */
    public static function changePassword(RequestContext $request_context, object $body): string
    {
        $protocol = $request_context->getUrlProtocol();
        $host = $request_context->getHost();
        $route = '/account';
        try {
            $request_context->getClient()->changePassword($body->new_password, $body->current_password);
            $success_message = [
                'type' => 'success',
                'text' => 'Your password has been updated!'
            ];
            $request_context->getBannerMessageManager()->put('form', $success_message);
            return "{$protocol}://{$host}{$route}";
        } catch (BaseException $e) {
            error_log($e->getMessage());
            $error_message = [
                'type' => 'error',
                'text' => 'Password update failed'
            ];
            $request_context->getBannerMessageManager()->put('form', $error_message);
            return "{$protocol}://{$host}{$route}";
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
        $body->plan = strtolower($plan);
        $body->city = $city;
        $body->country = $country;
        $body->state = $state;
        $body->street_address = $street_address;
        $body->zipcode = $zipcode;

        return $body;
    }

    // Existing free/canceled/expired user subscribes to a paid account
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'account-signup')]
    public static function subscribeToAccount(RequestContext $request_context, object $body): RedirectResponse
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
                'text' => 'Your plan has been successfully updated! '
            );
            $request_context->getBannerMessageManager()->put('form', $successMessage);
            return new RedirectResponse($redirect_uri);
        } catch (BaseException $e) {
            error_log($e->getMessage());
            $message = "There was an error. Please try again or contact customer service.";
            $errorMessage = array(
                'type' => 'error',
                'text' => $message
            );
            $request_context->getBannerMessageManager()->put('form', $errorMessage);
            $host = $request_context->getHost();
            $protocol = $request_context->getUrlProtocol();
            $redirect_uri = "{$protocol}://{$host}/account";

            return new RedirectResponse($redirect_uri);
        }
    }

    // Part 1 of changing a payment method
    // Validate their address
    //
    // #[ValidatorMethod]
    // #[Route(Http::POST, '/account', 'update-payment-method-confirm-billing')]
    public static function validateUpdatePaymentMethodConfirmBilling(array $post): object
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
        $body->renewaldate = $post['renewaldate'] ?? null;

        return $body;
    }

    // Part 1 of changing a payment method
    // Validate their address, check for plan price
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'update-payment-method-confirm-billing')]
    public static function updatePaymentMethodConfirmBilling(RequestContext $request_context, object $body): string
    {
        $results = [];
        $tpl = new Template('account');
        $tpl->setLayout('account');

        $address = new ChargifyAddressInput([
        'street_address' => $body->street_address,
        'city' => $body->city,
        'state' => $body->state,
        'country' => $body->country,
        'zipcode' => $body->zipcode
        ]);

        $results['street_address'] = $body->street_address;
        $results['city'] = $body->city;
        $results['state'] = $body->state;
        $results['country'] = $body->country;
        $results['zipcode'] = $body->zipcode;

        $is_canceled = $request_context->getUser()->isCanceled();
        $results['is_canceled'] = $is_canceled;

        if (!$is_canceled) {
            $preview = $request_context->getClient()->getChargifySubscriptionPreview($body->plan, $address);

            $results['subtotal'] = number_format($preview->getSubTotalInCents() / 100, 2);
            $results['tax'] = number_format($preview->getTaxInCents() / 100, 2);
            $results['total'] = number_format($preview->getTotalInCents() / 100, 2);
            $results['renewaldate'] = $body->renewaldate;
        }

        $results['ch_client_token'] = Util::getSetting('ch_key_public');
        $results['ch_site'] = Util::getSetting('ch_site');
        $results['support_link'] = Util::getSetting('support_link', 'https://support.catchpoint.com');
        return $tpl->render('billing/update-payment', $results);
    }

    // Validate changing a user's payment method
    //
    // #[ValidatorMethod]
    // #[Route(Http::POST, '/account', 'update-payment-method')]
    public static function validateUpdatePaymentMethod(array $post): object
    {
        $body = new stdClass();

        if (
            !(isset($post['nonce']) &&
                isset($post['street-address']) &&
                isset($post['city']) &&
                isset($post['state']) &&
                isset($post['country']) &&
                isset($post['zipcode'])
            )
        ) {
            $msg = "Payment token, street address, city, state, country, and zipcode must all be filled";
            throw new ClientException($msg, "/account");
        }

        $body->token = (string)$post['nonce'];
        $body->plan = $post['plan'];
        $body->street_address = $post['street-address'];
        $body->city = $post['city'];
        $body->state = $post['state'];
        $body->country = $post['country'];
        $body->zipcode = $post['zipcode'];

        return $body;
    }
    // Change a user's payment method
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'update-payment-method')]
    public static function updatePaymentMethod(RequestContext $request_context, object $body): string
    {

        try {
            $address = new ChargifyAddressInput([
                "street_address" => $body->street_address,
                "city" => $body->city,
                "state" => $body->state,
                "country" => $body->country,
                "zipcode" => $body->zipcode
            ]);

            $request_context->getClient()->updatePaymentMethod($body->token, $address);
            $successMessage = array(
                'type' => 'success',
                'text' => 'Your payment method has successfully been updated!'
            );
            $request_context->getBannerMessageManager()->put('form', $successMessage);
        } catch (BaseException $e) {
            error_log($e->getMessage());
            $message = "There was an error updating your payment method. Please try again or contact customer service.";
            $errorMessage = array(
                'type' => 'error',
                'text' => $message
            );
            $request_context->getBannerMessageManager()->put('form', $errorMessage);
        }

        $host = $request_context->getHost();
        $protocol = $request_context->getUrlProtocol();
        return "{$protocol}://{$host}/account";
        exit();
    }

    // Cancel a paid subscription
    //
    // #[HandlerMethod]
    // #[Route(Http::POST, '/account', 'cancel-subscription')]
    public static function cancelSubscription(RequestContext $request_context): string
    {

        $subscription_id = filter_input(INPUT_POST, 'subscription-id', FILTER_UNSAFE_RAW);

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

    /* Validate createApiKey
     *
     * #[ValidatorMethod]
     * #[Route(Http::POST, '/account', 'create-api-key')]
     *
     * @param array{api-key-name: string} $post_body
     * @return object{name: string} $vars
     */
    public static function validateCreateApiKey(array $post_body): object
    {
        $vars = new stdClass();

        $name = $post_body['api-key-name'] ?? "";
        $vars->name = filter_var($name, FILTER_UNSAFE_RAW);

        if (empty($vars->name)) {
            throw new ClientException('Valid name required for API key', '/account#api-consumers');
        }

        return $vars;
    }

    /* Create a WPT api key for a user
     *
     * #[HandlerMethod]
     * #[Route(Http::POST, '/account', 'create-api-key')]
     *
     * @param WebPageTest\RequestContext $request_context
     * @param object{name: string} $body
     *
     * @return string $redirect_uri
     */
    public static function createApiKey(RequestContext $request_context, object $body): string
    {
        $protocol = $request_context->getUrlProtocol();
        $host = Util::getSetting('host');
        $route = '/account#api-consumers';

        try {
            $request_context->getClient()->createApiKey($body->name);
            $success_message = [
                'type' => 'success',
                'text' => 'You added an API key'
            ];
            $request_context->getBannerMessageManager()->put('form', $success_message);
            $redirect_uri = "{$protocol}://{$host}{$route}";
            return $redirect_uri;
        } catch (\Exception $e) {
            error_log($e->getMessage());
            $error_message = [
                'type' => 'error',
                'text' => 'There was an error adding your API key, please try again'
            ];
            $request_context->getBannerMessageManager()->put('form', $error_message);
            $redirect_uri = "{$protocol}://{$host}{$route}";
            return $redirect_uri;
        }
    }

    /* Validate deleteApiKey
     *
     * #[ValidatorMethod]
     * #[Route(Http::POST, '/account', 'delete-api-key')]
     *
     * @param array{api-key-id: array<string>} $post_body
     * @return object{api_key_ids: array<int>} $vars
     */
    public static function validateDeleteApiKey(array $post_body): object
    {
        $vars = new stdClass();
        $api_key_ids = $post_body['api-key-id'];
        if (empty($api_key_ids)) {
            throw new ClientException('Must select api key to delete', '/account#api-consumers');
        }

        $sanitized_keys = array_filter($api_key_ids, function ($v) {
            return filter_var($v, FILTER_SANITIZE_NUMBER_INT);
        });
        if (empty($sanitized_keys)) {
            throw new ClientException('Must be valid api keys', '/account#api-consumers');
        }

        $vars->api_key_ids = array_map(function ($v) {
            return intval($v);
        }, $sanitized_keys);

        return $vars;
    }

    /* Delete a WPT api key for a user
     *
     * #[HandlerMethod]
     * #[Route(Http::POST, '/account', 'delete-api-key')]
     *
     * @param WebPageTest\RequestContext $request_context
     * @param object{api_key_ids: array<int>} $body
     *
     * @return string $redirect_uri
     */
    public static function deleteApiKey(RequestContext $request_context, object $body): string
    {

        $protocol = $request_context->getUrlProtocol();
        $host = Util::getSetting('host');
        $route = '/account#api-consumers';
        $redirect_uri = "{$protocol}://{$host}{$route}";

        try {
            $request_context->getClient()->deleteApiKey($body->api_key_ids);
            $success_message = [
              'type' => "success",
              'text' => "Successfully deleted"
            ];
            $request_context->getBannerMessageManager()->put('form', $success_message);
            return $redirect_uri;
        } catch (\Exception $e) {
            error_log($e->getMessage());
            $error_message = [
              'type' => "error",
              'text' => "There was a problem deleting your key. Try again or contact customer service."
            ];
            $request_context->getBannerMessageManager()->put('form', $error_message);
            return $redirect_uri;
        }


        header("Location: {$redirect_uri}");
        exit();
    }

    /**
     *
     * Previews cost (including taxes) of signing up with plan
     *
     * #[ValidatorMethod]
     * #[Route(Http::POST, '/account', 'account-signup-preview')]
     *
     * @param array{
     *     plan: string,
     *     street-address: string,
     *     city: string,
     *     state: string,
     *     country: string,
     *     zipcode: string
     * } $post
     *
     * @return object{
     *     plan: string,
     *     street_address: string,
     *     city: string,
     *     state: string,
     *     country: string,
     *     zipcode: string
     * } $body
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
     * Previews cost (including taxes) of signing up with plan
     *
     * On error, returns an array{error: string}
     *
     * #[HandlerMethod]
     * #[Route(Http::POST, '/account', 'account-signup-preview')]
     *
     * @param RequestContext $request_context
     * @param object{
     *     plan: string,
     *     street_address: string,
     *     city: string,
     *     state: string,
     *     country: string,
     *     zipcode: string
     * } $body
     *
     * @return SubscriptionPreview $totals
     */
    public static function previewCost(RequestContext $request_context, object $body): SubscriptionPreview
    {
        $plan = $body->plan;
        $address = new ChargifyAddressInput([
            "street_address" => $body->street_address,
            "city" => $body->city,
            "state" => $body->state,
            "country" => $body->country,
            "zipcode" => $body->zipcode
        ]);

        return $request_context->getClient()->getChargifySubscriptionPreview($plan, $address);
    }

    /**
     *
     * Triggers sending email verification email to a user
     *
     * #[HandlerMethod]
     * #[Route(Http::POST, '/account', 'resend-email-verification')]
     *
     * @param RequestContext $request_context
     * @return string $redirect_uri
     */
    public static function resendEmailVerification(RequestContext $request_context): string
    {
        try {
            $request_context->getClient()->resendEmailVerification();

            $protocol = $request_context->getUrlProtocol();
            $host = $request_context->getHost();
            $route = '/account';
            $redirect_uri = "{$protocol}://{$host}{$route}";
            return $redirect_uri;
        } catch (\Exception $e) {
            error_log($e->getMessage());
            throw new ClientException($e->getMessage(), "/account");
        }
    }

    /**
     * GET for the account page
     *
     * @param RequestContext $request_context
     * @param string $page the specific account route being accessed - UNSAFE. Do not output
     *
     * @return RedirectResponse|Response
     */
    public static function getAccountPage(RequestContext $request_context, string $page)
    {
        $error_message = $_SESSION['client-error'] ?? null;

        $is_paid = $request_context->getUser()->isPaid();
        $is_canceled = $request_context->getUser()->isCanceled();
        $is_expired = $request_context->getUser()->isExpired();
        $is_verified = $request_context->getUser()->isVerified();
        $is_pending = $request_context->getUser()->isPendingCancelation();
        $is_wpt_enterprise = $request_context->getUser()->isWptEnterpriseClient();
        $contact_id = $request_context->getUser()->getUserId();
        $remaining_runs = $request_context->getUser()->getRemainingRuns();
        // See NOTE1
        if (isset($_SESSION['new-run-count'])) {
            $remaining_runs = $_SESSION['new-run-count'];
            unset($_SESSION['new-run-count']);
        }
        $monthly_runs = $request_context->getUser()->getMonthlyRuns();
        $run_renewal_date = $request_context->getUser()->getRunRenewalDate()->format('F d, Y');
        $user_email = $request_context->getUser()->getEmail();
        $contact_info = $request_context->getClient()->getUserContactInfo($contact_id);
        $first_name = $contact_info['firstName'];
        $last_name = $contact_info['lastName'];
        $company_name = $contact_info['companyName'] ?? "";


        $contact_info = [
            'layout_theme' => 'b',
            'is_paid' => $is_paid,
            'is_pending' => $is_pending,
            'is_canceled' => $is_canceled,
            'is_expired' => $is_expired,
            'is_verified' => $is_verified,
            'is_wpt_enterprise' => $is_wpt_enterprise,
            'first_name' => htmlspecialchars($first_name),
            'last_name' => htmlspecialchars($last_name),
            'email' => $user_email,
            'company_name' => htmlspecialchars($company_name),
            'id' => $contact_id
        ];

        $billing_info = [];
        $country_list = Util::getChargifyCountryList();
        $state_list = Util::getChargifyUSStateList();


        if ($is_paid || $is_canceled) {
            $acct_info = $is_wpt_enterprise
                ? $request_context->getClient()->getPaidEnterpriseAccountPageInfo()
                : $request_context->getClient()->getPaidAccountPageInfo();
            $customer = $acct_info->getCustomer();
            $sub_id = $customer->getSubscriptionId();

            $billing_info = [
                'api_keys' => $acct_info->getApiKeys(),
                'wptCustomer' => $customer,
                'transactionHistory' => $sub_id ? $request_context->getClient()->getTransactionHistory($sub_id) : null,
                'status' => $customer->getStatus(),
                'billing_frequency' => $customer->getBillingFrequency() == 12 ? "Annually" : "Monthly",
                'cc_image_url' => "/assets/images/cc-logos/{$customer->getCardType()}.svg",
                'masked_cc' => $customer->getMaskedCreditCard(),
                'cc_expiration' => $customer->getCCExpirationDate(),
            ];

            if (!is_null($customer->getNextBillingDate())) {
                $billing_info['next_billing_date'] = $customer->getNextBillingDate()->format('F d, Y');
            }
        }
        $plan_set = $request_context->getClient()->getFullWptPlanSet();
        $current_plans = $plan_set->getCurrentPlans();
        $all_plans = $plan_set->getAllPlans();

        $results = array_merge($contact_info, $billing_info);
        $results['run_renewal_date'] = $run_renewal_date;
        $results['remaining_runs'] = $remaining_runs;
        $results['monthly_runs'] = $monthly_runs;
        $results['csrf_token'] = $_SESSION['csrf_token'] ?? null;
        $results['validation_pattern'] = ValidatorPatterns::getContactInfo();
        $results['validation_pattern_password'] = ValidatorPatterns::getPassword();
        $results['country_list'] = $country_list;
        $results['state_list'] = $state_list;
        $results['country_list_json_blob'] = Util::getCountryJsonBlob();
        $results['plans'] = $current_plans;
        $results['messages'] = $request_context->getBannerMessageManager()->get();
        $results['support_link'] = Util::getSetting('support_link', 'https://support.catchpoint.com');

        if (!is_null($error_message)) {
            $results['error_message'] = $error_message;
            unset($_SESSION['client-error']);
        }
        $tpl = new Template('account');
        $tpl->setLayout('account');

        switch ($page) {
            case 'update_billing':
                $oldPlan = $all_plans->getPlanById($customer->getWptPlanId());
                $newPlan = $all_plans->getAnnualPlanByRuns($oldPlan->getRuns());
                $results['oldPlan'] = $oldPlan;
                $results['newPlan'] = $newPlan;
                $sub_id = $customer->getSubscriptionId();
                $billing_address = $customer->getAddress();
                $addr = ChargifyAddressInput::fromChargifyInvoiceAddress($billing_address);
                $preview = $request_context->getClient()->getChargifySubscriptionPreview($newPlan->getId(), $addr);
                $results['sub_total'] = number_format($preview->getSubTotalInCents() / 100, 2);
                $results['tax'] = number_format($preview->getTaxInCents() / 100, 2);
                $results['total'] = number_format($preview->getTotalInCents() / 100, 2);
                $results['renewaldate'] = $customer->getNextPlanStartDate()->format('m/d/Y');

                $content = $tpl->render('billing/billing-cycle', $results);
                return new Response($content, Response::HTTP_OK);
                break;
            case 'update_plan':
                if ($is_paid) {
                    $oldPlan = $all_plans->getPlanById($customer->getWptPlanId());
                    $results['oldPlan'] = $oldPlan;
                }
                $content = $tpl->render('plans/upgrade-plan', $results);
                return new Response($content, Response::HTTP_OK);
                break;
            case 'plan_summary':
                $planCookie = $_COOKIE['upgrade-plan'];
                if (isset($planCookie) && $planCookie) {
                    $plan = $all_plans->getPlanById($planCookie);
                    $results['plan'] = $plan;
                    if ($is_paid) {
                        $oldPlan = $all_plans->getPlanById($customer->getWptPlanId());
                        $billing_address = $customer->getAddress();
                        $addr = ChargifyAddressInput::fromChargifyInvoiceAddress($billing_address);
                        $preview = $request_context->getClient()->getChargifySubscriptionPreview($plan->getId(), $addr);
                        $results['sub_total'] = number_format($preview->getSubTotalInCents() / 100, 2);
                        $results['tax'] = number_format($preview->getTaxInCents() / 100, 2);
                        $results['total'] = number_format($preview->getTotalInCents() / 100, 2);
                        $results['isUpgrade'] = $plan->isUpgrade($oldPlan);
                        $results['renewaldate'] = $customer->getNextPlanStartDate();

                        $content = $tpl->render('plans/plan-summary-upgrade', $results);
                        return new Response($content, Response::HTTP_OK);
                    } elseif ($is_pending) {
                        $oldPlan = $all_plans->getPlanById($customer->getWptPlanId());
                        $results['is_pending'] = $is_pending;

                        $results['ch_client_token'] = Util::getSetting('ch_key_public');
                        $results['ch_site'] = Util::getSetting('ch_site');
                        $results['is_upgrade'] = $plan->isUpgrade($oldPlan);
                        $results['subscription_id'] = $customer->getSubscriptionId();

                        $content = $tpl->render('plans/plan-summary', $results);
                        return new Response($content, Response::HTTP_OK);
                    } else {
                        $results['ch_client_token'] = Util::getSetting('ch_key_public');
                        $results['ch_site'] = Util::getSetting('ch_site');

                        $content = $tpl->render('plans/plan-summary', $results);
                        return new Response($content, Response::HTTP_OK);
                    }
                    break;
                } else {
                  //TODO redirect instead
                    $content = $tpl->render('plans/upgrade-plan', $results);
                    return new Response($content, Response::HTTP_OK);
                    break;
                }
            case 'update_payment_method':
                if (!$is_paid && !$is_canceled) {
                    $host = $request_context->getHost();
                    $protocol = $request_context->getUrlProtocol();
                    $redirect_uri = "{$protocol}://{$host}/account";
                    return new RedirectResponse($redirect_uri);
                }
                $results['plan'] = $customer->getWptPlanId();
                $results['renewaldate'] = !is_null($customer->getNextPlanStartDate())
                    ? $customer->getNextPlanStartDate()->format('m/d/Y')
                    : null;

                $billing_address = $customer->getAddress();

                if (is_null($billing_address)) {
                    $results['street_address'] = "";
                    $results['city'] = "";
                    $results['state_code'] = "";
                    $results['country_code'] = "";
                    $results['zipcode'] = "";
                } else {
                    $results['street_address'] = $billing_address->getStreet();
                    $results['city'] = $billing_address->getCity();
                    $results['state_code'] = $billing_address->getState();
                    $results['country_code'] = $billing_address->getCountry();
                    $results['zipcode'] = $billing_address->getZip();
                }

                $results['support_link'] = Util::getSetting('support_link', 'https://support.catchpoint.com');

                $content = $tpl->render('billing/update-payment-confirm-address', $results);
                return new Response($content, Response::HTTP_OK);
                break;
            default:
                $can_have_next_plan = ($is_paid && !$is_wpt_enterprise);
                $next_plan =  $can_have_next_plan ? $customer->getNextWptPlanId() : null;
                if (isset($next_plan)) {
                    $results['upcoming_plan'] =  $all_plans->getPlanById($next_plan);
                }

                $content = $tpl->render('my-account', $results);
                return new Response($content, Response::HTTP_OK);
                break;
        }

        exit();
    }
}
