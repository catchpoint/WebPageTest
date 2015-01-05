<?php
class Appurify{
  protected $key;
  protected $secret;
  protected $lock;
  function __construct($key, $secret) {
    $this->key = $key;
    $this->secret = $secret;
    if (function_exists('curl_init')) {
      $this->curl = curl_init();
      if ($this->curl !== false) {
        curl_setopt($this->curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($this->curl, CURLOPT_FAILONERROR, true);
        curl_setopt($this->curl, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($this->curl, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($this->curl, CURLOPT_DNS_CACHE_TIMEOUT, 600);
        curl_setopt($this->curl, CURLOPT_MAXREDIRS, 10);
        curl_setopt($this->curl, CURLOPT_TIMEOUT, 600);
        curl_setopt($this->curl, CURLOPT_SSL_VERIFYPEER, false);
      }
    }
  }
  
  /**
  * Get a list of the available devices
  */
  public function GetDevices($fromServer = false) {
    $devices = null;
    $ttl = 120;
    if (!$fromServer && is_file("./tmp/appurify_{$this->key}.devices")) {
      $cache = json_decode(file_get_contents("./tmp/appurify_{$this->key}.devices"), true);
      $devices = $cache['devices'];
    } elseif ($fromServer) {
      $devices = array();
      $list = $this->Get('https://live.appurify.com/resource/devices/list/');
      if ($list !== false && is_array($list)) {
        foreach($list as $device) {
          if ($device['brand'] == 'Amazon') {
            $id = $device['device_type_id'] . '-silk';
            $name = "{$device['brand']} {$device['name']} {$device['os_name']} {$device['os_version']} - Silk";
          } else {
            if ($device['os_name'] == 'iOS' /* && intval($device['os_version']) < 7 */) {
              $id = $device['device_type_id'] . '-safari';
              $name = "{$device['brand']} {$device['name']} {$device['os_name']} {$device['os_version']} - Safari";
              $devices[$id] = $name;
            }
            $id = $device['device_type_id'] . '-chrome';
            $name = "{$device['brand']} {$device['name']} {$device['os_name']} {$device['os_version']} - Chrome";
          }
          $devices[$id] = $name;
        }
      }
      file_put_contents("./tmp/appurify_{$this->key}.devices", json_encode(array('devices' => $devices, 'time' => time())));
    }
    return $devices;
  }
  
  /**
  * Get the list of supported connectivity profiles
  * 
  */
  public function GetConnections($fromServer = false) {
    $connections = null;
    $ttl = 900;
    if (!$fromServer && is_file("./tmp/appurify_{$this->key}.connections")) {
      $cache = json_decode(file_get_contents("./tmp/appurify_{$this->key}.connections"), true);
      $connections = $cache['connections'];
    } elseif ($fromServer) {
      $connections = array();
      $list = $this->Get('https://live.appurify.com/resource/devices/config/networks/list/');
      if ($list !== false && is_array($list)) {
        foreach($list as $connection)
          $connections[] = array('id' => $connection['network_id'],
                                 'group' => $connection['network_group'],
                                 'label' => str_replace('_', ' ', $connection['network_name']));
      }
      file_put_contents("./tmp/appurify_{$this->key}.connections", json_encode(array('connections' => $connections, 'time' => time())));
    }
    return $connections;
  }
  
  /**
  * Fix up the location string
  * 
  * @param mixed $test
  */
  public function FixLocation(&$test) {
    $test['locationText'] = $test['locationLabel'];
    $devices = $this->GetDevices();
    if (array_key_exists($test['browser'], $devices))
      $test['locationText'] .= " - {$devices[$test['browser']]}";
    if (array_key_exists('requested_connectivity', $test) && is_numeric($test['requested_connectivity'])) {
      $connections = $this->GetConnections();
      foreach ($connections as $connection)
        if ($connection['id'] == $test['requested_connectivity']) {
          $test['locationText'] .= " - {$connection['group']} - {$connection['label']}";
          break;
        }
    }
  }
  
  /**
  * Submit a test to the Appurify system
  */
  public function SubmitTest(&$test, &$error) {
    $ret = true;
    for ($i = 1; $i <= $test['runs'] && $ret; $i++) {
      $result = $this->Post('https://live.appurify.com/resource/apps/upload/',
                            array('source_type' => 'url',
                                  'app_test_type' => 'browser_test'));
      if ($result !== false && is_array($result) && array_key_exists('app_id', $result)) {
        $app_id = $result['app_id'];
        $result = $this->Post('https://live.appurify.com/resource/tests/upload/',
                              array('source_type' => 'url',
                                    'test_type' => 'browser_test'));
        if ($result !== false && is_array($result) && array_key_exists('test_id', $result)) {
          $test_id = $result['test_id'];
          $video = $test['video'] ? "videocapture=1\r\n" : '';
          $browser = 'chrome';
          $device = $test['browser'];
          $network = '';
          if (array_key_exists('requested_connectivity', $test) && is_numeric($test['requested_connectivity']))
            $network = "network={$test['requested_connectivity']}\r\n";
          $timeline = '';
          if (array_key_exists('timeline', $test) && $test['timeline'])
            $timeline = "timeline=1\r\n";
          if (stripos($device, '-') !== false)
            list($device, $browser) = explode('-', $device);
          $result = $this->Post('https://live.appurify.com/resource/tests/config/upload/',
                                array('test_id' => $test_id),
                                array('name' => 'source',
                                      'filename' => 'browsertest.conf',
                                      'data' => "[appurify]\r\n" .
                                                "profiler=1\r\n" .
                                                "videocapture=0\r\n" .
                                                $network .
                                                $timeline .
                                                "[browser_test]\r\n" .
                                                "url={$test['url']}\r\n" .
                                                "browser=$browser"));
          if ($result !== false && is_array($result) && array_key_exists('test_id', $result)) {
            $result = $this->Post('https://live.appurify.com/resource/tests/run/',
                                  array('source_type' => 'url',
                                        'app_id' => $app_id,
                                        'async' => 1,
                                        'device_type_id' => $device,
                                        'test_id' => $test_id));
            if ($result !== false && is_array($result) && array_key_exists('test_run_id', $result)) {
              $test['appurify_tests'][$i] = array('id' => $result['test_run_id']);
            } else {
              $ret = false;
              $error = "Error submitting test run $i through Appurify API";
            }
          } else {
            $ret = false;
            $error = "Error configuring URL and browser through Appurify API for test ID $test_id";
          }
        } else {
          $ret = false;
          $error = "Error configuring test through Appurify API for App ID $app_id";
        }
      } else {
        $ret = false;
        $error = "Error configuring application through Appurify API";
      }
    }
    return $ret;
  }
  
  /**
  * Check a single test run to see it's status (and download the data if it is comoplete)
  */
  public function CheckTestRun(&$test, &$run, $index, $testPath) {
    $ret = false;
    if (array_key_exists('id', $run)) {
      $lock = Lock($testPath);
      $file = "$testPath/{$index}_appurify.zip";
      if (!is_file($file)) {
        $status = $this->Get('https://live.appurify.com/resource/tests/check/', array('test_run_id' => $run['id']));
        if ($status !== false &&
            is_array($status) &&
            array_key_exists('status', $status)) {
          logMsg(json_encode($status), "$testPath/{$index}_appurify_status.txt", true);
          $run['status'] = $status['status'];
          if (array_key_exists('detailed_status', $status))
            $run['detailed_status'] = $status['detailed_status'];
          if ($status['status'] == 'complete') {
            set_time_limit(1200);
            ignore_user_abort(true);
            $this->GetFile('https://live.appurify.com/resource/tests/result/', $file, array('run_id' => $run['id']));
          }
          $ret = true;
        }
      }
      if (is_file($file)) {
        set_time_limit(1200);
        ignore_user_abort(true);
        $ret = true;
        if ($this->ProcessResult($test, $run, $index, $testPath))
          $run['completed'] = true;
        unlink($file);
      }
      UnLock($lock);
    }
    return $ret;
  }
  
  protected function ProcessResult(&$test, &$run, $index, $testPath) {
    $ok = false;
    $zipfile = "$testPath/{$index}_appurify.zip";
    $zip = new ZipArchive;
    if ($zip->open($zipfile) === TRUE) {
      $tempdir = "$testPath/{$index}_appurify";
      if (!is_dir($tempdir))
          mkdir( $tempdir, 0777, true );
      $tempdir = realpath($tempdir);
      $zip->extractTo($tempdir);
      $zip->close();
      unset($zip);
    }
    if (isset($tempdir) && is_dir($tempdir)) {
      $ok = true;
      $this->ProcessDevTools($test, $tempdir, $testPath, $index);
      $this->ProcessScreenShot($test, $tempdir, $testPath, $index);
      $this->ProcessPcap($test, $tempdir, $testPath, $index);
      $this->ProcessVideo($test, $tempdir, $testPath, $index);
      delTree($tempdir);
    }
    return $ok;
  }
  
  protected function ProcessDevTools(&$test, $tempdir, $testPath, $index) {
    $devtools = array();
    $files = glob("$tempdir/appurify_results/WSData*");
    if (isset($files) && is_array($files) && count($files)) {
      $outfile = fopen("$testPath/{$index}_devtools.json", 'w');
      if ($outfile) {
        fwrite($outfile, "[");
        foreach ($files as $file)
          $this->ProcessDevToolsFile($file, $outfile);
        fwrite($outfile, "{}]");
        fclose($outfile);
        gz_compress("$testPath/{$index}_devtools.json");
        if (is_file("$testPath/{$index}_devtools.json.gz"))
          unlink("$testPath/{$index}_devtools.json");
      }
    }
  }
  
  protected function ProcessScreenShot(&$test, $tempdir, $testPath, $index) {
    if (is_file("$tempdir/appurify_results/Run 1/Screenshot_Tabs.png.png"))
      rename("$tempdir/appurify_results/Run 1/Screenshot_Tabs.png.png", "$testPath/{$index}_screen.png");
    elseif (is_file("$tempdir/appurify_results/Run 1/Screenshot_Tabs.png"))
      rename("$tempdir/appurify_results/Run 1/Screenshot_Tabs.png", "$testPath/{$index}_screen.png");
    elseif (is_file("$tempdir/appurify_results/Run 1/Screenshot_Timeline.png.png"))
      rename("$tempdir/appurify_results/Run 1/Screenshot_Timeline.png.png", "$testPath/{$index}_screen.png");
    elseif (is_file("$tempdir/appurify_results/Run 1/Screenshot_Timeline.png"))
      rename("$tempdir/appurify_results/Run 1/Screenshot_Timeline.png", "$testPath/{$index}_screen.png");
    if (is_file("$testPath/{$index}_screen.png")) {
      $img = imagecreatefrompng("$testPath/{$index}_screen.png");
      if ($img) {
        imageinterlace($img, 1);
        $quality = 75;
        if (array_key_exists('iq', $test) && $test['iq'] >= 30 && $test['iq'] < 100)
          $quality = $test['iq'];
        imagejpeg($img, "$testPath/{$index}_screen.jpg", $quality);
        imagedestroy($img);
      }
      $keep_png = false;
      if (array_key_exists('pngss', $test) && $test['pngss'])
        $keep_png = true;
      if (!$keep_png)
        unlink("$testPath/{$index}_screen.png");
    }
  }
  
  protected function ProcessVideo(&$test, $tempdir, $testPath, $index) {
    if (is_file("$tempdir/appurify_results/video.mp4")) {
      rename("$tempdir/appurify_results/video.mp4", "$testPath/{$index}_appurify.mp4");
      require_once('./video/avi2frames.inc.php');
      ProcessAVIVideo($test, $testPath, $index, 0);
    }
  }

  protected function ProcessPcap(&$test, $tempdir, $testPath, $index) {
    if (is_file("$tempdir/appurify_results/network.pcap"))
      rename("$tempdir/appurify_results/network.pcap", "$testPath/{$index}.cap");
  }
  
  protected function ProcessDevToolsFile($file, $outfile) {
    $started = false;
    $events = json_decode(file_get_contents($file), true);
    if (isset($events) && is_array($events)) {
      foreach ($events as &$event) {
        if (is_array($event) &&
            array_key_exists('method', $event) &&
            array_key_exists('params', $event) &&
            is_array($event['params'])) {
          if (!$started) {
            $url = null;
            if ($event['method'] == 'Network.requestWillBeSent' &&
                array_key_exists('request', $event['params']) &&
                is_array($event['params']['request']) &&
                array_key_exists('url', $event['params']['request']))
              $url = $event['params']['request']['url'];
            elseif ($event['method'] == 'Timeline.eventRecorded' &&
                array_key_exists('record', $event['params']) &&
                is_array($event['params']['record']) &&
                array_key_exists('type', $event['params']['record']) &&
                $event['params']['record']['type'] == 'ResourceSendRequest' &&
                array_key_exists('data', $event['params']['record']) &&
                is_array($event['params']['record']['data']) &&
                array_key_exists('url', $event['params']['record']['data']))
              $url = $event['params']['record']['data']['url'];
            if (isset($url) && strpos(substr($url, 0, 20), 'localhost') === false)
              $started = true;
          }
          if ($started) {
            fwrite($outfile, json_encode($event));
            fwrite($outfile, ',');
          }
        }
      }
    }
  }

  protected $token;
  protected $curl;
  protected function GenerateToken() {
    if (!isset($this->token)) {
      $ttl = 600;
      if (is_file("./tmp/appurify_{$this->key}.token")) {
        $token = json_decode(file_get_contents("./tmp/appurify_{$this->key}.token"), true);
        $now = time();
        if ($token &&
            is_array($token) &&
            array_key_exists('token', $token) &&
            array_key_exists('time', $token) &&
            $now > $token['time'] &&
            $now - $token['time'] < $ttl / 2)
          $this->token = $token['token'];
      }
      if (!isset($this->token)) {
        $this->Lock();
        $result = $this->Post('https://live.appurify.com/resource/access_token/generate/',
                                array('key' => $this->key,
                                      'secret' => $this->secret,
                                      'ttl' => $ttl));
        if ($result !== false && is_array($result) && array_key_exists('access_token', $result)) {
          $this->token = $result['access_token'];
          file_put_contents("./tmp/appurify_{$this->key}.token", json_encode(array('token' => $this->token, 'time' => time())));
        }
        $this->UnLock();
      }
    }
  }
  
  protected function Lock() {
    $this->lock = Lock("Appurify {$this->key}");
  }

  protected function UnLock() {
    if (isset($this->lock))
      Unlock($this->lock);
  }
  
  protected function Post($command, $data = null, $file = null) {
    $ret = false;
    if (stripos($command, 'access_token') === false)
      $this->GenerateToken();
    if ($this->curl !== false) {
      if (isset($this->token)) {
        if(!isset($data))
          $data = array();
        $data['access_token'] = $this->token;
      }
      curl_setopt($this->curl, CURLOPT_URL, $command);
      curl_setopt($this->curl, CURLOPT_POST, true);
      if (isset($file)) {
        if (!is_dir('./tmp'))
          mkdir('./tmp', 0777);
        $tempFile = "./tmp/{$file['filename']}";
        file_put_contents($tempFile, $file['data']);
        $tempFile = realpath($tempFile);
        $data[$file['name']] = "@$tempFile";
        curl_setopt($this->curl, CURLOPT_POSTFIELDS, $data);
      } else
        curl_setopt($this->curl, CURLOPT_POSTFIELDS, http_build_query($data));
      $result = curl_exec($this->curl);
      if (isset($result) && $result !== false && strlen($result)) {
        $response = json_decode($result, true);
        if (isset($response) && is_array($response) &&
            array_key_exists('meta', $response) &&
            is_array($response['meta']) &&
            array_key_exists('code', $response['meta']) &&
            $response['meta']['code'] == 200 &&
            array_key_exists('response', $response))
          $ret = $response['response'];
      }
    }
    if (isset($tempFile) && is_file($tempFile))
      unlink($tempFile);
    return $ret;
  }
  
  protected function Get($command, $data = null) {
    $ret = false;
    $this->GenerateToken();
    if ($this->curl !== false) {
      if (isset($this->token)) {
        if(!isset($data))
          $data = array();
        $data['access_token'] = $this->token;
      }
      $url = $command;
      if (isset($data))
        $url .= '?' . http_build_query($data);
      curl_setopt($this->curl, CURLOPT_URL, $url);
      curl_setopt($this->curl, CURLOPT_POSTFIELDS, '');
      curl_setopt($this->curl, CURLOPT_HTTPGET, true);
      $result = curl_exec($this->curl);
      if (isset($result) && $result !== false && strlen($result)) {
        $response = json_decode($result, true);
        if (isset($response) && is_array($response) &&
            array_key_exists('meta', $response) &&
            is_array($response['meta']) &&
            array_key_exists('code', $response['meta']) &&
            $response['meta']['code'] == 200 &&
            array_key_exists('response', $response))
          $ret = $response['response'];
      }
    }
    return $ret;
  }

  protected function GetFile($command, $file, $data = null) {
    $ret = false;
    $this->GenerateToken();
    if ($this->curl !== false) {
      if (isset($this->token)) {
        if(!isset($data))
          $data = array();
        $data['access_token'] = $this->token;
      }
      $url = $command;
      if (isset($data))
        $url .= '?' . http_build_query($data);
      curl_setopt($this->curl, CURLOPT_URL, $url);
      curl_setopt($this->curl, CURLOPT_POSTFIELDS, '');
      curl_setopt($this->curl, CURLOPT_HTTPGET, true);
      $result = curl_exec($this->curl);
      if (isset($result) && $result !== false) {
        $ret = true;
        file_put_contents($file, $result);
      }
    }
    return $ret;
  }
}
?>
