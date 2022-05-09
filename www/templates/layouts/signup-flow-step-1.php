<!DOCTYPE html>
<html>
  <head>
<?php
require_once __DIR__ . '/../../common.inc';

global $USER_EMAIL;
global $supportsAuth;
global $supportsSaml;
global $supportsCPAuth;
global $request_context;
global $_SESSION;

$page_title = $page_title ? $page_title : 'WebPageTest';
?>
  <title><?php echo $page_title; ?></title>
  <?php require_once __DIR__ . '/head.inc'; ?>
  <link href="/css/account.css" rel="stylesheet" />
  </head>
  <body>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <div id="main">
    <?php require_once __DIR__ . '/main_hed.inc'; ?>
    <?php echo $template_output; ?>
    <?php require_once __DIR__ . '/footer.inc'; ?>
  </body>
</html>
