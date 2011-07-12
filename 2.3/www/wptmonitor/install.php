<html>
<head>
  <script type="text/javascript" src="http://code.jquery.com/jquery-latest.js"></script>
  <script type="text/javascript" src="http://dev.jquery.com/view/trunk/plugins/validate/jquery.validate.js"></script>
  <style type="text/css">
    /** { font-family: Verdana; font-size: 96%; }*/
    /*label { width: 10em; float: left; }*/
    label {
      width: 15em;
      float: right;
      font-weight: bold;
    }
    label.error {
      float: none;
      color: red;
      padding-left: .5em;
      vertical-align: top;
    }
    p {
      clear: both;
    }
    .submit {
      margin-left: 12em;
    }
    em {
      font-weight: bold;
      padding-right: 1em;
      vertical-align: top;
    }
  </style>
  <script type="text/javascript">
    $(document).ready(function() {
      $("#installForm").validate();
    });
  </script>
</head>
<body>
<link rel="stylesheet" href="css/pagestyle.css" type="text/css">
<div class="page">
<div id="main">
<div class="level_2">
<div class="content-wrap">
<div class="content" style="height:auto;">
<br>

<h2 align="center" class="cufon-dincond_black">WebPagetest Monitor Installation</h2>

<div class="content" >
<div class="translucent">
<?php
session_start();
include 'monitor.inc';
require_once('bootstrap.php');
$dbFile = dirname(__FILE__) . '/db/wpt_monitor.sqlite';
$step = $_REQUEST['step'];
$jobProcessorKey = $_REQUEST['jobProcessorKey'];
$enableRegistration = $_REQUEST['enableRegistration'];
$defaultJobsPerMonth = $_REQUEST['defaultJobsPerMonth'];
$hostUrl = $_REQUEST['hostUrl'];
$hostLabel = $_REQUEST['hostLabel'];
$hostContact = $_REQUEST['hostContact'];
$hostContactEmail = $_REQUEST['hostContactEmail'];
$adminUsername = $_REQUEST['adminUsername'];
$adminFirstName = $_REQUEST['adminFirstName'];
$adminLastName = $_REQUEST['adminLastName'];
$adminPassword = $pass = sha1($_REQUEST['adminPassword']);
$adminEmailAddress = $_REQUEST['adminEmailAddress'];
if (!$step) {
  if (file_exists($dbFile)) {
    echo "<br><h2>Warning!</h2><br><h3>Database file already exists.<br></h3>To reinitialize remove the wpt_monitor.sqlite file located in the db directory.<br>";
  } else {
    ?>
    <h3 align="center">Warning: This will erase any existing data.</h3>
        <em>* indicates required fields</em>
    <form method="post" id="installForm" action="install.php">
      <input type="hidden" name="step" value="2">

      <table width="100%">
        <tr>
          <td colspan="3">
            <hr>
            <h3>Site Configuration</h3>
          </td>
        </tr>
        <tr>
          <td nowrap="true" align="right">* Site Name:</td>
          <td colspan="2">
            <input type="text" name="siteName" class="required string" size="60">
          </td>
        </tr>
        <tr>
          <td nowrap="true" align="right">* Contact:</td>
          <td colspan="2">
            <input type="text" name="siteContact" class="required string" size="60">
          </td>
        </tr>
        <tr>
          <td nowrap="true" align="right">* Contact Email:</td>
          <td colspan="2"><input type="text" name="siteContactEmailAddress" class="required email" size="60">
          </td>
        </tr>
        <tr>
          <td nowrap="true" valign="top" align="right">Homepage Message:</td>
          <td colspan="2"><textarea name="siteHomePageMessage"></textarea>
          </td>
        </tr>
        <tr>
          <td align="right">Enable Registration:</td>
          <td>
            <input type="checkbox" name="enableRegistration">
          </td>
          </tr><tr>
          <td></td><td align="left" nowrap="true">Allow new users to register</td>
        </tr>
        <tr>
          <td align="right" nowrap="true">* Default Jobs Per Month:</td>
          <td colspan="2"><input type="text" name="defaultJobsPerMonth" value="5000" class="required number"></td>
          </tr><tr><td></td><td colspan="3" align="left">
            When a new user registers what is the default maximum number<br>
            of jobs they will be allowed to execute per month.<br>
            The sum of job * locations * (43200/frequency)<br>
          <pre>
If the user sets up 2 jobs that each execute
against 2 locations at a frequency of 15 minutes...

Job 1: 1 * 2 * (43200/15) = 5760
Job 1: 1 * 2 * (43200/15) = 5760
Total: 11,520
            </pre>
          </td>
        </tr>
        <tr>
          <td nowrap="true" align="right">* Job Processor Key:</td>
          <td colspan="2">
            <input type="text" name="jobProcessorKey" id="jobProcessorKey" class="required string" size="60">
          </td>
          </tr>
          <tr>
            <td></td>
          <td colspan="4" align="left">
            The key required to be passed in to execute the JobProcessor<br>
            It will be used for the cron job that calls<br>
            curl localhost/wptmonitor/jobProcessor.php?key=&lt;value&gt;
          </td>
        </tr>
        
        <tr>
          <td colspan="3">
            <hr>
            <h3>Alert Information</h3>
          </td>
        </tr>
        <tr>
          <td nowrap="true" align="right">* From Name:</td>
          <td colspan="2">
            <input type="text" name="siteAlertFromName" class="required string" size="60">
          </td>
        </tr>
        <tr>
          <td colspan="1"></td>
          <td colspan="3" align="left">The name that will appear on the alert emails in the From field.</td>
        </tr>
        <tr>
          <td nowrap="true" align="right">* From Email address:</td>
          <td colspan="2">
            <input type="text" name="siteAlertFromEmailAddress" class="required email" size="60">
          </td>
        </tr>
        <tr>
          <td colspan="1"></td>
          <td colspan="3" align="left">The email address that will appear on the alert emails.</td>
        </tr>
        <tr>
          <td valign="top" nowrap="true" align="right">Email Message:</td>
          <td colspan="2">
            <textarea name="siteAlertMessage"></textarea>
          </td>
        </tr>
        <tr>
          <td colspan="1"></td>
          <td colspan="3" align="left">The message sent in the Alert emails in addition to the alerting job info.</td>
        </tr>
        <tr>
          <td colspan="3">
            <hr>
            <h3>WebPagetest Host Information</h3>
          </td>
        </tr>
        <tr>
          <td align="right">* Label:</td>
          <td colspan="2"><input type="text" name="hostLabel" value="" class="required string" size="60"></td>
          <td></td>
        </tr>
        <tr>
          <td align="right">Contact:</td>
          <td><input type="text" name="hostContact" value="" size="60"></td>
          <td></td>
        </tr>
        <tr>
          <td align="right">Contact email address:</td>
          <td><input type="text" name="hostContactEmail" value="" size="60"></td>
          <td></td>
        </tr>
        <tr>
          <td align="right">* Host Location URL:</td>
          <td><input type="text" name="hostUrl" value="http://127.0.0.1" class="required url" size="60"></td>
          </tr>
        <tr>
          <td colspan="1"></td>
          <td colspan="3" align="left">The initial WebPagetest Location<br>Additional locations can be added as admin under "Hosts"</td>
        </tr>
        <tr>
          <td colspan="3">
            <hr><h3>Admin Information</h3>
          </td>
        </tr>
        <tr>
          <td align="right">* Username:</td>
          <td colspan="2"><input type="text" name="adminUsername" class="required string" size="60"></td>
        </tr>
        <tr>
          <td align="right">* Password:</td>
          <td colspan="2"><input type="text" name="adminPassword" class="required string" size="60"></td>
        </tr>
        <tr>
          <td align="right">First Name:</td>
          <td><input type="text" name="adminFirstName" size="60"></td>
        </tr>
        <tr>
          <td align="right">Last Name:</td>
          <td><input type="text" name="adminLastName" size="60"></td>
        </tr>
        <tr>
          <td align="right">* Email Address:</td>
          <td colspan="2"><input type="text" name="adminEmailAddress" class="required email" size="60"></td>
        </tr>
        <tr>
        <td colspan="3" align="right">
          <td><input type="submit" value="save"></td>
        </tr>
      </table>

    </form>
    <?php

  }
} else if ($step == "2") {
  try {
    // Check for db and generate tables if needed.
    if (!file_exists($dbFile)) {
      Doctrine_Core::createDatabases();
      Doctrine_Core::createTablesFromModels('models');
      // Initialize configuration
      $config = new WPTMonitorConfig();
      $config['EnableRegistration'] = $enableRegistration;
      $config['DefaultJobsPerMonth'] = $defaultJobsPerMonth;
      $config['JobProcessorAuthenticationKey'] = $jobProcessorKey;
      $config['SiteName'] = $_REQUEST['siteName'];
      $config['SiteContact']= $_REQUEST['siteContact'];
      $config['SiteContactEmailAddress'] = $_REQUEST['siteContactEmailAddress'];
      $config['SiteHomePageMessage'] = $_REQUEST['siteHomePageMessage'];
      $config['SiteAlertFromName'] = $_REQUEST['siteAlertFromName'];
      $config['SiteAlertFromEmailAddress'] = $_REQUEST['siteAlertFromEmailAddress'];
      $config['SiteAlertMessage'] = $_REQUEST['siteAlertMessage'];
      $config->save();
      $user = new User();
      $user['Username'] = $adminUsername;
      $user['LastName'] = $adminFirstName;
      $user['FirstName'] = $adminLastName;
      $user['Password'] = $adminPassword;
      $user['IsSuperAdmin'] = true;
      $user['IsActive'] = true;
      $user['MaxJobsPerMonth'] = 9999999;
      $user['EmailAddress'] = $adminEmailAddress;
      $user->save();
      $host = new WPTHost();
      $host['Active'] = true;
      $host['Label'] = $hostLabel;
      $host['Contact'] = $hostContact;
      $host['ContactEmailAddress'] = $hostContactEmail;
      $host['HostURL'] = $hostUrl;
      $host->save();
      $_SESSION['ls_id'] = 1;
      include 'FixFolders.php';
      header("Location: updateLocations.php?id=1&forwardTo=install.php?step=3");
    } else {
      echo "<br><h2>Warning!</h2><br><h3>Database file already exists.<br></h3>To reinitialize remove the wpt_monitor.sqlite file located in the db directory.<br>";
    }

  } catch (Exception $e) {
    echo $e;
  }


} else if ($step == "3") {
  echo "Creating db...<br>";
  echo "Initializing configuration...<br>";
  echo "Creating admin user...<br>";
  echo "Fetching location information from WebPagetest host<br>";
  echo "Done<br>";

  $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
  $config = $configTable->find(1);
  $userTable = Doctrine_Core::getTable('User');
  $user = $userTable->find(1);
  $hostTable = Doctrine_Core::getTable('WPTHost');
  $host = $hostTable->find(1);

  echo "<hr>";
  echo "<h3>Verify Information</h3><p>";
  echo "Site Name: <b>".$config['SiteName']."</b><br>";
  echo "Contact: <b>".$config['SiteContact']."</b><br>";
  echo "Contact email address: <b>".$config['SiteContactEmailAddress']."</b><br>";
  echo "Home page message: <b>".$config['SiteHomePageMessage']."</b><br>";
  echo "Alert From name:<b> ".$config['SiteAlertFromName']."</b><br>";
  echo "Alert From email:<b> ".$config['SiteAlertFromEmailAddress']."</b><br>";
  echo "Alert From message:<b> ".$config['SiteAlertMessage']."</b><br>";
  echo "Enable Registration:<b> " . $config['EnableRegistration'] . "</b><br>";
  echo "Job Processor Key:<b> " . $config['JobProcessorAuthenticationKey'] . "</b><br>";
  echo "Default Jobs Per Month:<b> " . $config['DefaultJobsPerMonth'] . "</b><br>";
  echo "Admin Username:<b> " . $user['Username'] . "</b><br>";
  echo "Admin First Name:<b> " . $user['LastName'] . "</b><br>";
  echo "Admin Last Name:<b> " . $user['FirstName'] . "</b><br>";
  echo "Admin Password:<b> " . $user['Password'] . "</b><br>";
  echo "Admin Email:<b> " . $user['EmailAddress'] . "</b><br>";
  echo "Host Label:<b> " . $host['Label'] . "</b></br>";
  echo "Host Contact:<b> " . $host['Contact'] . "</b></br>";
  echo "Host Contact Email:<b> " . $host['ContactEmailAddress'] . "</b></br>";
  echo "Host Url:<b> " . $host['HostURL'] . "</b></br>";
  echo "<hr>";
  echo "<br><h3>Remove the install.php file now to avoid loss of data.</h3><br>";
//    session_destroy();
  echo "<a href=\"index.php?ls_logout\">Continue</a>";
}
?>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</body>
</html>