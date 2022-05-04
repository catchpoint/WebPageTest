<?php

declare(strict_types=1);

namespace WebPageTest\Handlers;

use WebPageTest\RequestContext;
use WebPageTest\Util;
use WebPageTest\Template;
use WebPageTest\ValidatorPatterns;
use Respect\Validation\Rules;
use Respect\Validation\Exceptions\NestedValidationException;
use Braintree\Gateway as BraintreeGateway;
use GuzzleHttp\Exception\RequestException;
use WebPageTest\Exception\ClientException;

class Signup
{
  public function __construct()
  {
    throw new \Error('Do not use, static methods only');
  }

  public static function getStepOne(RequestContext $request_context, array $vars): string
  {
      $tpl = new Template('account/signup');

      try {
        $vars['wpt_plans'] = $request_context->getSignupClient()->getWptPlans();
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

      return $tpl->render('step-1', $vars);
  }

  public static function getStepTwo(RequestContext $request_context, array $vars): string
  {
      $tpl = new Template('account/signup');
      return $tpl->render('step-2', $vars);
  }

  public static function getStepThree(RequestContext $request_context, array $vars): string
  {
      $tpl = new Template('account/signup');

      $gateway = new BraintreeGateway([
        'environment' => Util::getSetting('bt_environment'),
        'merchantId' => Util::getSetting('bt_merchant_id'),
        'publicKey' => Util::getSetting('bt_api_key_public'),
        'privateKey' => Util::getSetting('bt_api_key_private')
      ]);
      $client_token = $gateway->clientToken()->generate();
      $vars['bt_client_token'] = $client_token;

      $vars['first_name'] = htmlentities($_SESSION['signup-first-name']);
      $vars['last_name'] = htmlentities($_SESSION['signup-last-name']);
      $vars['company_name'] = htmlentities($_SESSION['signup-company-name']);
      $vars['email'] = htmlentities($_SESSION['signup-email']);
      $vars['password'] = htmlentities($_SESSION['signup-password']);
      $vars['country_list'] = Util::getCountryList();

      return $tpl->render('step-3', $vars);
  }

  public static function postStepTwoFree(RequestContext $request_context, object $body): string
  {
    $auth_token = $_SESSION['signup-auth-token'] ?? $_POST['auth_token'];
    if (is_null($auth_token)) {
      $auth_token = $request_context->getSignupClient()->getAuthToken()->access_token;
    }
    $request_context->getSignupClient()->authenticate($auth_token);

    try {
      $data = $request_context->getSignupClient()->signup(array(
        'first_name' => $body->first_name,
        'last_name' => $body->last_name,
        'company' => $body->company_name,
        'email' => $body->email,
        'password' => $body->password
      ));
      // TODO: handle user already registered (send to login?)

      $redirect_uri = $request_context->getSignupClient()->getAuthUrl($data['loginVerificationId']);
      return $redirect_uri;
    } catch (\Exception $e) {
      throw $e;
    }
  }

  public static function validatePostStepTwo(): object
  {
      $vars = (object)[];

      $plan = isset($_POST['plan']) ? htmlentities($_POST['plan']) : 'free';
      $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);

      // implement pw rules
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

      $vars->email = $email;
      $vars->password = $password;
      $vars->first_name = $first_name;
      $vars->last_name = $last_name;
      $vars->company_name = $company_name;
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
      $_SESSION['signup-plan'] = $body->plan;

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
          throw new ClientException(implode(', ', $message));
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
          throw new ClientException(implode(', ', $message));
      }

      $nonce = $_POST['nonce'];
      $street_address = $_POST['street-address'];
      $city = $_POST['city'];
      $state = $_POST['state'];
      $country = $_POST['country'];
      $zipcode = $_POST['zipcode'];

      $vars->plan = $plan;
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
      $billing_address_model = [
        'streetAddress' => $body->street_address,
        'city' => $body->city,
        'state' => $body->state,
        'country' => $body->country,
        'zipcode' => $body->zipcode
      ];

      $customer = [
        'paymentMethodNonce' => $body->nonce,
        'billingAddressModel' => $billing_address_model,
        'subscriptionPlanId' => $body->plan
      ];

      // handle signup
      try {
        $data = $request_context->getSignupClient()->signup(array(
          'first_name' => $body->first_name,
          'last_name' => $body->last_name,
          'company' => $body->company,
          'email' => $body->email,
          'password' => $body->password,
          'customer' => $customer
        ));

        $redirect_uri = $request_context->getSignupClient()->getAuthUrl($data['loginVerificationId']);
        return $redirect_uri;
      } catch (\Exception $e) {
        if ($e->getCode() == 401) {
          $auth_token = $request_context->getSignupClient()->getAuthToken();
          $request_context->getSignupClient()->authenticate($auth_token->access_token);

          $data = $request_context->getSignupClient()->signup(array(
            'first_name' => $body->first_name,
            'last_name' => $body->last_name,
            'company' => $body->company,
            'email' => $body->email,
            'password' => $body->password,
            'customer' => $customer
          ));

          $redirect_uri = $request_context->getSignupClient()->getAuthUrl($data['loginVerificationId']);

        }
        throw $e;
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
