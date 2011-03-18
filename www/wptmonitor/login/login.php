<?php session_start();
//================================================
// Based heavily on the login script by...
    // Login Session is copyright (c)2007, Scott J. LeCompte
    //
    // Released 02/20/2010 under GNU Public Licensing
    // Terms.  Free to use, modify, and distribute.
    //
    // Support available at http://www.myphpscripts.net
//
//  Modified by Tony Perkins to work with Doctrine
//================================================

require_once ('bootstrap.php');
include_once ('wpt_functions.inc');
include_once ('utils.inc');

// Check for shared/public url access
// TODO: Move to util include
if (isset($_REQUEST['___k']) && $_SERVER['SCRIPT_NAME'] == '/wptmonitor/flashGraph.php'){
  $_SESSION['ls_guest'] = 1;
  $_SESSION['ls_user']='Guest';
  $encryptedQueryString = $_REQUEST['___k'];
  $encryptedQueryString = str_replace(" ",'+',$encryptedQueryString);
  $qstring = urldecode(decompressCrypt($encryptedQueryString));

  $kv = explode('&',$qstring);
  $decodedQString = '?';
  foreach ($kv as $k){
    $x = explode('=',$k);
    // Check for php array type params i.e. foo[]
    $brackets = strrpos($x[0],"[]");

    if ($brackets > -1){
      $vname=substr($x[0],0,$brackets);
      if (!isset($_REQUEST[$vname])){
        $_REQUEST[$vname] = array($x[1]);
      } else {
        $tmpArray = (array)$_REQUEST[$vname];
        $tmpArray[] = $x[1];
        $_REQUEST[$vname] = $tmpArray;
      }

      continue;
    }
    $_REQUEST[$x[0]] = $x[1];
  }
  $_SESSION['ls_guest_id'] = $_REQUEST['_pky'];
} else {
  unset($_SESSION['ls_guest']);

// Enable / Disable user registration: 1 = enabled, 0 = disabled
$registration = isRegistrationEnabled();

$version = '1.0';
// Main cascading stylesheets
$style = '
		html, body {
			height: 99%;
			font-family: Arial, Verdana;
			font-size: 12px;
		}
		#titlebar {
			position: relative;
			height: 20px;
			width: 260px;
			border-top: 1px solid #000000;
			border-left: 1px solid #000000;
			border-right: 1px solid #000000;
			background-color: #222222;
			color: #FFFFFF;
			text-align: center;
			font-size: 16px;
		}
		#foot {
			position: relative;
			height: 20px;
			width: 260px;
			color: #000000;
			text-align: center;
			font-size: 10px;
		}
		input.text {
			width: 220px;
			height: 20px;
			border: 1px solid #000000;
			background-color: #DDDDDD;
		}
		input.btn {
			width: 60px;
			height: 20px;
			border: 1px solid #222222;
			background-color: #222222;
			color: #FFFFFF;
		}
		input.btn:hover {
			cursor: pointer;
		}
		a {
			color: #222222;
			text-decoration: none;
		}
		a:hover {
			text-decoration: underline;
		}
';
$log_style = '
		#wrapper {
			position: absolute;
			height: auto;
			width: 260px;
			text-align: center;
			color: #000000;
			left: 50%;
			top: 50%;
			margin-left: -130px;
			margin-top: -85px;
		}
		#form {
			position: relative;
			height: auto;
			width: 260px;
			border: 1px solid #000000;
			background-color: #DDDDDD;
			color: #000000;
			text-align: left;
		}
';
$reg_style = '
		#wrapper {
			position: absolute;
			height: auto;
			width: 260px;
			text-align: center;
			color: #000000;
			left: 50%;
			top: 50%;
			margin-left: -130px;
			margin-top: -135px;
		}
		#form {
			position: relative;
			height: auto;
			width: 260px;
			border: 1px solid #000000;
			background-color: #fff9eb;
			color: #000000;
			text-align: left;
		}
