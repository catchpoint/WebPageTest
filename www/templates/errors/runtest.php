<!DOCTYPE html>
<html lang="en-us">
  <head>
    <title>WebPageTest - Test Error</title>
    <?php $gaTemplate = 'Test Error'; include (__DIR__ . '/../../head.inc'); ?>
  </head>
  <body <?php if ($compact_mode) {echo 'class="compact"';} ?>>
    <?php include __DIR__ . '/../../header.inc'; ?>
    <div class="testerror box">
      <h1>Oops! <em>There was a problem with the test.</em></h1>
      <?php echo $error; ?>
    </div>
    <?php include(__DIR__ . '/../../footer.inc'); ?>
  </body>
</html>
