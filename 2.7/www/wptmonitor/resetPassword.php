<?php
  include 'monitor.inc';
  include 'alert_functions.inc';
  $userName = $_REQUEST['userName'];
  $userTable = Doctrine_Core::getTable('User');
  $user = $userTable->findOneByUserName($userName);

  if ( !$user ){
    echo "Invalid user credentials";
    exit;
  }

  $tempPassword = generatePassword();
  $emailAddress = $user['EmailAddress'];
  if ( $emailAddress = $_REQUEST['emailAddress']){
    sendEmailAlert($emailAddress,"Your temporary password: ".$tempPassword);
  } else {
    echo "Invalid user credentials";
    exit;
  }
  $user['Password'] = sha1($tempPassword);
  $user->save();
  echo "Password reset. Please check your email for the temporary password";
  exit;

  function generatePassword($length=9, $strength=0) {
    $vowels = 'aeuy';
    $consonants = 'bdghjmnpqrstvz';
    if ($strength & 1) {
      $consonants .= 'BDGHJLMNPQRSTVWXZ';
    }
    if ($strength & 2) {
      $vowels .= "AEUY";
    }
    if ($strength & 4) {
      $consonants .= '23456789';
    }
    if ($strength & 8) {
      $consonants .= '@#$%';
    }

    $password = '';
    $alt = time() % 2;
    for ($i = 0; $i < $length; $i++) {
      if ($alt == 1) {
        $password .= $consonants[(rand() % strlen($consonants))];
        $alt = 0;
      } else {
        $password .= $vowels[(rand() % strlen($vowels))];
        $alt = 1;
      }
    }
    return $password;
  }
?>
 
