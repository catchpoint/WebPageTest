<?php
// No longer do symbol lookups
http_response_code(404);
die();

/**
* By default this will relay to the public webpagetest server to populate a cache of chrome function offsets.
* If you want the work to be done locally it requires python 2.7, some specific modules and cabextract
* and only works on a Linux server:
* 
* sudo pip install pdbparse
* sudo pip install 'construct==2.5.5-reupload'
* sudo apt-get install cabextract
*/
chdir('..');
include 'common_lib.inc';
set_time_limit(600);
ignore_user_abort(true);

$busy = false;
$methods = null;
if (isset($_REQUEST['signature']) && preg_match('/^[A-F0-9]{33,41}$/', $_REQUEST['signature'])) {
  $methods = GetMethods($_REQUEST['signature']);
}

if (isset($methods)) {
  header ("Content-type: text/plain");
  header('Last-Modified: ' . gmdate('r'));
  header('Expires: '.gmdate('r', time() + 31536000));
  echo $methods;
} else {
  if ($busy) {
    header("HTTP/1.0 403 Access Denied");
  } else {
    header("HTTP/1.0 404 Not Found");
  }
}

function GetMethods($signature) {
  global $busy;
  $methods = null;
  $cache_file = __DIR__ . "/chrome/$signature.txt";
  
  // see if we have a cached lookup
  if (is_file($cache_file)) {
    $methods = file_get_contents($cache_file);
  } else {
    // Only let one lookup run at a time, return 403's to others to have them try again
    $lock = Lock("chrome-offsets", false, 600);
    if ($lock) {
      $cache_dir = __DIR__ . '/chrome';
      if (!is_dir($cache_dir))
        mkdir($cache_dir, 0777, true);
      $methods = LookupMethods($signature, $cache_file);
      if (!isset($methods)) {
        $privateInstall = true;
        if (isset($_SERVER['HTTP_HOST']) &&
            ($_SERVER['HTTP_HOST'] == 'www.webpagetest.org' ||
             $_SERVER['HTTP_HOST'] == 'origin.webpagetest.org' ||
             $_SERVER['HTTP_HOST'] == 'agent.webpagetest.org' ||
             $_SERVER['HTTP_HOST'] == 'api.webpagetest.org')) {
            $privateInstall = false;
        }
        if ($privateInstall) {
          $options['http'] = array('method' => "GET", 'ignore_errors' => 1,);
          $context = stream_context_create($options);
          $response = file_get_contents("http://www.webpagetest.org/work/chromehooks.php?signature=$signature", NULL, $context);
          if (isset($http_response_header)) {
            $code = GetResponseCode($http_response_header);
            if ($code == 200) {
              $methods = $response;
            } elseif ($code == 403) {
              $busy = true;
            }
          }
        }
      }
      
      if (!isset($methods) && !$busy)
        $methods = '';
      
      if (!is_file($cache_file) && isset($methods))
        file_put_contents($cache_file, $methods);

      UnLock($lock);
    } else {
      $busy = true;
    }
  }
  
  return $methods;
}

function GetResponseCode(array $headers) {
  foreach ($headers as $k=>$v) {
    $t = explode( ':', $v, 2 );
    if (!isset($t[1])) {
      if( preg_match( "#HTTP/[0-9\.]+\s+([0-9]+)#",$v, $out ) )
          return intval($out[1]);
    }
  }
  return 0;
}

function LookupMethods($signature, $cache_file) {
  $methods = null;
  $chromehooks = __DIR__ . '/chromehooks.py';
  if (!is_file($cache_file) && is_file($chromehooks)) {
    $command = "python \"$chromehooks\" --signature $signature --out \"$cache_file\" 2>&1";
    exec($command, $output, $result);
  }
  if (is_file($cache_file))
    $methods = file_get_contents($cache_file);
  return $methods;
}
