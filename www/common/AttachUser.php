<?php declare(strict_types=1);

use WebPageTest\User;
use WebPageTest\Util;

(function ($request) {
  global $admin;

  $user = new User();

  if (isset($_COOKIE['cp_access_token'])) {
    $user->setAccessToken($_COOKIE['cp_access_token']);
  }
  if (isset($_COOKIE['cp_refresh_token'])) {
    $user->setRefreshToken($_COOKIE['cp_refresh_token']);
  }

  $access_token = $user->getAccessToken();

  // Signed in, grab info on user
  if (!is_null($access_token)) {
    $data = $request->getClient()->getUserDetails();
    $user->setUserId($data['id']);
    $user->setEmail($data['email']);
    $user->setPaid($data['isWptPaidUser']);
    $user->setVerified($data['isWptAccountVerified']);
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
})($request);

?>
