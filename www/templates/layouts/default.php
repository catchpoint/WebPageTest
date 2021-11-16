<!DOCTYPE html>
<html>
  <head>
<?php
require_once __DIR__ . '/../../common.inc';

global $USER_EMAIL;
global $supportsAuth;
global $supportsSaml;
global $COMPACT_MODE;

$page_title = $page_title ? $page_title : 'WebPageTest';
?>
  <title><?php echo $page_title; ?></title>
  <?php require_once __DIR__ . '/head.inc'; ?>
  </head>
  <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <div id="main">
    <?php require_once __DIR__ . '/main_hed.inc'; ?>
    <?php echo $template_output; ?>
    <?php require_once __DIR__ . '/footer.inc'; ?>
  </body>
</html>
