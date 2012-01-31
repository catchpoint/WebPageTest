<?php
  require("login/login.php");
  include 'monitor.inc';

//  $folderId = $_REQUEST['folderId'];
  //  $user_id=getCurrentUserId();

  $id = $_REQUEST['id'];
  if ($id){
    $folderId = getFolderIdFor($id, 'WPTScript');
  } else {
    $folderId = $_REQUEST['folderId'];
  }
  $user_id=getUserIdForFolder('WPTScript',$folderId);

  $url = $_REQUEST['url'];
  $label = $_REQUEST['label'];
  $description  = $_REQUEST['description'];
  $urlscript = $_REQUEST['urlscript'];
  $navigationscript = $_REQUEST['navigationscript'];
  $validationrequest = $_REQUEST['validationrequest'];
  $validationtype  = $_REQUEST['validationtype'];
  $validationmarkas = $_REQUEST['validationmarkas'];
  $validationmarkaselse = $_REQUEST['validationmarkaselse'];
  if ( !$validate = $_REQUEST['validate'] ){
    $validate = 0;
  }
//  if ( !$multistep = $_REQUEST['multistep'] ){
//    $multistep  = 0;
//  }
  if ( !$authenticate = $_REQUEST['authenticate'] ){
    $authenticate = 0;
  }
  $authuser = $_REQUEST['authuser'];
  $authpassword = $_REQUEST['authpassword'];

  try
  {
    if ( $id ){
      $q = Doctrine_Query::create()->from('WPTScript s')->where('s.UserId = ?',$user_id)->andWhere('s.Id= ?', $id);
      $wptScript = $q->fetchOne();
      $q->free(true);
      if ( !$wptScript  ){
        echo "Script not found: ".$id." user: ".$user_id;exit;
        //TODO: Passed in an Id, but didn't find it. Add error here.
      }
    }else {
      $wptScript = new WPTScript();
    }
    $wptScript['WPTScriptFolderId']=$folderId;
    $wptScript['UserId'] = $user_id;
    $wptScript['Label'] = $label;
    $wptScript['Description'] = $description;
    $wptScript['URL'] = $url;
    $wptScript['URLScript'] = $urlscript;
    $wptScript['NavigationScript'] = $navigationscript;
    $wptScript['Validate'] = $validate;
//    $wptScript['MultiStep'] = $multistep;
    $wptScript['ValidationRequest'] = $validationrequest;
    $wptScript['ValidationType'] = $validationtype;
    $wptScript['ValidationMarkAs'] = $validationmarkas;
    $wptScript['ValidationMarkAsElse'] = $validationmarkaselse;
    $wptScript['Authenticate'] = $authenticate;
    $wptScript['AuthUser'] =$authuser;
    $wptScript['AuthPassword']=$authpassword;
    $wptScript->save();

  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while updating script: ".$id. " message: " . $e->getMessage());
  }
  header("Location: listScripts.php");
  exit;
?>