<?php
// Diagnostics ping from the agents
chdir('..');
include 'common.inc';

$locations = explode(',', $_GET['location']);
$key = array_key_exists('key', $_GET) ? $_GET['key'] : '';
$recover = array_key_exists('recover', $_GET) ? $_GET['recover'] : '';
$pc = array_key_exists('pc', $_GET) ? $_GET['pc'] : '';
$ec2 = array_key_exists('ec2', $_GET) ? $_GET['ec2'] : '';
$screenwidth = array_key_exists('screenwidth', $_GET) ? $_GET['screenwidth'] : '';
$screenheight = array_key_exists('screenheight', $_GET) ? $_GET['screenheight'] : '';
$winver = isset($_GET['winver']) ? $_GET['winver'] : '';
$isWinServer = isset($_GET['winserver']) ? $_GET['winserver'] : '';
$isWin64 = isset($_GET['is64bit']) ? $_GET['is64bit'] : '';
$browsers = isset($_GET['browsers']) ? ParseBrowserInfo($_GET['browsers']) : '';
$testId = isset($_GET['test']) ? $_GET['test'] : '';
$cpu = isset($_GET['cpu']) ? floatval($_GET['cpu']) : null;
$tester = null;
$scheduler_node = null;
if (strlen($ec2))
  $tester = $ec2;
elseif (strlen($pc))
  $tester = $pc . '-' . trim($_SERVER['REMOTE_ADDR']);
else
  $tester = trim($_SERVER['REMOTE_ADDR']);

$block_list = GetSetting('block_pc');
if ($block_list && strlen($block_list) && strlen($pc)) {
  $block = explode(',', $block_list);
  if (in_array($pc, $block)) {
    header("HTTP/1.1 403 Unauthorized");
  }
}
    
$dnsServers = '';
if (array_key_exists('dns', $_REQUEST))
    $dnsServers = str_replace('-', ',', $_REQUEST['dns']);

foreach ($locations as $loc) {
    $location = trim($loc);
    $locInfo = GetLocationInfo($location);
    $locKey = GetSetting('location_key', '');
    if (isset($locInfo) && is_array($locInfo) && isset($locInfo['key']))
        $locKey = $locInfo['key'];
    if (!strlen($locKey) || !strcmp($key, $locKey)) {
        // key matches the location key
        $testerInfo = array();
        $testerInfo['ip'] = $_SERVER['REMOTE_ADDR'];
        $testerInfo['pc'] = $pc;
        $testerInfo['ec2'] = $ec2;
        $testerInfo['ver'] = isset($_GET['version']) ? $_GET['version'] : $_GET['ver'];
        $testerInfo['freedisk'] = @$_GET['freedisk'];
        $testerInfo['upminutes'] = @$_GET['upminutes'];
        $testerInfo['ie'] = @$_GET['ie'];
        $testerInfo['dns'] = $dnsServers;
        $testerInfo['video'] = @$_GET['video'];
        $testerInfo['GPU'] = @$_GET['GPU'];
        $testerInfo['screenwidth'] = $screenwidth;
        $testerInfo['screenheight'] = $screenheight;
        $testerInfo['winver'] = $winver;
        $testerInfo['isWinServer'] = $isWinServer;
        $testerInfo['isWin64'] = $isWin64;
        $testerInfo['test'] = $testId;
        UpdateTester($location, $tester, $testerInfo, $cpu);
    }
}

// kick off any cron work we need to do asynchronously
CheckCron();
