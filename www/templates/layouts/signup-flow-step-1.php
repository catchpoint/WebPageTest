<!DOCTYPE html>
<html class="signup-flow-step-1-layout">
  <head>
<?php
require_once __DIR__ . '/../../common.inc';

global $USER_EMAIL;
global $supportsAuth;
global $supportsSaml;
global $supportsCPAuth;
global $request_context;
global $_SESSION;
global $notification_alert;

$page_title = $page_title ? $page_title : 'WebPageTest';
?>
  <title><?php echo $page_title; ?></title>
  <?php require_once __DIR__ . '/head.inc'; ?>
  <link href="/css/account.css" rel="stylesheet" />
  </head>
  <body>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <main>
    <?php echo $template_output; ?>
    </main>
    <?php require_once __DIR__ . '/footer.inc'; ?>
  </body>
</html>
