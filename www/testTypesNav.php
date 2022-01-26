<?php
$testTypes = array();
// TODO comprehensive check
if (file_exists(__DIR__ . '/settings/profiles.ini') ||
    file_exists(__DIR__ . '/settings/common/profiles.ini') ||
    file_exists(__DIR__ . '/settings/server/profiles.ini')) {
    $testTypes['Site Performance'] = '/';
}
if (file_exists(__DIR__ . '/settings/profiles_webvitals.ini') ||
        file_exists(__DIR__ . '/settings/common/profiles_webvitals.ini') ||
        file_exists(__DIR__ . '/settings/server/profiles_webvitals.ini')) {
            $testTypes['Core Web Vitals'] = '/webvitals';

}

$testTypes['Lighthouse'] = '/lighthouse';
$testTypes['Visual Comparison'] = '/video';
$testTypes['Traceroute'] = '/traceroute';

unset($testTypes[$currNav]);
?>


<h2><span>Start a</span>
    <span class="home_test_select" tabindex="0" aria-label="Test Type">
        <span class="home_test_select_label"><?php echo $currNav; ?></span>
        <span class="visually-hidden"> or...</span>
        <ul>
            <?php
                foreach( $testTypes as $key => $url ){
                    echo "<li><a href=\"$url\">$key</a></li>";
                }
            ?>
        </ul>
    </span> 
    <span>Test!</span></h2>