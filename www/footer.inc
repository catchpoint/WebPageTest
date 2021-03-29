
            <?php
            //If we're looking at a test result, include the inner test-result div
            if( !strcasecmp('Test Result', $tab) && (!isset($nosubheader) || !@$nosubheader) )
            {
                echo '</div></div>';
            }
            ?>


    <footer>
        <ul>
        <?php
        if (is_file('settings/common/terms.inc') || is_file('settings/server/terms.inc') || is_file('settings/terms.inc')) {
            echo '<li><a href="/terms.php">Terms of Service</a></li>';
        }
        $privacy_policy = GetSetting('privacy_policy_url');
        if ($privacy_policy) {
            echo "<li><a href='$privacy_policy'>Privacy Policy</a></li>";
        }
        ?>
        <li>&copy; <a href="https://www.catchpoint.com/">Catchpoint Systems, Inc.</a> All rights reserved.</li>
        </ul>
    </footer>
    <?php
    if (!isset($site_js_loaded) || !$site_js_loaded) {
        echo "<script type=\"text/javascript\" src=\"{$GLOBALS['cdnPath']}/js/site.js?v=" . VER_JS . "\"></script>\n";
        $hasJquery = true;
    }
    if (!array_key_exists('HTTP_CACHE_CONTROL', $_SERVER) &&    // skip manual browser refreshes
        is_file('./js/experiment.js')) {
        $headers = $_SERVER;
        preg_match_all('%(?P<browser>Camino|Kindle(\ Fire\ Build)?|Firefox|Safari|MSIE|Chrome|IEMobile|Opera|Silk|Lynx|Version|Wget|curl|NintendoBrowser|PLAYSTATION|AppleWebKit\ \d+)(?:;?)(?:(?:[/ ])(?P<version>[0-9]+)|/(?:[A-Z]*))%x',
                        $_SERVER['HTTP_USER_AGENT'], $result, PREG_PATTERN_ORDER);
        $browser = "{$result['browser'][0]} {$result['version'][0]}";
        echo "<script>\n";
        echo "wptJSVer = '" . VER_JS . "';\n";
        echo "wptBrowser = '$browser';\n";
        include ('./js/experiment.js');
        echo "</script>\n";
        //echo "<script type=\"text/javascript\" src=\"{$GLOBALS['cdnPath']}/js/experiment.js?v=" . VER_JS . "\"></script>\n";
    }

    ?>
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