';


// Logout
if (isset($_REQUEST['ls_logout'])) {
	unset($_SESSION['ls_id']);
  unset($_SESSION['ls_impersonate_id']);
  unset($_SESSION['ls_first']);
  unset($_SESSION['ls_last']);
  unset($_SESSION['ls_admin']);
	unset($_SESSION['ls_user']);
  unset($_SESSION['ls_timezone']);
	unset($_SESSION['ls_email']);
}

// Process post args
if (isset($_REQUEST)) {
	$login = FALSE;
	$register = FALSE;
	$errors = '';
	foreach ($_REQUEST as $key => $value) {
		if ($key == "ls_reg") { $login = FALSE; $register = TRUE; }
		else if ($key == "ls_log") { $login = TRUE; $register = FALSE; }
		else if ($key == "ls_user") {
			if (!eregi('^[[:alnum:]\.\'\-]{3,15}$', $value)) { $u_invalid = 1; }
			$user = $value;
		}
    else if ($key == "ls_first") {
      $first = $value;
    }
    else if ($key == "edited_user_timezone") {
      $timezone = $value;
    }
    else if ($key == "ls_last") {
      $last = $value;
    }
		else if ($key == "ls_email") {
			if (!eregi('^[a-zA-Z]+[\.a-zA-Z0-9_-]*@([a-zA-Z0-9_-]+){1}(\.[a-zA-Z0-9]+){1,2}', $value)) { $e_invalid = 1; }
			$email = $value;
		}
		else if ($key == "ls_pass") {
			if (!eregi("^[[:alnum:]\.\'\-]{3,15}$", $value)) { $p_invalid = 1; }
			$pass = sha1($value);
		}
		else if ($key == "ls_repeat") { $repeat = sha1($value); }
	}
}

