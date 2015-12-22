<?php
chdir('..');
include 'common.inc';
$loc = GetDefaultLocation();
$tid= array_key_exists('tid', $_GET) ? $_GET['tid'] : 0;
$run= array_key_exists('run', $_GET) ? $_GET['run'] : 0;
$page_keywords = array('Video','comparison','Webpagetest','Website Speed Test');
$page_description = "Visually compare the performance of multiple websites with a side-by-side video and filmstrip view of the user experience.";
?>

<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Visual Comparison</title>
        <?php $gaTemplate = 'Visual Test'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Home';
            include 'header.inc';
            ?>
            <form name="urlEntry" action="/video/docompare.php" method="POST" onsubmit="return ValidateInput(this)">

            <h2 class="cufon-dincond_black">Test a website's performance</h2>

            <div id="test_box-container">
                <ul class="ui-tabs-nav">
                    <li class="analytical_review"><a href="/">Analytical Review</a></li>
                    <li class="visual_comparison ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a href="#">Visual Comparison</a></li>
                    <li class="traceroute"><a href="/traceroute">Traceroute</a></li>
                </ul>
                <div id="visual_comparison" class="test_box">

                    <p>Enter multiple urls to compare them against each other visually.</p>
                        <input type="hidden" id="nextid" value="2">
                        <div id="urls">
                            <?php
                            if( $tid )
                            {
                                $testPath = './' . GetTestPath($tid);
                                $pageData = loadAllPageData($testPath);
                                $url = trim($pageData[1][0]['URL']);
                                $testInfo = GetTestInfo($tid);
                                $label = trim($testInfo['label']);
                                if( strlen($url) )
                                {
                                    echo '<div id="urldiv0" class="urldiv">';
                                    echo "<input type=\"hidden\" id=\"tid\" name=\"tid\" value=\"$tid\">";
                                    echo "<input type=\"hidden\" id=\"run\" name=\"run\" value=\"$run\">";
                                    echo "Label: <input id=\"tidlabel\" type=\"text\" name=\"tidlabel\" value=\"$label\" style=\"width:10em\"> ";
                                    echo "URL: <input id=\"tidurl\" type=\"text\" style=\"width:30em\" value=\"$url\" disabled=\"disabled\"> ";
                                    echo "<a href='#' onClick='return RemoveUrl(\"#urldiv0\");'>Remove</a>";
                                    echo "</div>\n";
                                }
                            }
                            ?>
                            <div id="urldiv1" class="urldiv">
                                Label: <input id="label1" type="text" name="label[1]" style="width:10em"> 
                                URL: <input id="url1" type="text" name="url[1]" style="width:30em"> 
                                <a href='#' onClick='return RemoveUrl("#urldiv1");'>Remove</a>
                            </div>
                        </div>
                        <br>
                        <button onclick="return AddUrl();">Add</button> another page to the comparison.
                        <br>
                        <br>
                        <?php
                        // load the main industry list
                        if (is_file('./video/industry.ini') && is_file('./video/dat/industry.dat')) {
                          $ind = parse_ini_file('./video/industry.ini', true);
                          $ids = json_decode(file_get_contents('./video/dat/industry.dat'), true);
                          if( $ind && count($ind) && $ids && count($ids) )
                          {
                              $i = 0;
                              echo '<p><a href="javascript:void(0)" id="advanced_settings">Compare against industry pages <span class="arrow"></span></a></p>';
                              echo '<div id="advanced_settings-container" class="hidden">';
                              foreach($ind as $industry => &$pages )
                              {
                                  if( $ids[$industry] )
                                  {
                                      echo "<div class=\"industry\">\n";
                                      echo "<div class=\"indHead\">$industry:</div>\n";
                                      echo "<div class=\"indBody\">\n";
                                      foreach( $pages as $page => $url )
                                      {
                                          $details = $ids[$industry][$page];
                                          if( $details )
                                          {
                                              $i++;
                                              $tid = $details['id'];
                                              $date = $details['last_updated'];
                                              echo "<input type=\"checkbox\" name=\"t[]\" value=\"$tid\"> $page";
                                              /*
                                              if( $date )
                                              {
                                                  $date = gmdate('m/d/y', strtotime($date));
                                                  echo " ($date)";
                                              }
                                              */
                                              echo "<br>\n";
                                          }
                                      }
                                      echo "</div></div>\n";
                                  }
                              }
                              echo '</div>';
                          }
                        }
                        ?>

                        <p id="footnote" class="cleared">For each URL, 3 first-view tests will be run from '<?php echo $loc['label']; ?>' and the median run will be used for comparison.  
                        The tests will also be publically available.  If you would like to test with different settings, submit your tests individually from the 
                        <a href="/">main test page</a>.</p>
                    </div>
                </div>

                <div id="start_test-container">
                    <p><input type="submit" name="submit" value="" class="start_test"></p>
                </div>
                <div class="cleared"></div>
                
            </form>
            
            <?php include('footer.inc'); ?>
        </div>

        <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/video/videotest.js"></script> 
    </body>
</html>
