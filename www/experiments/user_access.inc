<?php

use WebPageTest\Util;

// experiments permissions checks
$experiments_logged_in = Util::getSetting('cp_auth') && (!is_null($request_context->getClient()) && $request_context->getClient()->isAuthenticated());
$experiments_paid = !is_null($request_context->getUser()) && $request_context->getUser()->isPaid();

 // TODO TEMP TEMP TEMP DELETE FOR LAUNCH
$experiments_logged_in = true;
$experiments_paid = true;

// NOTE: these are mostly for testing the experiments form and not runtest, 
// because they're hard to ripple through; you'd have to add a couple hidden input fields for them to pass along
if( isset($_REQUEST['unpaid']) ){
    $experiments_paid = false;
}
if( isset($_REQUEST['loggedout']) ){
    $experiments_logged_in = false;
}
// TEMP TEMP TEMP
?>