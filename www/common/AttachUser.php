<?php declare(strict_types=1);

use WebPageTest\User;
use WebPageTest\Util;
use WebPageTest\Util\OAuth as CPOauth;
use WebPageTest\RequestContext;
use WebPageTest\Exception\ClientException;

(function (RequestContext $request) {
  global $admin;
  $host = Util::getSetting('host');
  $cp_access_token_cookie_name = Util::getCookieName(CPOauth::$cp_access_token_cookie_key);
  $cp_refresh_token_cookie_name = Util::getCookieName(CPOauth::$cp_refresh_token_cookie_key);

  $user = new User();

  if ($request->getClient()->isAuthenticated()) {
    $user->setAccessToken($request->getClient()->getAccessToken());
  }
  if (isset($_COOKIE[$cp_refresh_token_cookie_name])) {
    $user->setRefreshToken($_COOKIE[$cp_refresh_token_cookie_name]);
  }

  $access_token = $user->getAccessToken();

  // Signed in, grab info on user
  if (!is_null($access_token)) {
    try {
      $data = $request->getClient()->getUserDetails();
      $user->setUserId($data['id']);
      $user->setEmail($data['email']);
      $user->setPaid($data['isWptPaidUser']);
      $user->setVerified($data['isWptAccountVerified']);
    } catch (ClientException $e) {
      error_log($e->getMessage());
      setcookie($cp_access_token_cookie_name, "", time() - 3600, "/", $host);
      setcookie($cp_refresh_token_cookie_name, "", time() - 3600, "/", $host);
    } // if this fails, just delete the cookies, the token is no longer useful
  }

  $user_email = $user->getEmail();

  if (!$admin && !is_null($user_email))
  {
      $admin_users = Util::getSetting("admin_users");
      if ($admin_users)
      {
          $admin_users = explode(',', $admin_users);
          if (is_array($admin_users) && count($admin_users))
          {
            foreach($admin_users as $substr)
            {
              if (stripos($user_email, $substr) !== false)
              {
                  $user->setAdmin(true);
                  $admin = true;
                  break;
              }
            }
          }
      }
  }

  $request->setUser($user);
})($request_context);

?>
