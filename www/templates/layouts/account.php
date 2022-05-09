<!DOCTYPE html>
<html class="account-layout">
  <head>
<?php
require_once __DIR__ . '/../../common.inc';

global $USER_EMAIL;
global $supportsAuth;
global $supportsSaml;
global $supportsCPAuth;
global $request_context;

$page_title = $page_title ? $page_title : 'WebPageTest';
?>
  <title><?php echo $page_title; ?></title>
  <?php require_once __DIR__ . '/head.inc'; ?>
  </head>
  <style>
    .account-layout #main {
      background-color: rgb(234, 234, 234);
    }
  </style>
  <body>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <div id="main">
    <?php require_once __DIR__ . '/main_hed.inc'; ?>
    <?php echo $template_output; ?>
    <?php require_once __DIR__ . '/footer.inc'; ?>
  </body>
</html>
