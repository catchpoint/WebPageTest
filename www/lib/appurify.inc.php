<?php
class Appurify{
  protected $key;
  protected $secret;
  protected $lock;
  function __construct($key, $secret) {
    $this->key = $key;
    $this->secret = $secret;
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
      $log = fopen("./log/appurify-curl-post.txt", 'a+');
      if ($log) {
        curl_setopt($this->curl, CURLOPT_VERBOSE, true);
        curl_setopt($this->curl, CURLOPT_STDERR, $log);
      }
    }
    $this->GenerateToken();
  }
  
  /**
  * Get a list of the available devices
  */
  public function GetDevices() {
    $devices = array();
    $list = $this->Get('https://live.appurify.com/resource/devices/list/');
    if ($list !== false && is_array($list)) {
      foreach($list as $device) {
        $name = "{$device['brand']} {$device['name']} {$device['os_name']} {$device['os_version']}";
        $devices[$device['device_type_id']] = $name;
      }
    }
    return $devices;
  }
  
  /**
  * Submit a test to the Appurify system
  */
  public function SubmitTest(&$test, &$error) {
    $ret = false;
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
        $pcap = $test['tcpdump'] ? "pcap=1\r\n" : '';
        $video = $test['video'] ? "videocapture=1\r\n" : '';
        $result = $this->Post('https://live.appurify.com/resource/config/upload/',
                              array('test_id' => $test_id),
                              array('name' => 'source',
                                    'filename' => 'browsertest.conf',
                                    'data' => "[appurify]\r\n" .
                                              "profiler=1\r\n" .
                                              $pcap .
                                              $video .
                                              "[browser_test]\r\n" .
                                              "url={$test['url']}\r\n" .
                                              "browser=chrome"));
        if ($result !== false && is_array($result) && array_key_exists('test_id', $result)) {
          $ret = true;
          for ($i = 1; $i <= $test['runs']; $i++) {
            $result = $this->Post('https://live.appurify.com/resource/tests/run/',
                                  array('source_type' => 'url',
                                        'app_id' => $app_id,
                                        'async' => 1,
                                        'device_type_id' => $test['browser'],
                                        'test_id' => $test_id));
            if ($result !== false && is_array($result) && array_key_exists('test_run_id', $result)) {
              $test['appurify_tests'][$i] = array('id' => $result['test_run_id']);
            } else {
              $ret = false;
              $error = "Error submitting test run $i through Appurify API";
            }
          }
        } else
          $error = "Error configuring URL and browser through Appurify API";
      } else
        $error = "Error configuring test through Appurify API";
    } else
      $error = "Error configuring application through Appurify API";
    return $ret;
  }
  
  /**
  * Check a single test run to see it's status (and download the data if it is comoplete)
  */
  public function CheckTestRun(&$test, &$run, $index, $testPath) {
    $ret = false;
    if (array_key_exists('id', $run)) {
      $file = "$testPath/{$index}_appurify.zip";
      if (!is_file($file)) {
        $status = $this->Get('https://live.appurify.com/resource/tests/check/', array('test_run_id' => $run['id']));
        if ($status !== false &&
            is_array($status) &&
            array_key_exists('status', $status)) {
          $run['status'] = $status['status'];
          if ($status['status'] == 'complete') {
            $run['completed'] = true;
            $this->GetFile('https://live.appurify.com/resource/tests/result/', $file, array('run_id' => $run['id']));
          }
          $ret = true;
        }
      } else {
        $run['completed'] = true;
        $ret = true;
      }
      if (is_file($file))
        $this->ProcessResult($test, $run, $index, $testPath);
    }
    return $ret;
  }
  
  protected function ProcessResult(&$test, &$run, $index, $testPath) {
    $zipfile = "$testPath/{$index}_appurify.zip";
    $zip = new ZipArchive;
    if ($zip->open($zipfile) === TRUE) {
      $tempdir = "$testPath/{$index}_appurify";
      if (!is_dir($tempdir))
          mkdir( $tempdir, 0777, true );
      $tempdir = realpath($tempdir);
      $zip->extractTo($tempdir);
      $zip->close();
    }
    if (isset($tempdir) && is_dir($tempdir)) {
      if (is_file("$tempdir/appurify_results/video.mov"))
        rename("$tempdir/appurify_results/video.mov", "$testPath/{$index}_video.mov");
      $devtools = array();
      $files = glob("$tempdir/appurify_results/WSData*");
      if (isset($files) && is_array($files) && count($files)) {
        $outfile = fopen("$testPath/{$index}_devtools.json", 'w');
        if ($outfile) {
          fwrite($outfile, "[");
          foreach ($files as $file)
            $this->ProcessDevTools($file, $outfile);
          fwrite($outfile, "{}]");
          fclose($outfile);
          gz_compress("$testPath/{$index}_devtools.json");
          if (is_file("$testPath/{$index}_devtools.json.gz"))
            unlink("$testPath/{$index}_devtools.json");
        }
      }
      delTree($tempdir);
    }
  }
  
  protected function ProcessDevTools($file, $outfile) {
    $f = fopen($file, 'r');
    if ($f) {
      $buffer = '';
      do {
        $line = fgets($f);
        if ($line === false ||
            substr($line, 0, 7) == 'Buffer[' ||
            substr($line, 0, 6) == 'Frame[') {
          $pos = strpos($buffer, '{');
          if ($pos !== false && $pos < 10) {
            $buffer = substr($buffer, $pos);
            $event = json_decode($buffer, true);
            if (isset($event) &&
                is_array($event) &&
                array_key_exists('method', $event)) {
              fwrite($outfile, json_encode($event));
              fwrite($outfile, ',');
            }
          }
          $buffer = '';
        } elseif ($line !== false)
          $buffer .= trim(substr($line, 59), "\r\n");
      } while ($line !== false);
      fclose($f);
    }
  }

  protected $token;
  protected $curl;
  protected function GenerateToken() {
    if (!isset($this->token)) {
      $this->Lock();
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
        $result = $this->Post('https://live.appurify.com/resource/access_token/generate/',
                                array('key' => $this->key,
                                      'secret' => $this->secret,
                                      'ttl' => $ttl));
        if ($result !== false && is_array($result) && array_key_exists('access_token', $result)) {
          $this->token = $result['access_token'];
          file_put_contents("./tmp/appurify_{$this->key}.token", json_encode(array('token' => $this->token, 'time' => time())));
        }
      }
      $this->UnLock();
    }
  }
  
  protected function Lock() {
    $this->lock = fopen("./tmp/appurify_{$this->key}.lock", 'w');
    if ($this->lock)
      flock($this->lock, LOCK_EX);
  }

  protected function UnLock() {
    if ($this->lock) {
      flock($this->lock, LOCK_UN);
      fclose($this->lock);
      unset($this->lock);
    }
  }
  
  protected function Post($command, $data = null, $file = null) {
    $ret = false;
    if ($this->curl !== false) {
      if (isset($this->token)) {
        if(!isset($data))
          $data = array();
        $data['access_token'] = $this->token;
      }
      curl_setopt($this->curl, CURLOPT_URL, $command);
      curl_setopt($this->curl, CURLOPT_POST, true);
      if (isset($file)) {
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
