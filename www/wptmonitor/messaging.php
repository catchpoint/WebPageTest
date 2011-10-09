<?php
  if (isset($_SESSION['ErrorMessagePopUp']) && $message = $_SESSION['ErrorMessagePopUp']){
    echo "<script>alert('".$message."');</script>";
    unset($_SESSION['ErrorMessagePopUp']);
  }
?>
