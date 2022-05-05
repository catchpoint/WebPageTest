<!DOCTYPE html>
<html class="signup-flow-layout">
  <head>
<?php
require_once __DIR__ . '/../../common.inc';

global $USER_EMAIL;
global $supportsAuth;
global $supportsSaml;

$page_title = $page_title ? $page_title : 'WebPageTest';
?>
  <title><?php echo $page_title; ?></title>
  <?php require_once __DIR__ . '/head.inc'; ?>
  </head>
  <body>
    <header>
      <a class="logo" href="/"><img src="/images/wpt-logo.svg" alt="WebPageTest, by Catchpoint"/></a>
      <ol>
        <li>Choose Plan</li>
        <li>Account Details</li>
        <li>Payment Details</li>
      </ol>
    </header>
    <main>
    <?php echo $template_output; ?>
    </main>
  </body>
</html>
