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
  <link href="/css/account.css" rel="stylesheet" />
  </head>
  <body>
    <header>
      <a class="logo" href="/"><img src="/images/wpt-logo.svg" alt="WebPageTest, by Catchpoint"/></a>
<?php if ($is_plan_free): ?>
      <ol class="free-plan">
<?php else: ?>
      <ol>
<?php endif; ?>
<?php if ($step == 2): ?>
        <li>Choose Plan</li>
        <li class="selected">Account Details</li>
  <?php if (!$is_plan_free): ?>
        <li>Payment Details</li>
  <?php endif; ?>
<?php else: ?>
        <li>Choose Plan</li>
        <li>Account Details</li>
  <?php if (!$is_plan_free): ?>
        <li class="selected">Payment Details</li>
  <?php endif; ?>
<?php endif; ?>
      </ol>
    </header>
    <main>
    <?php echo $template_output; ?>
    </main>
  </body>
</html>
