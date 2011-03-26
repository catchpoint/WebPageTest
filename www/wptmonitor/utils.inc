<?php
/**
 * Get a array of folders that are shared with the $userId
 *
 * @param  $userId
 * @param  $table
 * @return array
 */
function getFolderShares($userId, $table, $ownerId = null, $permission = -1) {
  $folderTable = Doctrine_Core::getTable($table . 'Folder');

  $q = Doctrine_Query::create()->from('Share s')
      ->where('ShareWithUserId = ?', $userId);
  if ($ownerId != null) {
    $q->andWhere('UserId = ?', $ownerId);
  } else {
    $q->andWhere('UserId != ?', $userId);
  }
  $q->andWhere('TheTableName = ?', $table)
      ->andWhere('Permissions > ?', $permission)
      ->orderBy('UserId')
      ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);

  $shares = $q->fetchArray();
  $shareArray = array();
  $userTable = Doctrine_Core::getTable('User');

  if ($q->count() > 0) {
    foreach ($shares as $share) {
      $user = $userTable->find($share['UserId']);
      $folderItem = $folderTable->find($share['TableItemId']);
      $shareArray[$user['Username']][$folderItem['id']] = array('Label' => $folderItem['Label'], 'Permission' => $share['Permissions']);
    }
  }
  //    print_r($shares);
  //    exit;

  $q->free(true);
  return $shareArray;
}

function getFolderIdFor($id, $tableName) {
  $table = Doctrine_Core::getTable($tableName);
  $res = $table->find($id);
  return $res[$tableName . 'FolderId'];
}

function getOwnerIdFor($id, $table) {
  $table = Doctrine_Core::getTable($table);
  $res = $table->find($id);
  return $res['UserId'];
}

/**
 * Get the folder tree for the indicated user and db table name
 *
 * @param  $userId
 * @param  $table
 * @return
 */
function getFolderTree($userId, $table) {
  $treeObject = Doctrine_Core::getTable($table . 'Folder')->getTree();
  $folderTree = $treeObject->fetchTree(array('root_id' => $userId));
  // Check for root node and add if not there

  if (!$treeObject->fetchRoot($userId)) {
    if ($table == "WPTJob") {
      $folder = new WPTJobFolder();
    } else if ($table == "WPTScript") {
      $folder = new WPTScriptFolder();
    } else if ($table == "Alert") {
      $folder = new AlertFolder();
    } else if ($table == "ChangeNote") {
      $folder = new ChangeNoteFolder();
    }
    $folder->Label = "Root";
    $folder->root_id = $userId;
    $folder->save();
    $treeObject->createRoot($folder, $userId);
    $folderTree = $treeObject->fetchTree(array('root_id' => $userId));
  }

  return $folderTree;
}

function getRootFolderForUser($userId, $table) {
  $treeObject = Doctrine_Core::getTable($table.'Folder')->getTree();
  $folderTree = $treeObject->fetchTree(array('root_id' => $userId));
  return $folderTree[0]['id'];
}

function displayErrorIfNotAdmin() {
  if ($_SESSION['ls_admin'] != 1) {
    displayError();
  }
}

function displayError($message = "You are not authorized to perform this operation") {
  $smarty = new Smarty;
  $smarty->assign('errorMessage', $message);
  $smarty->display('error.tpl');
  exit;
}

function getCurrentUserId() {
  // Support admin impersonating impersonate
  if ($_SESSION['ls_admin']) {
    if ($_SESSION['ls_impersonate_id']) {
      return $_SESSION['ls_impersonate_id'];
    }
  } else if ($_SESSION['ls_guest_id']) {
    return $_SESSION['ls_guest_id'];
  } else {
    return $_SESSION['ls_id'];
  }
}

function getBaseURL() {
  $serverName = $_SERVER['SERVER_NAME'];
  $lidx = strrpos($_SERVER['REQUEST_URI'], "/");
  $baseurl = $serverName . substr($_SERVER['REQUEST_URI'], 0, $lidx) . "/";
  return "http://" . $baseurl;
}

// Turns a delimited file into a two dimensional array.
function delimitedToArray($data, $delimiter, $header = false) {
  $results = array();
  $lines = explode("\n", $data);
  $headers = array();
  if ($header) {
    $heads = explode($delimiter, $lines[0]);
    foreach ($heads as $key => $h) {
      $headers[] = trim($h);
    }
  }
  foreach ($lines as $key => $line) {
    if ($header && $key == 0) {
      continue;
    }
    $items = explode($delimiter, $line);
    foreach ($items as $key => $item) {
      $label = $headers[$key];
      $result[$label] = $item;
    }
    $results[] = $result;
  }
  return $results;
}

