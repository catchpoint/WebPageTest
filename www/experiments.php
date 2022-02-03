<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/optimization_detail.inc.php';
require_once __DIR__ . '/breakdown.inc';
require_once __DIR__ . '/testStatus.inc';
require_once __DIR__ . '/common.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestResults.php';
require_once __DIR__ . '/include/RunResultHtmlTable.php';
require_once __DIR__ . '/include/TestResultsHtmlTables.php';

$breakdown = array();
$testComplete = true;
$status = GetTestStatus($id, false);
if( $status['statusCode'] < 200 )
    $testComplete = false;
$headless = false;
if (GetSetting('headless')) {
    $headless = true;
}

$testInfo = TestInfo::fromFiles($testPath);
$testResults = TestResults::fromFiles($testInfo);





$page_keywords = array('Results','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Website performance test result$testLabel.";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title><?php echo "$page_title - WebPageTest Result"; ?></title>
        <script>document.documentElement.classList.add('has-js');</script>
        <style type="text/css">
            tr.stepResultRow.jkActive td.resultCell {
                border-left: 2px #181741 solid;
            }
            td.separation {
                height: 2em;
            }
        </style>
        <?php if( !$testComplete ) {
                $autoRefresh = true;
        ?>
        <noscript>
        <meta http-equiv="refresh" content="30" />
        </noscript>
        <?php } ?>
        <?php $gaTemplate = 'Test Result'; include ('head.inc'); ?>
    </head>
    <body class="result">
            <?php
            $tab = 'Test Result';
            $subtab = 'Opportunities & Experiments';
            include 'header.inc';
            ?>


            <div class="results_main_contain">
            <div class="results_main">

            <div id="result">
            <?php
            if( !$testComplete )
            {
                ?>
                <p class="left">
                <br>
                <?php
                    if (GetSetting('nolinks')) {
                        echo "URL: $url<br>\n";
                    } else {
                        echo "URL: <a rel=\"nofollow\" href=\"$url\">$url</a><br>\n";
                    }
                    echo "From: {$test['test']['location']}<br>\n";
                    echo GetTestInfoHtml();
                ?>
                </p>
                <?php
                $expected = $test['test']['runs'];
                $available = $testResults->countRuns();
                echo "<h3>Test is partially complete ($available of $expected tests).<br>This page will refresh as tests complete.</h3>";
                echo "<script>\n";
                echo "var availableTests=$available;\n";
                echo "</script>\n";
            }
            else
            {
            ?>
            
            
            <div id="average">

            <div class="results_and_command">
                <div class="results_header results_header-experiments">
                    <h2>Opportunities &amp; Experiments <em class="flag">New</em></h2>
                    <p>With <strong>Experiments</strong>, WebPageTest identifies opportunities for improvements that you can test without changing your actual code. Experiments help you quickly test the impact of a change by re-running your test in a similated test environment.</p>
                </div>

                <?php include("testinfo_command-bar.inc"); ?>
            </div>


                <?php
                    if( !$headless && gz_is_file("$testPath/testinfo.json")
                    && !array_key_exists('published', $test['testinfo'])
                    && ($isOwner || !$test['testinfo']['sensitive'])
                    && (!isset($test['testinfo']['type']) || !strlen($test['testinfo']['type'])) )
                {
                    // load the secret key (if there is one)
                    $secret = GetServerSecret();
                    if (!isset($secret))
                        $secret = '';

                        echo "<form class='experiments_grades' name='urlEntry' id='urlEntry' action='/runtest.php?test=$id' method='POST' enctype='multipart/form-data'>";
                        echo "\n<input type=\"hidden\" name=\"resubmit\" value=\"$id\">\n";
                        echo '<input type="hidden" name="vo" value="' . htmlspecialchars($owner) . "\">\n";
                        if( strlen($secret) ){
                          $hashStr = $secret;
                          $hashStr .= $_SERVER['HTTP_USER_AGENT'];
                          $hashStr .= $owner;

                          $now = gmdate('c');
                          echo "<input type=\"hidden\" name=\"vd\" value=\"$now\">\n";
                          $hashStr .= $now;

                          $hmac = sha1($hashStr);
                          echo "<input type=\"hidden\" name=\"vh\" value=\"$hmac\">\n";
                        }
                    ?>

                
                <div class="grade_header">
                    <h3 class="grade_heading grade-a">Quick: <span>8/10</span></h3>
                    <p class="grade_summary"><strong>Great work!</strong> This page connects to the server quickly and begins rendering visually soon after initial delivery. Large content renders soon as well. But you can always make improvements...</p>
                </div>


                <?php 

                    echo '<div class="experiments_bottlenecks">
                     <p>Relevant Bottlenecks...</p><ol>';

                    



                
                function observationHTML( $bottleneckTitle, $bottleneckDesc, $bottleneckExamples, $relevantExperiments ){
                    $out = '';
                    
                    
                    // todo move this summary heading broader for all recs
                    $out .= "<li><details open><summary>$bottleneckTitle</summary>";
                    $out .= "<div class=\"experiments_details_body\">";
                    
                    $out .= "<div class=\"experiments_details_desc\">";
                    $out .= "<p>$bottleneckDesc</p>";
                    if( count($bottleneckExamples) > 0 ){
                        $out .= "<ol>";
                        foreach( $bottleneckExamples as $ex ) {
                            $out .= "<li><code>$ex</code></li>";
                        }
                        $out .= "</ol>";
                    }
                    $out .= "</div>";

                    if( count($relevantExperiments) > 0 ){
                        $out .= "<h4 class=\"experiments_list_hed\">Relevant Experiments</h4><ul class=\"experiments_list\">";

                        foreach( $relevantExperiments as $exp ) {
                            $out .= <<<EOT
                                <li class="experiment_description">
                                <div class="experiment_description_text">
                                <h5>{$exp->title}</h5>
                                <p>{$exp->desc}</p>
                                </div>
                                <div class="experiment_description_go">
                                EOT;

                            if( $exp->expval ){
                                $out .= <<<EOT
                                <label><input type="checkbox" name="recipes[]" value="{$exp->expvar}">Run This Experiment!</label>
                                <input type="hidden" name="{$exp->expvar}" value="{$exp->expval}">
                                EOT;
                            }
                            else {
                                $out .= <<<EOT
                                <label><input type="checkbox" name="{$exp->expvar}">Run This Experiment!</label>
                                EOT;
                            }
                            
                            $out .= '</div></li>';
                                
                        }
                    }

                    $out .= '<ul></div></details></li>';
                    return $out;
                }

                    $testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
                    $requests = $testStepResult->getRequests();






                    



                
                    // OPPORTUNITY: Slow TTFB
                    // if TTFB is extra slow (all runs had a ttfb greater than thresold below), then perhaps a site/cdn is purposefully slowing responsse times for bots.
                    // Show a message that offers an option to re-run the tests with a default UA
                    $slowttfbThreshold = 1000;
                    $firstByteTimes = $testResults->getMetricFromRuns("TTFB", false, false );
                    if ( count( $firstByteTimes ) > 0 && min( $firstByteTimes ) > $slowttfbThreshold ) { 
                        
                        echo observationHTML(
                            'This test had an unusually-high first-byte time.',
                            "First byte timing relates to server work. This may not be a problem with your site, but instead with how your site recognizes bots like WebPageTest. This is because some networks and sites intentionally slow performance for bots like the WebPageTest agent. If you suspect this is happening, you can try re-running your test with the browser's original User Agent string to see if it helps.",
                            array(),
                            array(
                                (object) [
                                    'title' => ' Check for accuracy! Preserve original User Agent string in re-run',
                                    "desc" => 'This experiment will remove the WPT-modified User Agent string and use the default string that the browser would otherwise send.',
                                    "expvar" => 'keepua'
                                ],
                                
                                (object) [
                                        'title' => 'Use a CDN',
                                        "desc" => 'All WPT experiments run over a CDN, but we preserve your original TTFB by default to demonstrate non-CDN improvements. This experiment will override that and show how your TTFB will change when hosted on a worldwide CDN.',
                                        "expvar" => 'ShowCDNTiming'
                                      ]
                                )
                        );
                    }
               
                    // OPPORTUNITY: RENDER BLOCKING SCRIPTS
                    
                    $blockingJSReqs = array();
                    foreach ($requests as $request) {
                        if( $request['renderBlocking'] === "blocking" && $request['contentType'] === "application/javascript" ){
                            array_push($blockingJSReqs, $request['url'] );
                        }
                    }

                    

                    if( count($blockingJSReqs) > 0 ){
                        echo observationHTML(
                            count($blockingJSReqs) . " externally-referenced JavaScript file". (count($blockingJSReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
                            "By default, references to external JavaScript files will block the page from rendering while they are fetched and executed. Often, these files can be loaded in a different manner, freeing up the page to visually render sooner.",
                            $blockingJSReqs,
                            array(
                                (object) [
                                    'title' => 'Defer all render-blocking scripts.',
                                    "desc" => 'This experiment will add a defer attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Deferred scripts still execute in the order they are defined in source. <a href="#">More about resource hints on MDN</a>',
                                    "expvar" => 'deferjs',
                                    "expval" => implode(",", $blockingJSReqs)
                                  ]
                            )
                        );
                    }

                    $blockingCSSReqs = array();
                    foreach ($requests as $request) {
                        if( $request['renderBlocking'] === "blocking"  && strpos($request['url'], "font") === false && $request['contentType'] === "text/css" ){
                            array_push($blockingCSSReqs, $request['url'] );
                        }
                    }

                    if( count($blockingCSSReqs) > 0 ){
                      echo observationHTML(
                          count($blockingCSSReqs) . " externally-referenced CSS file". (count($blockingCSSReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
                          "By default, references to external CSS files will block the page from rendering while they are fetched and executed. Sometimes these files should block rendering, but can be inlined to avoid additional round-trips while the page is waiting to render.",
                          $blockingCSSReqs,
                          array(
                              (object) [
                                  'title' => 'Inline external stylesheets.',
                                  "desc" => 'This experiment will embed the contents of external stylesheets directly into the HTML within a <code>style</code> element. This increases the size of the HTML, but can often allow page page to display sooner by avoiding server round trips.',
                                  "expvar" => 'inline',
                                  "expval" => implode(",", $blockingCSSReqs)
                                ]
                          )
                      );
                  }



                  $blockingFontCSSReqs = array();
                    foreach ($requests as $request) {
                        if( $request['renderBlocking'] === "blocking" && strpos($request['url'], "font") !== false && $request['contentType'] === "text/css" ){
                            array_push($blockingFontCSSReqs, $request['url'] );
                        }
                    }

                    if( count($blockingFontCSSReqs) > 0 ){
                      echo observationHTML(
                          count($blockingFontCSSReqs) . " external font CSS file". (count($blockingFontCSSReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
                          "By default, references to external CSS files will block the page from rendering while they are fetched and executed. CSS files that are purely for loading fonts can often be loaded asynchronously to allow the page content to render sooner.",
                          $blockingFontCSSReqs,
                          array(
                            // (object) [
                            //     'title' => 'Inline font stylesheets.',
                            //     "desc" => 'This experiment will embed the contents of external stylesheets directly into the HTML within a <code>style</code> element. This can allow the fonts to be loaded in fewer network steps.',
                            //     "expvar" => 'inline',
                            //     "expval" => implode(",", $blockingFontCSSReqs)
                            //   ]
                            // ,
                              (object) [
                                  'title' => 'Load Font CSS files asynchronously.',
                                  "desc" => 'This experiment will load these stylesheets in a way that allows the page to begin rendering while they are still loading. Fonts will appear when they arrive.',
                                  "expvar" => 'asynccss',
                                  "expval" => implode(",", $blockingFontCSSReqs)
                                ]
                          )
                      );
                  }



                  include(__DIR__ . '/experiments/lcp.inc');
                  







                    echo '</ol></div>';


                    
                    


                       $recipes = array();

                       
                       /* TODO offer these for customizing experiments ideally
                       array_push($recipes, (object) [
                            'value' => 'deferjs',
                            'label' => 'Defer Blocking Scripts',
                            'required' => false,
                            'hint' => 'site.js,site2.js'
                          ]);
                          */

                        // array_push($recipes, (object) [
                        //     'value' => 'asyncjs',
                        //     'label' => 'Async Blocking Scripts',
                        //     'required' => false,
                        //     'hint' => 'site.js,site2.js'
                        //   ]);

                        // array_push($recipes, (object) [
                        //     'value' => 'asynccss',
                        //     'label' => 'Load Stylesheets Async',
                        //     'required' => false,
                        //     'hint' => 'site.css,site2.css'
                        //   ]);
                        // array_push($recipes, (object) [
                        //     'value' => 'imageaspectratio',
                        //     'label' => 'Add image aspect ratios',
                        //     'required' => true,
                        //     'hint' => 'foo.jpg|w500|h600,bar.jpg|w400|h900,baz.jpg|w300|h800'
                        //   ]);

                        // array_push($recipes, (object) [
                        //     'value' => 'inline',
                        //     'label' => 'Inline external JS or CSS',
                        //     'required' => true,
                        //     'hint' => 'site.css,site2.js'
                        //   ]);
                        // array_push($recipes, (object) [
                        //     'value' => 'preload',
                        //     'label' => 'Preload files',
                        //     'required' => true,
                        //     'hint' => 'https://www.webpagetest.org,site.css,site.js'
                        //   ]);

                        // array_push($recipes, (object) [
                        //     'value' => 'removepreload',
                        //     'label' => 'Remove preloads for files',
                        //     'required' => true,
                        //     'hint' => 'https://www.webpagetest.org,site.css,site.js'
                        //   ]);

                        // array_push($recipes, (object) [
                        //     'value' => 'preconnect',
                        //     'label' => 'Preconnect domains',
                        //     'required' => true,
                        //     'hint' => 'https://www.webpagetest.org,site.css,site.js'
                        //   ]);

                        // array_push($recipes, (object) [
                        //     'value' => 'addloadinglazy',
                        //     'label' => 'Add loading=lazy to images',
                        //     'required' => true,
                        //     'hint' => 'myimage.jpg,myimage2.jpg'
                        //   ]);

                        // array_push($recipes, (object) [
                        //     'value' => 'removeloadinglazy',
                        //     'label' => 'Remove loading=lazy from images',
                        //     'required' => true,
                        //     'hint' => 'myimage.jpg,myimage2.jpg'
                        //   ]);

                        // array_push($recipes, (object) [
                        //     'value' => 'minifycss',
                        //     'label' => 'Minify all CSS',
                        //     'required' => false,
                        //     'hint' => 'no value necessary'
                        //   ]);

                        // array_push($recipes, (object) [
                        //     'value' => 'addimportance',
                        //     'label' => 'add importance=high or low to an image script or link by url',
                        //     'required' => true,
                        //     'hint' => 'foo.jpg|i_high,baz.js|i_low'
                        //   ]);

                        // array_push($recipes, (object) [
                        //     'value' => 'removeimportance',
                        //     'label' => 'remove importance attribute on an image script or link by url',
                        //     'required' => true,
                        //     'hint' => 'foo.jpg,baz.js'
                        //   ]);


                       





                        // echo '<h3>Manual Experiments</h3>';

                        //     foreach( $recipes as $recipe ) {
                        //         echo <<<EOT
                        //           <div style="border-bottom: 1px solid #ddd; padding: 1em 0 1em;">
                        //             <label style="display:block;margin-bottom: .5em;"><input type="checkbox" name="recipes[]" value="{$recipe->value}"> {$recipe->label}</label>
                        //             <label>Instructions: <small >Example: {$recipe->hint}</small> <input style="margin-top: .5em; display: block;" type="text" name="{$recipe->value}" value="" placeholder=""></label>
                        //           </div>
                        //         EOT;
                        //     }

                        ?>

                <div class="grade_header">
                    <h3 class="grade_heading grade-c">Usable: <span>6/10</span></h3>
                    <p class="grade_summary"><strong>Not bad!</strong> Users can begin interacting with this page after a short delay. Readability is average. Touch-friendliness is average.</p>
                </div>

                <div class="experiments_bottlenecks">
                        <p>Relevant Bottlenecks...</p><ol>
                        <?php
                        // print_r($testStepResult->getMetric('chromeUserTiming.CumulativeLayoutShift'));
                        // print_r($testStepResult->getMetric('chromeUserTiming.LargestContentfulPaint'));


                            // $cls = $testStepResult->getMetric('chromeUserTiming.CumulativeLayoutShift');
                            // $cls = round($cls, 3);
                                
                            // $echo = $cls;

                            // if( count($blockingJSReqs) > 0 ){
                            //     echo observationHTML(
                            //         count($blockingJSReqs) . " externally-referenced JavaScript file". (count($blockingJSReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
                            //         "By default, references to external JavaScript files will block the page from rendering while they are fetched and executed. Often, these files can be loaded in a different manner, freeing up the page to visually render sooner.",
                            //         $blockingJSReqs,
                            //         array(
                            //             (object) [
                            //                 'title' => 'Defer all render-blocking scripts.',
                            //                 "desc" => 'This experiment will add a defer attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Deferred scripts still execute in the order they are defined in source. <a href="#">More about resource hints on MDN</a>',
                            //                 "expvar" => 'deferjs',
                            //                 "expval" => implode(",", $blockingJSReqs)
                            //               ]
                            //         )
                            //     );
                            // }

                        ?>
                        </ol>
                </div>


                <div class="grade_header">
                    <h3 class="grade_heading grade-f">Resilient: <span>4/10</span></h3>
                    <p class="grade_summary"><strong>Needs Improvement!</strong> This page contains several render-blocking CSS and JavaScript requests and contains critical content that is generated client-side with JavaScript. </p>
                </div>
                <div class="experiments_bottlenecks">
                        <p>Relevant Opportunities...</p>
                        <p>TBD...</p>
                </div>

                        <?php

                            echo '<div class="experiments_foot"><p>Ready to go?</p>';
                            
                            echo '<input type="submit" value="Re-Run Test with Experiments">';
                            echo "\n</div></form>\n";
                    }
                    ?>

              
              <?php } ?>

            <?php include('footer.inc'); ?>
        </div>
        </div>
        </div>
        <script type="text/javascript" src="/js/jk-navigation.js"></script>
        <script type="text/javascript">
            addJKNavigation("tr.stepResultRow");
        </script>
        
        <?php
        $breakdown = $resultTables->getBreakdown();
        if ($breakdown) {
        ?>
          <script type="text/javascript" src="//www.google.com/jsapi"></script>
         
        <?php
        } // $breakdown

        if( !$testComplete ) {
            echo "<script type=\"text/javascript\">\n";
            echo "var testId = '$id';\n";
        ?>
            // polyfill performance.now
            if ("performance" in window == false) {
                window.performance = {};
            }
            Date.now = (Date.now || function () {  // thanks IE8
              return new Date().getTime();
            });
            if ("now" in window.performance == false){
              var nowOffset = Date.now();
              if (performance.timing && performance.timing.navigationStart){
                nowOffset = performance.timing.navigationStart
              }
              window.performance.now = function now(){
                return Date.now() - nowOffset;
              }
            }
            var lastUpdate = window.performance.now();
            function UpdateStatus(){
                var now = window.performance.now();
                var elapsed = now - lastUpdate;
                lastUpdate = now;
                if (elapsed < 0 || elapsed > 10000) {
                  try {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', '/testStatus.php?f=json&pos=1&test=' + testId, true);
                    xhr.onreadystatechange = function() {
                      if (xhr.readyState != 4)
                        return;
                      var reload = false;
                      if (xhr.status == 200) {
                          var response = JSON.parse(xhr.responseText);
                          if (response['statusCode'] != undefined) {
                              if (response['statusCode'] == 100) {
                                  if (response['data'] != undefined &&
                                      availableTests != undefined &&
                                      response.data['testsCompleted'] != undefined &&
                                      response.data['testsCompleted'] > availableTests)
                                      reload = true;
                              } else
                                  reload = true;
                          }
                      }
                      if (reload) {
                          window.location.reload(true);
                      } else {
                          setTimeout('UpdateStatus()', 15000);
                      }
                    };
                    xhr.onerror = function() {
                      setTimeout('UpdateStatus()', 15000);
                    };
                    xhr.send();
                  } catch (err) {
                      setTimeout('UpdateStatus()', 15000);
                  }
                } else {
                  setTimeout('UpdateStatus()', 15000);
                }
            }
            setTimeout('UpdateStatus()', 15000);
          </script>
        <?php
        }
        ?>
    </body>
</html>
