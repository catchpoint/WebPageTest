
            <?php
            //If we're looking at a test result, include the inner test-result div
            if( !strcasecmp('Test Result', $tab) && (!isset($nosubheader) || !@$nosubheader) )
            {
                echo '</div></div>';
            }
            ?>


    <footer>
        <ul>
        <li><a href="#">Terms of Service</a></li>
        <li><a href="#">Privacy Policy</a></li>
        <li>&copy; Catchpoint Systems, Inc. All rights reserved.</li>
    </footer>
    <?php
    if (file_exists('./settings/server/customfooter.inc.php')) {
        include('./settings/server/customfooter.inc.php');
    } elseif (file_exists('./settings/common/customfooter.inc.php')) {
        include('./settings/common/customfooter.inc.php');
    } elseif (file_exists('./settings/customfooter.inc.php')) {
        include('./settings/customfooter.inc.php');
    }
    ?>
    <?php
    if(!isset($noanalytics) && extension_loaded('newrelic'))
        echo @newrelic_get_browser_timing_footer();
    ?>

    <div id="experiment-timing" style="color: #77A;"></div>
