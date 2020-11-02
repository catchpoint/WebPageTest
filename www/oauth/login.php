<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
require_once('common.inc');
$user = null;

set_include_path(get_include_path() . PATH_SEPARATOR . './lib/oauth');
require_once 'Google/Client.php';
$client_id = GetSetting('google_oauth_client_id');
$client_secret = GetSetting('google_oauth_client_secret');
$protocol = getUrlProtocol();
$host  = $_SERVER['HTTP_HOST'];
$uri   = $_SERVER['PHP_SELF'];
$redirect_uri = "$protocol://$host$uri";

$client = new Google_Client();
$client->setClientId($client_id);
$client->setClientSecret($client_secret);
$client->setRedirectUri($redirect_uri);
$client->addScope('email');

if (!isset($_GET['code'])) {
  setcookie("page_before_google_oauth", $_SERVER['HTTP_REFERER']);
  $authUrl = $client->createAuthUrl();
  header('Location: ' . filter_var($authUrl, FILTER_SANITIZE_URL));
  exit;
} else {
  $client->authenticate($_GET['code']);
  $token_data = $client->verifyIdToken()->getAttributes();

  // Keep a mapping of user ID to email addresses (and allow for it to be overridden if needed)
  $lock = Lock('Auth', true, 10);
  if ($lock) {
    $users = json_decode(gz_file_get_contents('./dat/users.dat'), true);
    $user['id'] = md5($token_data['payload']['sub']);
    $user['oauth2id'] = $token_data['payload']['sub'];
    $user['email'] = $token_data['payload']['email'];
    if (!isset($users) || !is_array($users))
      $users = array();
    if (isset($users[$user['email']]['id']))
      $user['id'] = $users[$user['email']]['id'];
    $users[$user['email']] = $user;
    gz_file_put_contents('./dat/users.dat', json_encode($users));

    // see if the user that logged in was an administrator
    $admin_users = GetSetting('admin_users');
    if ($admin_users) {
      $admins = explode(',', $admin_users);
      $email = strtolower($user['email']);
      foreach ($admins as $admin) {
        $admin = strtolower(trim($admin));
        $admin_len = strlen($admin);
        if (substr($email, -$admin_len) == $admin) {
          $session = sha1(json_encode($token_data) . time());
          setcookie("asid", $session, time()+60*60*24*7*2, "/");
          $sessions = json_decode(gz_file_get_contents('./dat/admin_sessions.dat'), true);
          if (!isset($sessions) || !is_array($sessions))
            $sessions = array();
          $sessions[$session] = $user;
          gz_file_put_contents('./dat/admin_sessions.dat', json_encode($sessions));
          break;
        }
      }
    }
    Unlock($lock);
  }

  setcookie("google_id", $user['id'], time()+60*60*24*7*2, "/");
  setcookie("google_email", $user['email'], time()+60*60*24*7*2, "/");
  $redirect = isset($_COOKIE['page_before_google_oauth']) ? $_COOKIE['page_before_google_oauth'] : "$protocol://$host/";
  header('Location: ' . $redirect);
}
?>
