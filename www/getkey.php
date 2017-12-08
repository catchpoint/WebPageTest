<?php 
include 'common.inc';
define('BARE_UI', true);
$prefix = GetSetting('api_key_prefix');
if (!$prefix)
  $prefix = 'K';
if (isset($_REQUEST['validate']) && strpos($_REQUEST['validate'], '.') !== false) {
  $parts = explode('.', $_REQUEST['validate']);
  $prefix = $parts[0];
  $_REQUEST['validate'] = $parts[1];
}
$page_keywords = array('About','Contact','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Register for a WebPagetest API key.";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Get API Key</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="author" content="Patrick Meenan">
        <style type="text/css">
        #logo {float:right;}
        </style>
        <?php $gaTemplate = 'GetKey'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            include 'header.inc';
            ?>
            
            <div class="translucent">
            <?php
            if (!GetSetting('allow_getkeys')) {
              echo "Sorry, automatic API key registration is not permitted on the WebPagetest instance.";
            } elseif (isset($_REQUEST['validate'])) {
              ValidateAPIRequest();
            } elseif (isset($_REQUEST['email'])) {
              SumbitRequest();
            } else {
              NewAPIRequest();
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>

<?php
/**
* Validate a request key that was sent to a user (and generate an API key if it validates)
* 
*/
function ValidateAPIRequest() {
  $id = $_REQUEST['validate'];
  if ($info = GetRequestInfo($id)) {
    if ($keyinfo = CreateApiKey($info)) {
      $string = EmailKeyInfo($keyinfo, true);
      echo '<br><br>';
      $html = str_replace("\n", '<br>', $string);
      $html = str_replace("&", '&AMP;', $html);
      echo $html;
      if (strlen($string)) {
        DeleteRequest($id);
      }
    } else {
      echo 'There was an internal error generating your API key.';
    }
  } else {
    echo 'Invalid registration ID.  It is possible that your existing request expired in which case you need to fill out the <a href="?">form</a> and request an API key again.';
  }
}

/**
* Generate a new API key request
* 
*/
function NewAPIRequest() {
  if (is_file(__DIR__ . '/settings/getkey.inc.php')) {
    include(__DIR__ . '/settings/getkey.inc.php');
  } else {
    echo '<form action="?" method="POST">';
    echo 'Email Address: <input type="text" name="email"> (Required)<br><br>';
    echo 'Name: <input type="text" name="name"><br><br>';
    echo 'Company: <input type="text" name="company"><br><br>';
    echo 'Web Site: <input type="text" name="website"><br><br>';
    $recaptcha = GetSetting('recaptcha_key');
    if ($recaptcha) {
      echo 'To help prevent bots, please complete the captcha:<br>';
      echo "<script src='https://www.google.com/recaptcha/api.js' async defer></script>";
      echo "<div class=\"g-recaptcha\" data-sitekey=\"$recaptcha\"></div><br>";
    }
    echo '<input type="submit" value="Submit">';
    echo '</form>';
  }
}

/**
* User submitted the form. Validate the request and email a validation link.
* 
*/
function SumbitRequest() {
  $error = null;
  $recaptcha_key = GetSetting('recaptcha_key');
  $recaptcha_secret = GetSetting('recaptcha_secret');
  if ($recaptcha_key && $recaptcha_secret) {
    if (isset($_REQUEST['g-recaptcha-response'])) {
      $response = urlencode($_REQUEST['g-recaptcha-response']);
      $url = "https://www.google.com/recaptcha/api/siteverify?secret=$recaptcha_secret&response=$response";
      $data = http_fetch($url);
      $check = json_decode($data, true);
      if (isset($check) && $check !== false && is_array($check) && isset($check['success'])) {
        if (!$check['success'])
          $error = "Captcha challenge failed";
      } else {
        $error = "Error validating the captcha (could not communicate with server)";
      }
    } else {
      $error = "Please answer the captcha challenge";
    }
  }
  
  if (isset($error)) {
    echo $error;
  } else {
    if (isset($_REQUEST['agree']) && $_REQUEST['agree']) {
      $email = trim($_REQUEST['email']);
      if (!preg_match('/[^@]+@[^\.]+\..+/', $email)) {
        echo 'Please provide a valid email address';
      } elseif (BlockEmail($email)) {
        echo 'Sorry, registration is not permitted.  Please contact us for more information.';
      } elseif ($keyinfo = GetKeyInfo($email)) {
        EmailKeyInfo($keyinfo, false);
      } elseif ($requestinfo = CreateRequest($email)) {
        EmailValidation($requestinfo);
      } else {
        echo 'Internal generating the API key request';
      }
    } else {
      echo 'Please agree to the terms and conditions';
    }
  }
}

/**
* Block email domains
* 
* @param mixed $email
*/
function BlockEmail($email) {
  $block = false;
  if (strpos($email, '+') !== false) {
    $block = true;
  } elseif (is_file('./settings/blockemail.txt')) {
    $lines = file('./settings/blockemail.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines && is_array($lines) && count($lines)) {
      foreach ($lines as $line) {
        $line = trim($line);
        if (strlen($line)) {
          if (stripos($email, $line) !== false) {
            $block = true;
            break;
          }
        }
      }
    }
  }
  return $block;
}

/**
* Open/create the database of API keys
* 
*/
function OpenKeysDatabase() {
  global $prefix;
  try {
    $db = new SQLite3(__DIR__ . "/dat/{$prefix}_api_keys.db");
    $db->query('CREATE TABLE IF NOT EXISTS keys (key TEXT PRIMARY KEY NOT NULL,created INTEGER,key_limit INTEGER NOT NULL,email TEXT UNIQUE NOT NULL,ip TEXT NOT NULL,name TEXT,company TEXT,website TEXT,contact INTEGER)');
  } catch (Exception $e) {
    $db = false;
  }
  return $db;
}

/**
* Open/create the database of API keys
* 
*/
function OpenRequestsDatabase() {
  global $prefix;
  try {
    $db = new SQLite3(__DIR__ . "/dat/{$prefix}_api_keys.db");
    $db->query('CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY NOT NULL,created INTEGER,email TEXT UNIQUE NOT NULL,ip TEXT NOT NULL,name TEXT,company TEXT,website TEXT,contact INTEGER)');
    
    // expire requests older than a week
    $earliest = time() - 604800;
    $db->query("DELETE FROM requests WHERE created < $earliest");
  } catch (Exception $e) {
    $db = false;
  }
  return $db;
}

/**
* Get existing API key info for the given email address
* 
* @param mixed $email
*/
function GetKeyInfo($email) {
  $info = false;
  if ($db = OpenKeysDatabase()) {
    $email = $db->escapeString($email);
    $info = $db->querySingle("SELECT * FROM keys WHERE email='$email'", true);
    $db->close();
  }
  return $info;
}

/**
* Get existing request the given email address
* 
* @param mixed $email
*/
function CreateRequest($email) {
  $info = false;
  global $prefix;
  if ($db = OpenRequestsDatabase()) {
    $email = $db->escapeString($email);
    $info = $db->querySingle("SELECT * FROM requests WHERE email='$email'", true);
    if (!$info) {
      $email = '"' . $email . '"';
      $name = isset($_REQUEST['name']) ? '"' . $db->escapeString($_REQUEST['name']) . '"' : 'NULL';
      $company = isset($_REQUEST['company']) ? '"' . $db->escapeString($_REQUEST['company']) . '"' : 'NULL';
      $website = isset($_REQUEST['website']) ? '"' . $db->escapeString($_REQUEST['website']) . '"' : 'NULL';
      $contact = 0;
      if (isset($_REQUEST['allow_contact']) && $_REQUEST['allow_contact'])
        $contact = 1;
      $ip = '"' . $db->escapeString($_SERVER["REMOTE_ADDR"]) . '"';
      $id = md5(uniqid(rand(), true));
      $now = time();
      if ($db->query("INSERT INTO requests (id, created, email, ip, name, company, website, contact) VALUES (\"$id\", $now, $email, $ip, $name, $company, $website, $contact)"))
        $info = array('id' => "$prefix.$id", 'email' => trim($email, '"'));
    } else {
      if (strpos($info['id'], '.') === false)
        $info['id'] = "$prefix.{$info['id']}";
    }
    $db->close();
  }
  return $info;
}

/**
* Email the API key info to the requestor
* 
* @param mixed $info
*/
function EmailKeyInfo($info, $display) {
  global $prefix;
  $email = $info['email'];
  $content = "Your API key is: {$prefix}.{$info['key']}\n\n";
  $content .= "The API key is limited to {$info['key_limit']} page loads per day.  Each run, first or repeat view counts as a page load (10 runs, first and repeat view would be 20 page loads). If you need to do more testing than that allows then you should consider running a private instance: https://sites.google.com/a/webpagetest.org/docs/private-instances\n";
  
  $l = LoadLocationsIni();
  $locations = array();
  foreach ($l as $id => $loc) {
    $id = trim($id);
    if (is_array($loc) &&
        isset($loc['browser']) &&
        isset($loc['allowKeys'])) {
      $allowed = false;
      $prefixes = explode(',', $loc['allowKeys']);
      foreach ($prefixes as $p) {
        if ($p == $prefix)
          $allowed = true;
      }
      if ($allowed) {
        $browsers = explode(',', $loc['browser']);
        if (isset($browsers) && is_array($browsers)) {
          if (count($browsers) > 1) {
            foreach($browsers as $browser) {
              $browser = trim($browser);
              $locations[] = "$id:$browser";
            }
          } else {
            $locations[] = $id;
          }
        }
      }
    }
  }
  $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
  $url = "$protocol://{$_SERVER['HTTP_HOST']}/getLocations.php?f=html&k=$prefix";
  $content .= "\nYou can see the current list of locations that are available for API testing here: $url.\n";
  if (count($locations)) {
    $content .= "\nThe following browser/location combinations are available:\n\n";
    foreach ($locations as $location)
      $content .= "$location\n";
  }
  SendMessage($email, 'WebPagetest API Key', $content);
  if ($display)
    echo str_replace("\n", "<br>", $content);
  echo '<br><br>The API key details were also sent to ' . htmlspecialchars($email);
  return $content;
}

/**
* Send a validation email
* 
* @param mixed $info
*/
function EmailValidation($info) {
  $email = $info['email'];
  $id = $info['id'];
  $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
  $url = "$protocol://{$_SERVER['HTTP_HOST']}{$_SERVER['PHP_SELF']}?validate=$id";
  $content = "Thank you for requesting a WebPagetest API key.  In order to assign a key we need to validate your email address.\n\nTo complete the validation and retrieve your API key please go to $url";
  SendMessage($email, 'WebPagetest API Key Request', $content);
  echo 'A validation email was sent to ' . htmlspecialchars($email) . '.<br><br>Once the email arrives, follow the instructions in it to activate your API key.';
}

/**
* Retrieve the information for an existing request
* 
* @param string $id
* @return mixed
*/
function GetRequestInfo($id) {
  $info = false;
  if ($db = OpenRequestsDatabase()) {
    $id = $db->escapeString($id);
    $info = $db->querySingle("SELECT * FROM requests WHERE id='$id'", true);
    $db->close();
  }  
  return $info;
}

function DeleteRequest($id) {
  if ($db = OpenRequestsDatabase()) {
    $id = $db->escapeString($id);
    $db->query("DELETE FROM requests WHERE id='$id'");
    $db->close();
  }  
}

/**
* The request has been validated, generate the API key
* 
* @param mixed $request
*/
function CreateApiKey($request) {
  global $prefix;
  $info = false;
  if ($db = OpenKeysDatabase()) {
    $email = '"' . $request['email'] . '"';
    $name = 'NULL';
    if (isset($request['name']) && strlen($request['name']))
      $name = '"' . $db->escapeString($request['name']) . '"';
    $company = 'NULL';
    if (isset($request['company']) && strlen($request['company']))
      $company = '"' . $db->escapeString($request['company']) . '"';
    $website = 'NULL';
    if (isset($request['website']) && strlen($request['website']))
      $website = '"' . $db->escapeString($request['website']) . '"';
    $contact = 0;
    if (isset($request['contact']) && $request['contact'])
      $contact = 1;
    $ip = '"' . $db->escapeString($_SERVER["REMOTE_ADDR"]) . '"';
    $key = md5(uniqid(rand(), true));
    $now = time();
    $limit = GetSetting('api_key_limit');
    if (!$limit)
      $limit = 200;
    $query = "INSERT INTO keys (key, created, key_limit, email, ip, name, company, website, contact) VALUES (\"$key\", $now, $limit, $email, $ip, $name, $company, $website, $contact)";
    if ($db->query($query)) {
      $info = $request;
      $info['key'] = $key;
      $info['key_limit'] = $limit;
      logMsg("$ip,$email,$name,$company,$website,$contact", __DIR__ . '/log/keys.log', true);
    }
    $db->close();
  }
  return $info;
}

function SendMessage($to, $subject, $body) {
  global $settings;

  // send the e-mail through an SMTP server?
  if (array_key_exists('mailserver', $settings)) {
    require_once "Mail.php";
    $mailServerSettings = $settings['mailserver'];
    $mailInit = array ();
    if (array_key_exists('host', $mailServerSettings))
      $mailInit['host'] = $mailServerSettings['host'];
    if (array_key_exists('port', $mailServerSettings))
      $mailInit['port'] = $mailServerSettings['port'];
    if (array_key_exists('useAuth', $mailServerSettings) && $mailServerSettings['useAuth']) {
      $mailInit['auth'] = true;
      $mailInit['username'] = $mailServerSettings[ 'username'];
      $mailInit['password'] = $mailServerSettings['password'];
    }
    $smtp = Mail::factory('smtp', $mailInit);
    $headers = array ('From' => $mailServerSettings['from'], 'To' => $to, 'Subject' => $subject);
    $mail = $smtp->send($to, $headers, $body);
  } else {
    mail($to, $subject, $body);
  }
}

?>