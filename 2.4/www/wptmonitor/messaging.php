<?php
  if ($message = $_SESSION['ErrorMessagePopUp']){
    echo "<script>alert('".$message."');</script>";
    unset($_SESSION['ErrorMessagePopUp']);
  }
?>