/**
 * Returns an array of items from a given result set.
 *
 * @param  $results
 * @param  $item
 * @return array
 */
function getArrayFor($results, $item) {
  $res = array();
  foreach ($results as $result) {
    $res[] = $result[$item];
  }
  return $res;
}

/**
 * Return the standard deviation
 *
 * @param  $std
 * @return float
 */
function standard_deviation($std) {
  $total = 0;
  while (list($key, $val) = each($std))
  {
    $total += $val;
  }
  reset($std);
  $mean = $total / count($std);

  while (list($key, $val) = each($std))
  {
    $sum += pow(($val - $mean), 2);
  }
  $var = sqrt($sum / (count($std) - 1));
  return $var;
}

function getConfig() {
  $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
  $config = $configTable->find(1);
  return $config;
}

function getLocationThreshold($host, $location) {
  $q = Doctrine_Query::create()->select('l.QueueThreshold')->from('WPTLocation l')
      ->where('l.WPTHost.HostURL = ?', $host)
      ->andWhere('l.Location= ?', $location)
      ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
  $result = $q->fetchOne();
  if (!$queueThreshold = $result['QueueThreshold']) {
    $queueThreshold = 0;
  }
  $q->free(true);
  return $queueThreshold;
}
function getCurrentRunRateInfo(){
  $runRateInfo = array();
  $userTable= Doctrine_Core::getTable('User');
    $q = Doctrine_Query::create()
    ->select('u.Username')
    ->from('User u')
    ->orderBy('u.Username');
  $users = $q->fetchArray();
  foreach($users as $user){
    $runRateInfo['users'][] = $user['Username'];
  }

  $q = Doctrine_Query::create()->select('j.UserId, SUM(j.Runs * 60/j.Frequency) as runrate')
      ->from('WPTJob j')
      ->where('j.Active = ?',true)
      ->orderBy('j.UserId')
      ->groupBy('j.UserId');
  $result = $q->fetchArray();
  $totalRunRate = 0;
  $runRatePerUser = array();
  foreach($result as $res){
    $totalRunRate += $res['runrate'];
    $user = $userTable->find($res['UserId']);
    $runRatePerUser[$user['Username']] = $res['runrate'];
  }
  $runRateInfo['runRatePerUser'] = $runRatePerUser;
  $runRateInfo['hourlyRunRate'] = $totalRunRate;

  // Active Jobs per User
  $q = Doctrine_Query::create()->select('j.UserId, COUNT(j.UserId) as jobCount')
      ->from('WPTJob j')
      ->where('j.Active = ?',true)
      ->orderBy('j.UserId')
      ->groupBy('j.UserId');
  $result = $q->fetchArray();

  $activeJobsPerUser= array();
  foreach($result as $res){
    $user = $userTable->find($res['UserId']);
    $activeJobsPerUser[$user['Username']] = $res['jobCount'];
  }
  $runRateInfo['activeJobsPerUser'] = $activeJobsPerUser;
  // All jobs per user

  $q = Doctrine_Query::create()->select('j.UserId, COUNT(j.UserId) as jobCount')
      ->from('WPTJob j')
      ->orderBy('j.UserId')
      ->groupBy('j.UserId');
  $result = $q->fetchArray();

  $jobsPerUser= array();
  foreach($result as $res){
    $user = $userTable->find($res['UserId']);
    $jobsPerUser[$user['Username']] = $res['jobCount'];
  }
  $runRateInfo['jobsPerUser'] = $jobsPerUser;

  $q = Doctrine_Query::create()->from('WPTJob j');
  $runRateInfo['totalJobs'] = $q->count();

  $q = Doctrine_Query::create()->from('WPTJob j')
      ->where('j.Active = ?',true);
  $runRateInfo['totalActiveJobs']= $q->count();

  $q->free(true);
  return $runRateInfo;
}
function getLocationInformation($host = null) {
  if ($host == null) {
    $q = Doctrine_Query::create()->from('WPTHost h')->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $hosts = $q->fetchArray();
    $q->free(true);
  } else {
    $q = Doctrine_Query::create()->from('WPTHost h')
        ->where('h.HostURL = ?', $host)->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $host = $q->fetchOne();
    $hosts[] = $host;
  }

  $locationTable = Doctrine_Core::getTable('WPTLocation');

  $locations = array();
  foreach ($hosts as $host) {
    $location = array();
    $resultXml = file_get_contents($host['HostURL'] . "/getLocations.php?f=xml");
    if (!$resultXml) {
      continue;
    }
    $xml = new SimpleXMLElement($resultXml);
    foreach ($xml->data->location as $loc) {
      $location['host'] = $host['Label'];
      $location['hostURL'] = $host['HostURL'];
      $location['id'] = $loc->id;
      $id = $loc->id;
      $location['Label'] = $loc->Label;
      $location['Browser'] = $loc->Browser;
      $location['PendingTests'] = $loc->PendingTests->Total;
      $location['PendingTestsHighPriority'] = $loc->PendingTests->HighPriority;
      $location['PendingTestsLowPriority'] = $loc->PendingTests->LowPriority;
      $loc = $locationTable->findOneByLocation($loc->id);
      if (!$location['GreenLimit'] = $loc['QueueThresholdGreenLimit']) {
        $location['GreenLimit'] = 15;
      }
      if (!$location['YellowLimit'] = $loc['QueueThresholdYellowLimit']) {
        $location['YellowLimit'] = 30;
      }
      $locations["'".$id."'"] = $location;
    }
  }
  $q = Doctrine_Query::create()->select('j.Location, SUM(j.Runs * 60/j.Frequency) as runrate')
      ->from('WPTJob j')
      ->where('j.Active = ?',true)
      ->groupBy('j.Location');

  $result = $q->fetchArray();

  foreach ($result as $res){
    $locations["'".$res['Location']."'"]['runRate'] = $res['runrate'];
  }


  return $locations;
}

