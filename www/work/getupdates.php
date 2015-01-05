<?php
// Return the version, size and md5 hash of all of the agent updates currently available
$updates = array();
$files = glob('./update/*.ini');
if ($files && is_array($files) && count($files)) {
  foreach ($files as $file) {
    $name = basename($file,'.ini');
    $data = parse_ini_file($file);
    if (isset($data['ver'])) {
      $ver = $data['ver'];
      $md5 = false;
      $key = "update.$name.zip.$ver.md5";
      if (function_exists('apc_fetch'))
        $md5 = apc_fetch($key);
      if (!$md5) {
        $md5 = md5_file("./update/$name.zip");
        if ($md5 && function_exists('apc_store'))
          apc_store($key, $md5);
      }
      if ($md5)
        $updates[] = array('name' => $name, 'ver' => $ver, 'md5' => $md5);
    }
  }
}
echo json_encode($updates);
?>
