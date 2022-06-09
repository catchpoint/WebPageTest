<?php
require_once __DIR__ . "/../../common.inc";
use WebPageTest\Util;

$privacy_policy = Util::getSetting('privacy_policy_url');

//If we're looking at a test result, include the inner test-result div
if( !strcasecmp('Test Result', $tab) && (!isset($nosubheader) || !@$nosubheader) )
{
    echo '</div></div>';
}
?>


<footer>
    <ul>
<?php if (is_file(__DIR__ . '/../../settings/common/terms.inc') || is_file(__DIR__ . '/../../settings/server/terms.inc') || is_file(__DIR__ . '/../../settings/terms.inc')): ?>
        <li><a href="/terms">Terms of Service</a></li>
<?php endif; ?>

<?php if ($privacy_policy): ?>
        <li><a href="<?= $privacy_policy ?>">Privacy Policy</a></li>
<?php endif; ?>
        <li>&copy; <a href="https://www.catchpoint.com/">Catchpoint Systems, Inc.</a> All rights reserved.</li>
    </ul>
</footer>

<?php
if (!isset($site_js_loaded) || !$site_js_loaded) {
    echo "<script src=\"{$GLOBALS['cdnPath']}/js/site.js?v=" . constant('VER_JS') . "\"></script>\n";
    $hasJquery = true;
}
if (!array_key_exists('HTTP_CACHE_CONTROL', $_SERVER) &&    // skip manual browser refreshes
    is_file(__DIR__ . '/../../js/experiment.js')) {
    $headers = $_SERVER;
    preg_match_all('%(?P<browser>Camino|Kindle(\ Fire\ Build)?|Firefox|Safari|MSIE|Chrome|IEMobile|Opera|Silk|Lynx|Version|Wget|curl|NintendoBrowser|PLAYSTATION|AppleWebKit\ \d+)(?:;?)(?:(?:[/ ])(?P<version>[0-9]+)|/(?:[A-Z]*))%x',
                    $_SERVER['HTTP_USER_AGENT'], $result, PREG_PATTERN_ORDER);
    $browser = "{$result['browser'][0]} {$result['version'][0]}";
    echo "<script>\n";
    echo "wptJSVer = '" . constant('VER_JS') . "';\n";
    echo "wptBrowser = '$browser';\n";
    require_once (__DIR__ . '/../../js/experiment.js');
    echo "</script>\n";
    //echo "<script src=\"{$GLOBALS['cdnPath']}/js/experiment.js?v=" . VER_JS . "\"></script>\n";
}

?>
<?php
if (file_exists(__DIR__ . '/../../settings/server/customfooter.inc.php')) {
    require(__DIR__ . '/../../settings/server/customfooter.inc.php');
} elseif (file_exists(__DIR__ . '/../../settings/common/customfooter.inc.php')) {
    require(__DIR__ . '/../../settings/common/customfooter.inc.php');
} elseif (file_exists(__DIR__ . '/../../settings/customfooter.inc.php')) {
    require(__DIR__ . '/../../settings/customfooter.inc.php');
}
?>

<div id="experiment-timing" style="color: #77A;"></div>
