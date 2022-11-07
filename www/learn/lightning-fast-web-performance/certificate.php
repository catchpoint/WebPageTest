<!DOCTYPE html>
<html class="account-layout">

<head>
    <?php
        require_once __DIR__ . '/../../common.inc';
        $useScreenshot = true;
        require_once INCLUDES_PATH . '/head.inc';
    ?>
    <link rel="stylesheet" href="/learn/lightning-fast-web-performance/lfwp-assets/learn-course.css">
</head>

<body class="learn">


<?php
    $name = 'Your Name Here!';
if (isset($_GET['name'])) {
    $name = htmlentities(rawurldecode($_GET['name']));
}
?>




<div class="learn_feature learn_feature-certificate">
                <img src="/assets/images/wpt-logo-dark.svg"  alt="WebPageTest, by Catchpoint" />
                <h1>Certificate of Achievement</h1>
                <p>This certificate recognizes that <strong><?=$name?></strong> has completed the following professional skills training course from Catchpoint.</p>
    <div class="learn_feature_hed_contain">


                <div class="learn_feature_hed learn_feature_hed-pro">

                    <div class="learn_feature_hed_text">
                        <h2 class="attention"><span class="learn_feature_hed_text_leadin">Lightning-Fast </span> Web Performance</h2>
                        <p><b class="flag">Online Course</b>Learn to analyze site performance, fix issues, monitor for regressions, and deliver fast, responsive designs from the start.</p>
                    </div>
                    <div class="learn_feature_hed_visual">
                        <p><img src="/learn/lightning-fast-web-performance/lfwp-assets/lfwp-profile-sj.png" alt="Profile Picture of Scott">
                        <span>An online lecture course <em>led by Scott Jehl, WebPageTest</em>
                            <a href="#toc" class="pill">Free! Start Now</a>
                        </span>
                    </p>
                    </div>
                </div>

    </div>


</div>



</body>
</html>