function logOutput($msg, $anchorName = null) {
  $timeStamp = date("m/d/Y h:i:s");
  //  if ( $anchorName ){
  //    $a = '<a name="'.$anchorName.'"></a>'."\n";
  //  } else {
  $a = "";
  //  }
  $m = "[ " . $timeStamp . " ] " . $msg . "\n";
  if (!($fp = fopen('jobProcessor_log.html', 'a'))) {
    echo "[ERROR] [logOutput] Cannot open log file";
  } else {
    fwrite($fp, $a . "" . $m);
  }
  fclose($fp);
  //  echo $a.''.$m;
}

function get_tz_options($selectedzone, $name = "edited_user_timezone", $label = '', $desc = '', $onChange = '') {
  //  echo '<div class="label"><label for="edited_user_timezone">'.$label.':</label></div>';
  //  echo '<div class="input"><select name="edited_user_timezone" onchange="'.$onChange.'">';
  $field = '<select name="' . $name . '" onchange="' . $onChange . '">';
  $field .= timezonechoice($selectedzone);
  $field .= '</select>';
  return $field;
  //  echo '<span class="notes"> '.$desc.' </span></div>';
}

function timezonechoice($selectedzone) {
  $all = timezone_identifiers_list();

  $i = 0;
  foreach ($all AS $zone) {
    $zone = explode('/', $zone);
    $zonen[$i]['continent'] = isset($zone[0]) ? $zone[0] : '';
    $zonen[$i]['city'] = isset($zone[1]) ? $zone[1] : '';
    $zonen[$i]['subcity'] = isset($zone[2]) ? $zone[2] : '';
    $i++;
  }

  asort($zonen);
  $structure = '';
  $structure .= "<option " . ((('UTC') == $selectedzone) ? 'selected="selected "' : '') . " value=\"" . ('UTC') . "\">GMT</option>"; //Timezone

  foreach ($zonen AS $zone) {
    extract($zone);
    if ($continent == 'Africa' || $continent == 'America' || $continent == 'Antarctica' || $continent == 'Arctic' || $continent == 'Asia' || $continent == 'Atlantic' || $continent == 'Australia' || $continent == 'Europe' || $continent == 'Indian' || $continent == 'Pacific') {
      if (!isset($selectcontinent)) {
        $structure .= '<optgroup label="' . $continent . '">'; // continent
      } elseif ($selectcontinent != $continent) {
        $structure .= '</optgroup><optgroup label="' . $continent . '">'; // continent
      }

      if (isset($city) != '') {
        if (!empty($subcity) != '') {
          $city = $city . '/' . $subcity;
        }
        $structure .= "<option " . ((($continent . '/' . $city) == $selectedzone) ? 'selected="selected "' : '') . " value=\"" . ($continent . '/' . $city) . "\">" . str_replace('_', ' ', $city) . "</option>"; //Timezone
      } else {
        if (!empty($subcity) != '') {
          $city = $city . '/' . $subcity;
        }
        $structure .= "<option " . (($continent == $selectedzone) ? 'selected="selected "' : '') . " value=\"" . $continent . "\">" . $continent . "</option>"; //Timezone
      }

      $selectcontinent = $continent;
    }
  }
  $structure .= '</optgroup>';
  return $structure;
}

