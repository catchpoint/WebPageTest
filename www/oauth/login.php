<?php
chdir('..');
require_once('common.inc');
$user = null;

set_include_path(get_include_path() . PATH_SEPARATOR . './lib/oauth');
require_once 'Google/Client.php';
$client_id = GetSetting('google_oauth_client_id');
$client_secret = GetSetting('google_oauth_client_secret');
$protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
$host  = $_SERVER['HTTP_HOST'];
$uri   = $_SERVER['PHP_SELF'];
$redirect_uri = "$protocol://$host$uri";

$client = new Google_Client();
$client->setClientId($client_id);
$client->setClientSecret($client_secret);
$client->setRedirectUri($redirect_uri);
$client->setScopes('email');

if (!isset($_GET['code'])) {
  setcookie("page_before_google_oauth", $_SERVER['HTTP_REFERER']);
  $authUrl = $client->createAuthUrl();
  header('Location: ' . filter_var($authUrl, FILTER_SANITIZE_URL));
  exit;
} else {
  $client->authenticate($_GET['code']);
  $token_data = $client->verifyIdToken()->getAttributes();
  if (isset($token_data['payload']['sub']))
    setcookie("google_id", md5($token_data['payload']['sub']), time()+60*60*24*7*2, "/");
  if (isset($token_data['payload']['email']))
    setcookie("google_email", $token_data['payload']['email'], time()+60*60*24*7*2, "/");
  $redirect = isset($_COOKIE['page_before_google_oauth']) ? $_COOKIE['page_before_google_oauth'] : "$protocol://$host/";
  header('Location: ' . $redirect);
}
?>

