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
  <style>

.signup-flow-layout header {
  padding-left: 0;
}
.signup-flow-layout header .logo {
  border-bottom: 1px solid rgba(255, 255, 255, .3);
  padding-bottom: 1.5rem;
}
.signup-flow-layout header ol {
  padding-left: 0;
  display: flex;
  justify-content: space-around;
}
.signup-flow-layout header li {
  margin-left: 40px;
  color: #D0D0D0;
  font-weight: 400;
  font-size: 1.125rem;
}
.signup-flow-layout header .selected {
  color: #A9C8F1;
  font-weight: 700;
}

.signup-flow-layout main {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 0px 0px;
  grid-template-areas:
      "."
      ".";
  width: 100vw;
  height: 100vh;
}

@media(min-width: 600px) {
  .signup-flow-layout header {
    padding-left: 30px;
    display: flex;
    justify-content: flex-start;
  }

  .signup-flow-layout header .logo {
    border-bottom: 0;
    padding-bottom: 0;
    margin: 1em 0;
  }

  .signup-flow-layout ol {
    margin-left: 0;
  }
  .signup-flow-layout .free-plan {
    margin-left: 0;
  }
}

@media(min-width: 50rem) {
  .signup-flow-layout main {
    grid-template-columns: 1fr 23.75rem;
    grid-template-rows: 1fr;
    grid-template-areas: ". .";
  }
}

@media(min-width: 86.25rem) {
  .signup-flow-layout ol {
    margin-left: calc(50vw - 43.4375rem);
  }
  .signup-flow-layout .free-plan {
    margin-left: calc(50vw - 39rem);
  }
}
  </style>
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
