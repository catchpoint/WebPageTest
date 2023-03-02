<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
include 'common.inc';

$current_user = $request_context->getUser();
$is_paid = !is_null($current_user) ? $current_user->isPaid() : false;

$loc = GetDefaultLocation();
$tid = array_key_exists('tid', $_GET) ? $_GET['tid'] : 0;
$run = array_key_exists('run', $_GET) ? $_GET['run'] : 0;
$page_keywords = array('Video','comparison','WebPageTest','Website Speed Test');
$page_description = "Visually compare the performance of multiple websites with a side-by-side video and filmstrip view of the user experience.";
$profiles = null;
$profile_file = __DIR__ . '/../settings/profiles.ini';
if (file_exists(__DIR__ . '/../settings/common/profiles.ini')) {
    $profile_file = __DIR__ . '/../settings/common/profiles.ini';
}
if (file_exists(__DIR__ . '/../settings/server/profiles.ini')) {
    $profile_file = __DIR__ . '/../settings/server/profiles.ini';
}
if (is_file($profile_file)) {
    $profiles = parse_ini_file($profile_file, true);
}
?>

<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Visual Comparison</title>
        <?php include('head.inc'); ?>
    </head>
    <body class="home feature-pro">
       <?php
            $tab = 'Start Test';
            include 'header.inc';
        ?>

<?php include("home_header.php"); ?>


<div class="home_content_contain">
             <div class="home_content">

            <form name="urlEntry" id="urlEntry" action="/video/docompare.php" method="POST" onsubmit="return ValidateInput(this)">


            <div id="test_box-container" class="home_responsive_test">
                <?php
                $currNav = "Visual Comparison";
                include("testTypesNav.php");
                ?>
                <div id="visual_comparison" class="test_box">
                    <div class="test-box-lede test_main_config">
                      <div class="test_presets">
                      <p class="h3">Enter multiple URLs to compare them against each other visually.</p>


                      <input type="hidden" id="nextid" value="3">
                        <div id="urls">
                            <?php
                            if ($tid) {
                                $testPath = './' . GetTestPath($tid);
                                $pageData = loadAllPageData($testPath);
                                $url = trim($pageData[1][0]['URL']);
                                $testInfo = GetTestInfo($tid);
                                $label = trim($testInfo['label']);
                                if (strlen($url)) {
                                    echo '<div id="urldiv0" class="urldiv">';
                                    echo "<input type=\"hidden\" id=\"tid\" name=\"tid\" value=\"$tid\">";
                                    echo "<input type=\"hidden\" id=\"run\" name=\"run\" value=\"$run\">";
                                    echo "<label for=\"tidlabel\">Label</label> <input id=\"tidlabel\" type=\"text\" name=\"tidlabel\" value=\"$label\" > ";
                                    echo "<label for=\"tidurl\">URL</label> <input id=\"tidurl\" type=\"text\" value=\"$url\" disabled=\"disabled\"> ";
                                    echo "<a href='#' onClick='return RemoveUrl(\"#urldiv0\");'>Remove</a>";
                                    echo "</div>\n";
                                }
                            }
                            ?>
                            <div id="urldiv1" class="urldiv fieldrow">
                                <label for="label1">Label</label> <input id="label1" type="text" required name="label[1]">
                                <label for="url1">URL</label> <input id="url1" type="text" required name="url[1]" onkeypress="if (event.keyCode == 32) {return false;}" >
                                <a href='#' onClick='return RemoveUrl("#urldiv1");'>Remove</a>
                            </div>
                            <div id="urldiv2" class="urldiv fieldrow">
                                <label for="label2">Label</label> <input id="label2" type="text" required name="label[2]">
                                <label for="url2">URL</label> <input id="url2" type="text" required name="url[2]" onkeypress="if (event.keyCode == 32) {return false;}" >
                                <a href='#' onClick='return RemoveUrl("#urldiv2");'>Remove</a>
                            </div>
                        </div>
                        <button class="addBtn" onclick="return AddUrl();">Add URL</button>

                        <ul class="input_fields">
                        <?php
                        if (isset($profiles) && is_array($profiles) && count($profiles)) {
                            echo '<li>';
                            echo '<label for="profile">Test Configuration:</label>';
                            echo '<select name="profile" id="profile" onchange="profileChanged()">';
                            foreach ($profiles as $name => $profile) {
                                $selected = '';
                                if ($name == $_COOKIE['testProfile']) {
                                    $selected = 'selected';
                                }
                                echo "<option value=\"$name\" $selected>{$profile['label']}</option>";
                            }
                            if (isset($lastGroup)) {
                                echo "</optgroup>";
                            }
                            echo '</select>';
                            echo '</li>';
                            echo '<li id="description"></li>';
                            echo '</ul>';
                        }
                        ?>


                      <?php if ($is_paid) : ?>
                          <div>
                              <label for="private"><input type="checkbox" name="private" id="private" class="checkbox"> Make Test Private <small>Private tests are only visible to your account</small></label>
                          </div>
                      <?php endif; ?>

                      </div>
                      <div>
                        <input type="submit" name="submit" value="Start Test &#8594;" class="start_test">
                    </div>


                    </div>
                    <p class="footnote">For each URL, 3 first-view tests will be run from '<?php echo $loc['label']; ?>' and the median run will be used for comparison.
                        If you would like to test with different settings, submit your tests individually from the
                        <a href="/">main test page</a>.</p>
                </div>

                <script>
                <?php
                  echo "var profiles = " . json_encode($profiles) . ";\n";
                ?>
                var wptStorage = window.localStorage || {};
                if (wptStorage['testrv'] != undefined)
                  $('#rv').prop('checked', wptStorage['testrv']);
                var rvChanged = function() {
                  wptStorage['testrv'] = $('#rv').is(':checked');
                }

                var profileChanged = function() {
                  var sel = document.getElementById("profile");
                  var txt = document.getElementById("description");
                  var profile = sel.options[sel.selectedIndex].value;
                  var description = "";
                  if (profiles[profile] !== undefined) {
                    var d = new Date();
                    d.setTime(d.getTime() + (365*24*60*60*1000));
                    document.cookie = "testProfile=" + profile + ";" + "expires=" + d.toUTCString() + ";path=/";
                    if (profiles[profile]['description'] !== undefined)
                      description = profiles[profile]['description'];
                  }
                  txt.innerHTML = description;
                };
                profileChanged();
                </script>
            </form>
            </div><!--home_content_contain-->
        </div><!--home_content-->



            <?php
            include(__DIR__ . '/../include/home-subsections.inc');
            ?>
            <?php include('footer.inc'); ?>
        </div>

        <script src="<?php echo $GLOBALS['cdnPath']; ?>/video/videotest.js"></script>
    </body>
</html>
