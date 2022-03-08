<!DOCTYPE html>
<html class="headless">
  <head>
<?php
require_once __DIR__ . '/../../common.inc';

global $USER_EMAIL;
global $supportsAuth;
global $supportsSaml;
global $noanalytics;

$page_title = $page_title ?: 'WebPageTest';
?>
  <title><?php echo $page_title; ?></title>
  <?php require_once __DIR__ . '/head.inc'; ?>
  </head>
  <body>
  <?php if (!isset($noanalytics)) {
    require_once __DIR__ . '/google-tag-manager-noscript.inc';
  } ?>
    <?php echo $template_output; ?>
  </body>
</html>
