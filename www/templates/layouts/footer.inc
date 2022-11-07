<?php

require_once __DIR__ . "/../../common.inc";
use WebPageTest\Util;

$privacy_policy = Util::getSetting('privacy_policy_url');

//If we're looking at a test result, include the inner test-result div
if (!strcasecmp('Test Result', $tab) && (!isset($nosubheader) || !@$nosubheader)) {
    echo '</div></div>';
}
?>


<footer>
    <ul>
<?php if (is_file(SETTINGS_PATH . '/common/terms.inc') || is_file(SETTINGS_PATH . '/server/terms.inc') || is_file(SETTINGS_PATH . '/settings/terms.inc')) : ?>
        <li><a href="/terms">Terms of Service</a></li>
<?php endif; ?>

<?php if ($privacy_policy) : ?>
        <li><a href="<?= $privacy_policy ?>">Privacy Policy</a></li>
<?php endif; ?>
        <li>&copy; <a href="https://www.catchpoint.com/">Catchpoint Systems, Inc.</a> All rights reserved.</li>
    </ul>
</footer>

<?php
if (!isset($site_js_loaded) || !$site_js_loaded) {
    echo "<script src=\"{$GLOBALS['cdnPath']}/assets/js/vendor/jquery-1.7.1.js\"></script>\n";
    echo "<script src=\"{$GLOBALS['cdnPath']}/assets/js/site.js?v=" . constant('VER_JS') . "\"></script>\n";
    $hasJquery = true;
}
if (
    !array_key_exists('HTTP_CACHE_CONTROL', $_SERVER) &&    // skip manual browser refreshes
    is_file(ASSETS_PATH . '/js/experiment.js')
) {
    $headers = $_SERVER;
    preg_match_all(
        '%(?P<browser>Camino|Kindle(\ Fire\ Build)?|Firefox|Safari|MSIE|Chrome|IEMobile|Opera|Silk|Lynx|Version|Wget|curl|NintendoBrowser|PLAYSTATION|AppleWebKit\ \d+)(?:;?)(?:(?:[/ ])(?P<version>[0-9]+)|/(?:[A-Z]*))%x',
        $_SERVER['HTTP_USER_AGENT'],
        $result,
        PREG_PATTERN_ORDER
    );
    $browser = "{$result['browser'][0]} {$result['version'][0]}";
    echo "<script>\n";
    echo "wptJSVer = '" . constant('VER_JS') . "';\n";
    echo "wptBrowser = '$browser';\n";
    require_once(ASSETS_PATH . '/js/experiment.js');
    echo "</script>\n";
    //echo "<script src=\"{$GLOBALS['cdnPath']}/assets/js/experiment.js?v=" . VER_JS . "\"></script>\n";
}

?>
<?php
if (file_exists(SETTINGS_PATH . '/server/customfooter.inc.php')) {
    require(SETTINGS_PATH . '/server/customfooter.inc.php');
} elseif (file_exists(SETTINGS_PATH . '/common/customfooter.inc.php')) {
    require(SETTINGS_PATH . '/common/customfooter.inc.php');
} elseif (file_exists(SETTINGS_PATH . '/customfooter.inc.php')) {
    require(SETTINGS_PATH . '/customfooter.inc.php');
}
?>

<div id="experiment-timing" style="color: #77A;"></div>