if ($login == TRUE) {
  $q = Doctrine_Query::create()->from('User u')->where('u.Username = ?', $user);
  $theUser = $q->fetchOne();
  if ($theUser['Password'] == $pass) {
    $_SESSION['ls_id'] = $theUser['Id'];
    $_SESSION['ls_impersonate_id'] = $theUser['Id'];
    $_SESSION['ls_user'] = $theUser['Username'];
    $_SESSION['ls_email'] = $theUser['EmailAddress'];
    $_SESSION['ls_admin'] = $theUser['IsSuperAdmin'];
    if ( ! $theUser['TimeZone'] ){
      $theUser['TimeZone'] = "GMT";
    }
    $_SESSION['ls_timezone'] = $theUser['TimeZone'];
    date_default_timezone_set($theUser['TimeZone']);
  }
		if (!isset($_SESSION['ls_id']) || !isset($_SESSION['ls_user']) || !isset($_SESSION['ls_email'])) {
      if (!$theUser['IsActive']){
        $errors[] = "Account is not active";
      } else {
			  $errors[] = "Invalid Login.";
      }
		?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
	<head>
		<title>Login Error</title>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<style type="text/css">
		<?php echo $style; ?>
		<?php echo $log_style; ?>
		</style>
	</head>
	<body>
		<div id="wrapper">
			<div id="titlebar">Errors</div>
			<div id="form">
				<div style="padding:10px;">
					<ul style="padding:0px;margin:15px;">
					<?php
			                foreach ($errors as $msg) {
			                  echo "<li style=\"padding:0px;margin:0px;\">$msg</li>";
			                }
					$errors = '';
					?>
					</ul>
					<div style="text-align:center;padding:20px;">
						<a href="<?php echo $_SERVER['HTTP_REFERER']; ?>" rel="">Click Here</a> to go back.
					</div>
				</div>
			</div>
			<div id="foot"><a href="http://www.myphpscripts.net" rel="">myPHPscripts</a> Login Session <?php echo $version; ?></div>
		</div>
	</body>
</html>
		<?php
		exit();
		}
} else if ($register == TRUE ) {

      $q = Doctrine_Query::create()->from('User u')->where('u.Username = ?', $user);
      $theUser = $q->fetchOne();
			if ($theUser['Username'] == $user) { $u_taken = 1; }
      $q = Doctrine_Query::create()->from('User u')->where('u.EmailAddress = ?', $email);
      $theUser = $q->fetchOne();
			if ($theUser['EmailAddress'] == $email) { $e_taken = 1; }

		if ($user == NULL) { $errors[] = 'User cannot be blank.'; }
		if ($u_invalid == 1) { $errors[] = 'User <strong>' . htmlspecialchars($user) . '</strong> is invalid. 3-15 alphanumeric characters required.'; }
		if ($u_taken == 1) { $errors[] = 'Username <strong>' . htmlspecialchars($user) . '</strong> is already taken.'; }
		if ($email == NULL) { $errors[] = 'Email cannot be blank.'; }
		if ($e_invalid == 1) { $errors[] = 'Email address <strong>' . htmlspecialchars($email) . '</strong> is invalid.'; }
		if ($e_taken == 1) { $errors[] = 'Email address <strong>' . htmlspecialchars($email) . '</strong> is already taken.'; }
		if ($pass == sha1(NULL)) { $errors[] = 'Password cannot be blank.'; }
		if ($p_invalid == 1) { $errors[] = 'Password is invalid. 3-15 alphanumeric characters required.'; }
		if ($repeat == sha1(NULL)) { $errors[] = 'Password verification cannot be blank.'; }
		if ($pass != $repeat) { $errors[] = 'Password and verification do not match.'; }

	if (empty($errors)) {
    $config = getConfig();
    $aUser = new User();
    $aUser['Username']=$user;
    $aUser['FirstName']=$first;
    $aUser['LastName']=$last;
    $aUser['EmailAddress']=$email;
    $aUser['TimeZone']=$timezone;
    $aUser['Password']=$pass;
    $aUser['MaxJobsPerMonth'] = $config['DefaultJobsPerMonth'];
    $aUser->save();
    ?>
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
    <head>
      <title>Registration Success</title>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <style type="text/css">
        <?php echo $style; ?>
        <?php echo $log_style; ?>
      </style>
    </head>
    <body>
    <div id="wrapper">
      <div id="titlebar">Success</div>
      <div id="form">
        <div style="text-align:center;padding:20px;">
          You are now registered.<br />
          <a href="<?php echo $_SERVER['REQUEST_URI']; ?>" rel="">Click Here</a> to log in.
        </div>
      </div>
      <div id="foot"><a href="http://www.myphpscripts.net" rel="">myPHPscripts</a> Login Session <?php echo $version; ?></div>
    </div>
    </body>
    </html>
    <?php
    	exit();
	}	else {
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
	<head>
		<title>Registration Error</title>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<style type="text/css">
		<?php echo $style; ?>
		<?php echo $reg_style; ?>
		</style>
	</head>
	<body>
		<div id="wrapper">
			<div id="titlebar">Errors</div>
			<div id="form">
				<div style="padding:10px;">
					<ul style="padding:0px;margin:15px;">
					<?php
			                foreach ($errors as $msg) {
			                  echo "<li style=\"padding:0px;margin:0px;\">$msg</li>";
			                }
					$errors = '';
					?>
					</ul>
					<div style="text-align:center;padding:20px;">
						<a href="<?php echo $_SERVER['HTTP_REFERER']; ?>" rel="">Click Here</a> to go back.
					</div>
				</div>
			</div>
			<div id="foot"><a href="http://www.myphpscripts.net" rel="">myPHPscripts</a> Login Session <?php echo $version; ?></div>
		</div>
	</body>
</html>
<?php
	exit();
  }
} else if (isset($_REQUEST['ls_register']) && $registration == 1) {
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
	<head>
		<title>New User Registration</title>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<style type="text/css">
		<?php echo $style; ?>
		<?php echo $reg_style; ?>
		</style>
	</head>
	<body>
		<div id="wrapper">
			<div id="titlebar">Register</div>
			<div id="form">
				<form action="<?php echo $_SERVER['PHP_SELF'] ?>" method="post">
					<div style="text-align:left;padding:20px;width:220px;">
						<label>User:<br />
						<input type="text" name="ls_user" value="" class="text" /></label><br />
            <label>First Name:<br />
            <input type="text" name="ls_first" value="" class="text" /></label><br />
            <label>Last Name:<br />
            <input type="text" name="ls_last" value="" class="text" /></label><br />
						<label>Email Address:<br />
						<input type="text" name="ls_email" value="" class="text" /></label><br />
						<label>Password:
						<input type="password" name="ls_pass" value="" class="text" /></label><br />
						<label>Password Repeat:
						<input type="password" name="ls_repeat" value="" class="text" /></label><br />
            <label>Timezone</label><?php get_tz_options('America/Chicago',"Time Zone")?><br />
						<div style="text-align:center;margin:20px 0px 0px 0px;">
							<input type="submit" name="ls_reg" value="Register" class="btn" />
						</div>
						<div style="text-align:right;"><a href="<?php echo $_SERVER['PHP_SELF'] ?>" rel="">Log In</a></div>
					</div>
				</form>
			</div>
			<div id="foot"><a href="http://www.myphpscripts.net" rel="">myPHPscripts</a> Login Session <?php echo $version; ?></div>
		</div>
	</body>
</html>
<?php
exit();
}
else if (!isset($_SESSION['ls_id']) && !isset($_SESSION['ls_user']) && !isset($_SESSION['ls_email'])) {
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
	<head>
		<title>Log In Required</title>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<style type="text/css">
		<?php echo $style; ?>
		<?php echo $log_style; ?>
		</style>
    <script type="text/javascript">
      function resetPassword(){
        userName = document.getElementById("ls_user").value;
        emailAddress = document.getElementById("ls_email").value;
        document.location="resetPassword.php?userName="+userName+"&emailAddress="+emailAddress;
      }
    </script>

	</head>
	<body>

		<div id="wrapper">
			<div id="titlebar">Log In Required</div>
			<div id="form">
				<form action="<?php echo $_SERVER['PHP_SELF'] ?>" method="post">
					<div style="text-align:left;padding:20px;width:220px;">
						<label>User:<br />
						<input type="text" name="ls_user" id="ls_user" value="" class="text" /></label><br />
						<label>Password:
						<input type="password" name="ls_pass" value="" class="text" /></label><br />
            <div id="emailForgot" style="visibility:hidden;">
              Enter the email address associate with this account.<br>
            <label>Email Address:<br />
            <input type="text" id="ls_email" value="" class="text" /></label><br/>
            <div style="text-align:center;margin:20px 0px 0px 0px;">
              <input type="button" class="btn" style="width:auto;" value="Reset Password" onclick="resetPassword();">
              </div>
            </div>
						<div id="loginButtons" style="text-align:center;margin:20px 0px 0px 0px;">
							<input type="submit" name="ls_log" value="Log In" class="btn" /> <input type="button" name="ls_forgot" value="Forgot Password" class="btn" style="width:auto;" onclick="document.getElementById('emailForgot').style.visibility='visible';document.getElementById('loginButtons').style.visibility='hidden'"/>
						</div>
						<?php
						if ($registration == 1) {
						?>
						<br><div style="text-align:center;"><a href="<?php echo $_SERVER['PHP_SELF'] ?>?ls_register" rel="">Register</a></div>
						<?php
						}
						?>
					</div>
				</form>
			</div>
			<div id="foot"><a href="http://www.myphpscripts.net" rel="">myPHPscripts</a> Login Session <?php echo $version; ?></div>
		</div>
	</body>
</html>
<?php
exit();
}
}
?>