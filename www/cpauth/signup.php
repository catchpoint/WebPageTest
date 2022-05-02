<?php

declare(strict_types=1);

require_once __DIR__ . '/../common.inc';

use WebPageTest\RequestContext;
use WebPageTest\Util;
use WebPageTest\Exception\ClientException;
use WebPageTest\Handlers\Signup as SignupHandler;

(function (RequestContext $request_context) {
    if (!Util::getSetting('cp_auth')) {
        $protocol = $request_context->getUrlProtocol();
        $host = Util::getSetting('host');
        $route = '/';
        $redirect_uri = "{$protocol}://{$host}{$route}";

        header("Location: {$redirect_uri}");
        exit();
    }

    $request_method = $request_context->getRequestMethod();

    if ($request_method != 'POST' && $request_method != 'GET') {
        throw new ClientException("Method not supported on this endpoint");
    }

    if ($request_method == 'POST') {
        $csrf_token = $_POST['csrf_token'];
        if ($csrf_token != $_SESSION['csrf_token']) {
          throw new ClientException('CSRF error', '/signup', 403);
        }

        $signup_step = (int) filter_input(INPUT_POST, 'step', FILTER_SANITIZE_NUMBER_INT);

        switch ($signup_step) {
          case 2:
            $body = SignupHandler::validatePostStepTwo();
            if ($body->plan == 'free') {
                $redirect_uri = SignupHandler::postStepTwoFree($request_context, $body);
                header("Location: {$redirect_uri}");
                exit();
            } else {
              $redirect_uri = SignupHandler::postStepTwoPaid($request_context, $body);
              header("Location: {$redirect_uri}");
            }
            break;
          case 3:
            // gather post body
            $body = SignupHandler::validatePostStepThree();
            $redirect_uri = SignupHandler::postStepThree($request_context, $body);

            // unset values
            unset($_SESSION['signup-first-name']);
            unset($_SESSION['signup-last-name']);
            unset($_SESSION['signup-company-name']);
            unset($_SESSION['signup-email']);
            unset($_SESSION['signup-password']);
            unset($_SESSION['signup-plan']);


            // send to account page
            header("Location: {$redirect_uri}");
            break;
          default: // step 1 or whatever somebody tries to send
            $body = SignupHandler::validatePostStepOne();
            $redirect_uri = SignupHandler::postStepOne($request_context);

            unset($_SESSION['signup-plan']);
            $_SESSION['signup-plan'] = $body->plan;

            header("Location: {$redirect_uri}");
            break;
        }
        exit();
    }

    $csrf_token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $csrf_token;


    $vars = array(
      'csrf_token' => $csrf_token
    );

    $signup_step = (int) filter_input(INPUT_GET, 'step', FILTER_SANITIZE_NUMBER_INT);
    $plan = $_SESSION['signup-plan'] ?? null;
    $is_plan_free = is_null($plan) || $plan == 'free';

    $auth_token = $_SESSION['signup-auth-token'] ?? null;
    if (is_null($auth_token)) {
      $auth_token = $request_context->getSignupClient()->getAuthToken()->access_token;
      $_SESSION['signup-auth-token'] = $auth_token;
    }
    $request_context->getSignupClient()->authenticate($auth_token);
    $vars['auth_token'] = $auth_token;
    $vars['plan'] = $plan;
    $vars['is_plan_free'] = $is_plan_free;

    switch ($signup_step) {
      case 2:
        echo SignupHandler::getStepTwo($request_context, $vars);
        break;
      case 3:
        echo SignupHandler::getStepThree($request_context, $vars);
        break;
      default: // step 1 or whatever somebody tries to send
        echo SignupHandler::getStepOne($request_context, $vars);
        break;
    }
    exit();
})($request_context);
