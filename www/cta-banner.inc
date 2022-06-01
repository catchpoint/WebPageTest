<?php

require_once __DIR__ . '/../../common.inc';

use WebPageTest\Util;

$host = Util::getSetting('host');
$protocol = $request_context->getUrlProtocol();

//if not logged in, let's encourage sign-up
        if( $supportsCPAuth && isset($request_context) && is_null($request_context->getUser()->getEmail() ))
        {
            ?>
            <div class="cta-banner">
                <p><strong>Save Test Results</strong> with a <strong>Free Account</strong>

                    <a class="btn-primary btn-primary-compact" href="<?= "{$host}://{$protocol}/signup" ?>">Sign Up &amp; Save Test Result</a></p>
            </div>
            <?php
        }
?>