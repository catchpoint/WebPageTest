<!DOCTYPE html>
<html class="headless">
  <head>
<?php
require_once __DIR__ . '/../../common.inc';

global $USER_EMAIL;
global $supportsAuth;
global $supportsSaml;

$page_title = $page_title ?: 'WebPageTest';
?>
  <title><?php echo $page_title; ?></title>
  <?php require_once __DIR__ . '/head.inc'; ?>
  </head>
  <body>
    <?php echo $template_output; ?>
  </body>
</html>
