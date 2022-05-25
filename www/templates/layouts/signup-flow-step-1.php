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
global $client_error;

$page_title = $page_title ? $page_title : 'WebPageTest';
?>
  <title><?php echo $page_title; ?></title>
  <?php require_once __DIR__ . '/head.inc'; ?>
  <link href="/css/account.css" rel="stylesheet" />
  <script type="text/javascript">
  function changePrice(type) {
    const result = document.querySelector('.' + type + ' .price span');
    result.textContent = event.target.options[event.target.selectedIndex].dataset.price
  }

  </script>
  </head>
  <body>
    <?php require_once __DIR__ . '/header.inc'; ?>
    <main>
    <?php echo $template_output; ?>
    </main>
    <?php require_once __DIR__ . '/footer.inc'; ?>
  </body>
</html>