function sendEmailReport($emailAddresses, $message, $attachments) {
  include_once 'bootstrap.php';
  $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
  $config = $configTable->find(1);

  // Create a boundary string.  It needs to be unique
  $semi_rand = md5(time());

  $from = $config['SiteName'];
  $fromEmail = 'noreply@' . $config['SiteName'];
  $fromEmail = 'tonyperkins@yahoo.com';
  $siteName = $config['SiteName'];
  if (strrpos($emailAddresses, ",") > 0) {
    $addrs = explode(",", $emailAddresses);
  } else {
    $addrs = explode("\n", $emailAddresses);
  }
  $success = 1;
  foreach ($addrs as $emailAddress) {
    $to = $emailAddress;
    $subject = $siteName . " - WPTMonitor Report";
    $headers = 'From: ' . $from . ' <' . $fromEmail . ">\r\n" .
        'Reply-To: ' . $fromEmail . "\r\n" .
        'Content-type: text/plain; charset=UTF-8' . "\r\n" .
        'X-Mailer: PHP/' . phpversion();

    $mime_boundary = "==Multipart_Boundary_x{$semi_rand}x";
    // Add the headers for a file attachment
    $headers .= "\nMIME-Version: 1.0\n" .
        "Content-Type: multipart/alternative;\n" .
        " boundary=\"{$mime_boundary}\"";
    $message = "--{$mime_boundary}\n" .
        "Content-Type: text/html; charset=\"iso-8859-1\"\n" .
        "Content-Transfer-Encoding: 7bit\n\n" .
        "<font face=Arial>" .
        $message . "\r\n";
    $message .= "--{$mime_boundary}\n" .
        "Content-Type: text/plain; charset=\"iso-8859-1\"\n" .
        "Content-Transfer-Encoding: 7bit\n\n" .
// Add the headers for a file attachment
        $headers .= "\nMIME-Version: 1.0\n" .
            "Content-Type: multipart/mixed;\n" .
            " boundary=\"{$mime_boundary}\"";
    foreach ($attachments as $attach) {
      $fileatt = 'graph/cache/' . $attach; //relative path to image two and more (this one is in the same directory)
      $fileatt_name = $attach; //just the name of the file
      $fileatt_type = filetype($fileatt);
      $file = fopen($fileatt, 'rb');
      $data = fread($file, filesize($fileatt));

      // Base64 encode the file data
      $data = chunk_split(base64_encode($data));
      // Add file attachment to the message
      $message .= "--{$mime_boundary}\n" .
          "Content-Type: image/png;\n" . // {$fileatt_type}
          " name=\"{$fileatt_name}\"\n" .
          "Content-Disposition: inline;\n" .
          " filename=\"{$fileatt_name}\"\n" .
          "Content-Transfer-Encoding: base64\n\n" .
          $data . "\n\n" .
          "--{$mime_boundary}--\n";
    }


    if (mail($to, $subject, $message, $headers)) {
      logOutput("[INFO] [sendEmailAlert] Email Report sent to contact: " . $emailAddress);
      $success = 1;
    } else {
      logOutput("[INFO] [sendEmailAlert] Failed to send alert Report to contact");
      $success = 0;
    }
  }
  return $success;
}

function compressCrypt($string) {
  return base64_encode(gzcompress($string, 9));
}

function decompressCrypt($string) {
  return gzuncompress(base64_decode($string));
}

function getUserIdForFolder($table, $folderId) {
  $folderTable = Doctrine_Core::getTable($table . 'Folder');
  $folder = $folderTable->find($folderId);
  return $folder['root_id'];
}

// Permission Functions

function hasPermission($table, $folderId, $permissionLevel) {
  try {
    $status = false;
    // See if user is the owner first
    $userId = getCurrentUserId();

    $folderTable = Doctrine_Core::getTable($table . 'Folder');

    $q = Doctrine_Query::create()
        ->select('f.Label, j.Label')
        ->from($table . 'Folder' . ' f')
        ->leftJoin('f.' . $table . ' j');

    $treeObject = $folderTable->getTree();
    $treeObject->setBaseQuery($q);

    $tree = $treeObject->fetchTree(array('root_id' => $userId));

    $treeObject->resetBaseQuery();

    if ($tree) {
      foreach ($tree as $node) {
        if ($node['id'] == $folderId) {
          if ($userId == $node['root_id']) {
            // User owns this folder so return true for all permission checks.
            $status = true;
          }
        }
      }
    }
    //else {
    if (!$status){
      $q = Doctrine_Query::create()->from('Share s')
          ->where('s.ShareWithUserId = ?', $userId)
          ->andWhere('s.TheTableName =?', $table)
          ->andWhere('s.TableItemId = ?', $folderId);
      $result = $q->fetchOne();
      $q->free(true);
      if ($result['Permissions'] >= $permissionLevel) {
        $status= true;
      } else {
        $status= false;
      }
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while Checking permission on Shares. message: " . $e->getMessage());
    echo $e->getMessage();
    exit;
  }
  return $status;
}

?>