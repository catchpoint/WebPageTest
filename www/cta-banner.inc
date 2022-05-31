<?php
//if not logged in, let's encourage sign-up
        if( $supportsCPAuth && isset($request_context) && is_null($request_context->getUser()->getEmail() ))
        {
            ?>
            <div class="cta-banner">
                <p><strong>Save Test Results</strong> with a <strong>Free Account</strong>
                    <a class="btn-primary btn-primary-compact" href="https://app.webpagetest.org/ui/entry/wpt/signup?&utm_source=WPT_Test_Results&utm_content=button&utm_term=Sign_Up">Sign Up Now</a></p>
            </div>
            <?php
        }
?>