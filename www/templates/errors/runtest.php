<div class="testerror box">
  <h1>Oops! <em>
  <?php
    $title = "There was a problem with the test.";
    if (strlen($errorTitle)) {
	$title = $errorTitle ;
    }
    echo $title;
  ?>
  </em></h1>
  <?php echo $error; ?>
</div>
