<?php
//if not logged in, let's encourage sign-up
        if( $supportsCPAuth && isset($request_context)
            && is_null($request_context->getUser()) || is_null($request_context->getUser()->getEmail() ))
        {
            ?>
            <div class="cta-banner">
                <p><strong>Save Test Results</strong> with a <strong>Free Account</strong>

                    <a class="btn-primary btn-primary-compact" href="/signup">Sign Up &amp; Save Test Result</a></p>
            </div>
            <?php
        }
?>