<?php
  require_once('bootstrap.php');
  date_default_timezone_set($_SESSION['ls_timezone']);

  // Check to see if we are to impersonate
  if ($_REQUEST['impId'] && $_SESSION['ls_admin'] ){
    $_SESSION['ls_impersonate_id'] = $_REQUEST['impId'];
    // Clear session vars
    foreach ($_SESSION as $key=>$sessionVar){
      // Skip the ls_ vars
      if ( stripos($key,"ls_") > -1){
        continue;
      }
      unset($_SESSION[$key]);
    }
  }
//  date_default_timezone_set($_SESSION['ls_timezone']);
  $baseDir=dirname(__FILE__);
//  $wptHost="http://wpt.mtvly.com";
  $wptRuntest="/runtest.php";
  $wptResult="/result/";
  $wptXmlResult="/xmlResult/";
  $wptResultsDir=dirname(__FILE__)."/wpt_results/";

  require($baseDir . '/lib/Smarty-3.0.6/libs/Smarty.class.php');


  // create object
  $smarty = new Smarty;
  $smarty->template_dir = 'templates';
  $smarty->compile_dir = 'templates_c';
  $smarty->allow_php_tag = true;

  // Setup Permissions
//  $smarty->assign('hasPermission',hasPermission);
  define("PERMISSION_READ",0);
  define("PERMISSION_UPDATE",1);
  define("PERMISSION_CREATE_DELETE",2);
  define("PERMISSION_EXECUTE",4);
  define("PERMISSION_OWNER",9);

  $tableNameLabel = array();
  $tableNameLabel['WPTJob']="Job";
  $tableNameLabel['WPTScript']="Script";
  $tableNameLabel['Alert']="Alert";
  $tableNameLabel['ChangeNote']="ChangeNote";

  $wptResultStatusCodes = array();
  $wptResultStatusCodes['100']="Pending";
  $wptResultStatusCodes['200']="Complete";
  $wptResultStatusCodes['404']="HTTP 404";
  $wptResultStatusCodes['500']="HTTP 500";
  $wptResultStatusCodes['503']="HTTP 503";
  $wptResultStatusCodes['900']="Timeout";
  $wptResultStatusCodes['905']="Job Submission Failed";
  $wptResultStatusCodes['910']="Max Download Attempts Exceeded";
  $wptResultStatusCodes['990']="X-SL-CompState: Uncompiled";
  $wptResultStatusCodes['999']="Other";

  $wptValidationStateCodes['1']="Valid";
  $wptValidationStateCodes['2']="Invalid";
  $wptValidationStateCodes['3']="Needs Review";

  // Results per page
  if ( !$_SESSION['resultsPerPage']){
    $_SESSION['resultsPerPage'] = 15;
  }
  if ($_REQUEST['resultsPerPage']){
    $_SESSION['resultsPerPage'] = $_REQUEST['resultsPerPage'];
  }
  // Handle results per page
  $resultsPerPage = $_SESSION['resultsPerPage'];
  $smarty->assign('resultsPerPage',$_SESSION['resultsPerPage']);

  define("VALIDATION_TYPE_MATCH",1);
  define("VALIDATION_TYPE_NOMATCH",2);
  define("VALIDATION_STATE_VALID",1);
  define("VALIDATION_STATE_INVALID",2);
  define("VALIDATION_STATE_NEEDS_REVIEW",3);

?>
