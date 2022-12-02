@extends('default')

@section('content')



<?php 

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

// TODO: use these in the template
// $page_keywords = array('Timeline Breakdown','WebPageTest','Website Speed Test','Page Speed');
// $page_description = "Chrome main-thread processing breakdown$testLabel";
use Illuminate\Support\Str;

function md($in){
  return Str::of($in)->markdown();
}


if (isset($testPath) && is_dir($testPath)) {
    $file = "lighthouse.json.gz";
    $filePath = "$testPath/$file";
    if (is_file($filePath)) {
        
        $lhResults = gz_file_get_contents($filePath);
        $lhResults = json_decode($lhResults);

        
        // get a grade from a category score
        function gradeFromScore($score){
            $grade = "a";
            if( $score < 90 ){
                $grade = "c";
            }
            if( $score < 50 ){
                $grade = "f";
            }
            return $grade;
        }

        function formatScore($score){
            return round($score * 100);
        }

        function scoreMarkup( $title, $score, $element, $classattr = '' ){
            $score = formatScore($score);
            $grade = gradeFromScore($score);
            if( $element === 'a'){
                $element .= ' href="#' . $title .'"';
            }
            return '<'.$element .' class="lh_score lh_score_grade-'. $grade .' ' .$classattr .'"><span class="lh_score_cat">'. $title . '</span> <span class="lh_score_number"><svg class="lh-gauge" viewBox="0 0 120 120"> <circle class="lh-gauge-base" r="56" cx="60" cy="60" stroke-width="8"></circle> <circle class="lh-gauge-arc" r="56" cx="60" cy="60" stroke-width="8" style="transform: rotate(-87.9537deg); stroke-dasharray: 281.005, 351.858;"></circle> </svg>'. $score .'</span></'.$element.'>';
        }

        function formatAuditDetails($deets){
           
            //$ret = json_encode($deets);
            $ret = '';
            if( $deets->type === "opportunity" ){
                if( $deets->headings ){
                    // $ret .= '<table class="pretty"><tr>';
                    // foreach( $deets->headings as $heading){
                    //     $ret .= '<th>' . $heading->label . '</th>';
                    // }
                    // $ret .= '</tr></table>';
                    $ret .= '<table class="lh-table lh-details pretty"><thead><tr><th class="lh-table-column--text"><div class="lh-text">Example Col</div></th><th class="lh-table-column--numeric"><div class="lh-text">Example Col</div></th><th class="lh-table-column--bytes"><div class="lh-text">Example Col</div></th></tr></thead><tbody><tr class="lh-row--even"><td class="lh-table-column--text"><div class="lh-text">Total</div></td><td class="lh-table-column--numeric"><div class="lh-numeric">38</div></td><td class="lh-table-column--bytes"><div class="lh-text" title="1,761,739&nbsp;bytes">1,720.4&nbsp;KiB</div></td></tr><tr class="lh-row--odd"><td class="lh-table-column--text"><div class="lh-text">Script</div></td><td class="lh-table-column--numeric"><div class="lh-numeric">11</div></td><td class="lh-table-column--bytes"><div class="lh-text" title="826,914&nbsp;bytes">807.5&nbsp;KiB</div></td></tr><tr class="lh-row--even"><td class="lh-table-column--text"><div class="lh-text">Other</div></td><td class="lh-table-column--numeric"><div class="lh-numeric">11</div></td><td class="lh-table-column--bytes"><div class="lh-text" title="607,994&nbsp;bytes">593.7&nbsp;KiB</div></td></tr><tr class="lh-row--odd"><td class="lh-table-column--text"><div class="lh-text">Document</div></td><td class="lh-table-column--numeric"><div class="lh-numeric">2</div></td><td class="lh-table-column--bytes"><div class="lh-text" title="178,986&nbsp;bytes">174.8&nbsp;KiB</div></td></tr><tr class="lh-row--even"><td class="lh-table-column--text"><div class="lh-text">Image</div></td><td class="lh-table-column--numeric"><div class="lh-numeric">10</div></td><td class="lh-table-column--bytes"><div class="lh-text" title="115,876&nbsp;bytes">113.2&nbsp;KiB</div></td></tr><tr class="lh-row--odd"><td class="lh-table-column--text"><div class="lh-text">Font</div></td><td class="lh-table-column--numeric"><div class="lh-numeric">2</div></td><td class="lh-table-column--bytes"><div class="lh-text" title="29,913&nbsp;bytes">29.2&nbsp;KiB</div></td></tr><tr class="lh-row--even"><td class="lh-table-column--text"><div class="lh-text">Stylesheet</div></td><td class="lh-table-column--numeric"><div class="lh-numeric">2</div></td><td class="lh-table-column--bytes"><div class="lh-text" title="2,056&nbsp;bytes">2.0&nbsp;KiB</div></td></tr><tr class="lh-row--odd"><td class="lh-table-column--text"><div class="lh-text">Media</div></td><td class="lh-table-column--numeric"><div class="lh-numeric">0</div></td><td class="lh-table-column--bytes"><div class="lh-text" title="0&nbsp;bytes">0.0&nbsp;KiB</div></td></tr><tr class="lh-row--even"><td class="lh-table-column--text"><div class="lh-text">Third-party</div></td><td class="lh-table-column--numeric"><div class="lh-numeric">24</div></td><td class="lh-table-column--bytes"><div class="lh-text" title="937,473&nbsp;bytes">915.5&nbsp;KiB</div></td></tr></tbody></table>';
                    $ret .= '<p class="lh-chain_hed"><strong>Maximum critical path latency: 3,920 ms</strong></p>
                    <ol class="lh-chain">
                        <li>Initial Navigation
                            <ol>
                                <li><a href="..">/flights</a> <em>(www.google.com)</em>
                                    <ol>
                                    <li><a href="..">…v14/4UabrENHs….woff2</a> <em>(fonts.gstatic.com) - 1,310 ms, 14.98 KiB</em></li>
                                    <li><a href="..">…v14/4UabrENHs….woff2</a> <em>(fonts.gstatic.com) - 1,310 ms, 14.98 KiB</em></li>
                                    <li><a href="..">…v14/4UabrENHs….woff2</a> <em>(fonts.gstatic.com) - 1,310 ms, 14.98 KiB</em></li>
                                    <li><a href="..">…v14/4UabrENHs….woff2</a> <em>(fonts.gstatic.com) - 1,310 ms, 14.98 KiB</em></li>
                                    </ol>
                                </li>
                            </ol>
                        </li>
                    </ol>';
                    foreach( $deets->items as $item){
                        if( $item->node){
                            //$ret .= '<td>' . $item->node-> . '</d>';
                        }
                    }
                    //$ret .= '</tr>';
                }
            }
            return $ret;
        }

        $metrics = array(
            'first-contentful-paint',
            'speed-index',
            'largest-contentful-paint',
            'interactive',
            'total-blocking-time',
            'cumulative-layout-shift'
        );

        function getCategoryAudits( $category, $results ){
            $ret = '';
            $metrics = array(
                'all',
                'fcp',
                'lcp',
                'tbt',
                'cls'
            );
            if( $category->title === "Performance"){
                $ret .= metricsTable($results);
                $ret .= '<div class="lh-filter_map"><a href="#" class="lh-maplink">View Tree Map</a>';
                $activeMetric = $_REQUEST['filterby'];
                $ret .= '<p class="lh-filteraudits">Show audits relevant to metrics:';
                    foreach($metrics as $metric){
                        $attr = '';
                        if( !isset($activeMetric) && $metric === 'all' || $activeMetric && $activeMetric === $metric ){
                            $attr = ' aria-current="page"';
                        }
                        $ret .= '<a href="&filterby='.$metric.'"'. $attr .'>'.$metric.'</a>';
                    }
                    $ret .= '</p></div>';
            }

            $opportunities = array();
            $diagnostics = array();
            $auditsPassed = array();
            foreach( $category->auditRefs as $key => $auditRef ){
                $relevantAudit = $results->audits->{$auditRef->id};
                $auditHasDetails = isset($relevantAudit->details);
                $passed = false;
                $score = $relevantAudit->score;
                $scoreMode = $relevantAudit->scoreDisplayMode;
                if( $score !== null && ($scoreMode === "binary" && $score === 1 ||  $scoreMode === "numeric" && $score === 1) ){
                    $passed = true;
                }

                if( $passed ) {
                    array_push($auditsPassed, $relevantAudit );
                } else if( $auditHasDetails && $scoreMode !== "error" && $scoreMode !== "notApplicable" ){
                    if( $relevantAudit->details->type === "opportunity" ){
                        array_push($opportunities, $relevantAudit );
                    } else {
                        array_push($diagnostics, $relevantAudit );
                    }
                }
            }
            $opportunities = array_unique($opportunities, SORT_REGULAR);
            $diagnostics = array_unique($diagnostics, SORT_REGULAR);
            $auditsPassed = array_unique($auditsPassed, SORT_REGULAR);
            $oppsCount = sizeof($opportunities);
            $diagsCount = sizeof($diagnostics);
            $passedCount = sizeof($auditsPassed);
            if($oppsCount){
                $ret .= '<h4>Opportunities ('.$oppsCount.')</h4><ol>';
                foreach($opportunities as $audit){
                    $ret .= '<li class="experiments_details-bad lh_audit_mode-'. $audit->scoreDisplayMode .'"><details open><summary>' . md($audit->title);
                    if( isset($audit->displayValue) ){
                        $ret .= '<em>'. md($audit->displayValue) .'</em>';
                    }
                    $ret .= '</summary>
                    <div class="experiments_details_body"><div class="experiments_details_desc">
                    <p>'. md($audit->description) .'</p>
                    <p class="lh-relevantmetrics"><strong>Relevant metrics:</strong> <span class="lh-relevantmetric">LCP</span><span class="lh-relevantmetric">FCP</span></p>';
                    
                    if( isset($audit->details) && isset($audit->details->items) && sizeof($audit->details->items) ){
                        
                        $ret .= formatAuditDetails($audit->details);
                        
                    }

                    $ret .= '</div></details>';
                }
                $ret .= '</ol>';
            }
            if($diagsCount){
                $ret .= '<h4>Diagnostics ('.$diagsCount.')</h4><ol>';
                foreach($diagnostics as $audit){
                
                    $ret .= '<li class="experiments_details-bad lh_audit_mode-'. $audit->scoreDisplayMode .'"><details open><summary>' . md($audit->title) . '</summary>
                    <div class="experiments_details_body"><div class="experiments_details_desc">
                    <p>'. md($audit->description) .'</p>
                   
                    </div></details>';
                }
                $ret .= '</ol>';
            }
            if($passedCount){
                $ret .= '<h4>Passed Audits ('.$passedCount.')</h4><ol>';
                foreach($auditsPassed as $audit){
                    
                    $ret .= '<li class="experiments_details-good lh_audit_mode-'. $audit->scoreDisplayMode .'"><details><summary>' . md($audit->title) . '</summary>
                    <div class="experiments_details_body"><div class="experiments_details_desc">
                    <p>'. md($audit->description) .'</p>
                    </div></details>';
                }
                $ret .= '</ol>';
            }
            return $ret;
        }

        function metricsTable($results){
            $metrics = array(
                'first-contentful-paint',
                'speed-index',
                'largest-contentful-paint',
                'interactive',
                'total-blocking-time',
                'cumulative-layout-shift'
            );

            $metricsTable = '
            <h4 class="hed_sub hed_sub-lighthouse">Lighthouse Metrics</h4>
            <details class="metrics_shown">
                <summary>Values are estimated and may vary.</summary>
                <p><span>Values are estimated and may vary. The <a rel="noopener" target="_blank" href="https://web.dev/performance-scoring/?utm_source=lighthouse&amp;utm_medium=wpt">performance score is calculated</a> directly from these metrics.</span>
                <a class="lh-calclink" target="_blank" href="https://googlechrome.github.io/lighthouse/scorecalc/">See calculator.</a></p>
            </details>
            <div class="scrollableTable">
                <table id="tableResults" class="pretty">
                    <tbody>
                        <tr class="metric_labels">';
                        foreach($metrics as $metric){
                            $metricsTable .= '<th>'. $results->audits->{$metric}->title .'</th>';
                        }

            $metricsTable .= '
                        </tr>
                        <tr>';
                        foreach($metrics as $metric){
                            $thisMetric = $results->audits->{$metric};
                           // $metricSplit = explode('&nbsp;', $thisMetric->displayValue);
                            $metricSplit = preg_split("@[\s+　]@u", trim($thisMetric->displayValue));
                            $metricNumber = $metricSplit[0];
                            $grade = '';
                            if( $thisMetric->score ){
                                $grade = "good";
                                if( $thisMetric->score < 0.9 ){
                                    $grade = "ok";
                                } else if( $thisMetric->score < 0.5 ){
                                    $grade = "poor";
                                }
                            }
                            $metricUnits = isset($metricSplit[1]) ? '<span class="units">'.$metricSplit[1].'</span>' : '';
                            $metricsTable .= '<td class="'. $grade .'">'. $metricNumber . $metricUnits .'</td>';
                        }

            $metricsTable .= '
                        </tr>
                    </tbody>
                </table>
            </div>';
            return $metricsTable;
        }
        
               
    }
}

?>
<div class="results_main_contain">
    <div class="results_main results_main-lh">
       <div class="results_and_command">
          <div class="results_header">
             <h2 class="lh-logo"><svg class="lh-topbar__logo" viewBox="0 0 24 24"> <defs> <linearGradient x1="57.456%" y1="13.086%" x2="18.259%" y2="72.322%" id="lh-topbar__logo--a"> <stop stop-color="#262626" stop-opacity=".1" offset="0%"></stop> <stop stop-color="#262626" stop-opacity="0" offset="100%"></stop> </linearGradient> <linearGradient x1="100%" y1="50%" x2="0%" y2="50%" id="lh-topbar__logo--b"> <stop stop-color="#262626" stop-opacity=".1" offset="0%"></stop> <stop stop-color="#262626" stop-opacity="0" offset="100%"></stop> </linearGradient> <linearGradient x1="58.764%" y1="65.756%" x2="36.939%" y2="50.14%" id="lh-topbar__logo--c"> <stop stop-color="#262626" stop-opacity=".1" offset="0%"></stop> <stop stop-color="#262626" stop-opacity="0" offset="100%"></stop> </linearGradient> <linearGradient x1="41.635%" y1="20.358%" x2="72.863%" y2="85.424%" id="lh-topbar__logo--d"> <stop stop-color="#FFF" stop-opacity=".1" offset="0%"></stop> <stop stop-color="#FFF" stop-opacity="0" offset="100%"></stop> </linearGradient> </defs> <g fill="none" fill-rule="evenodd"> <path d="M12 3l4.125 2.625v3.75H18v2.25h-1.688l1.5 9.375H6.188l1.5-9.375H6v-2.25h1.875V5.648L12 3zm2.201 9.938L9.54 14.633 9 18.028l5.625-2.062-.424-3.028zM12.005 5.67l-1.88 1.207v2.498h3.75V6.86l-1.87-1.19z" fill="#F44B21"></path> <path fill="#FFF" d="M14.201 12.938L9.54 14.633 9 18.028l5.625-2.062z"></path> <path d="M6 18c-2.042 0-3.95-.01-5.813 0l1.5-9.375h4.326L6 18z" fill="url(#lh-topbar__logo--a)" fill-rule="nonzero" transform="translate(6 3)"></path> <path fill="#FFF176" fill-rule="nonzero" d="M13.875 9.375v-2.56l-1.87-1.19-1.88 1.207v2.543z"></path> <path fill="url(#lh-topbar__logo--b)" fill-rule="nonzero" d="M0 6.375h6v2.25H0z" transform="translate(6 3)"></path> <path fill="url(#lh-topbar__logo--c)" fill-rule="nonzero" d="M6 6.375H1.875v-3.75L6 0z" transform="translate(6 3)"></path> <path fill="url(#lh-topbar__logo--d)" fill-rule="nonzero" d="M6 0l4.125 2.625v3.75H12v2.25h-1.688l1.5 9.375H.188l1.5-9.375H0v-2.25h1.875V2.648z" transform="translate(6 3)"></path> </g> </svg>Lighthouse Report</h2>
             <p>WebPageTest offers Lighthouse test runs alongside its suite of tools. Lighthouse is an open-source, automated tool for improving the quality of web pages. You can run it against any web page, public or requiring authentication. It has audits for performance, accessibility, progressive web apps, SEO and more.</p>
        </div>
          <div class="opportunities_summary">
            <?php
                    // write jump nav
                    echo '<ul class="results_lh_nav">';
                        foreach ($lhResults->categories as $category) {
                            echo '<li>'. scoreMarkup($category->title, $category->score, "a") .'</li>';
                        }
                    echo '</ul>';
                ?>
          </div>
       </div>
       <div id="result" class="experiments_grades results_body">
       <div id="average">
       <div class='experiments_grades results_body'>
            <div class="form_clip">

       <?php


            // write out the observations HTML
            foreach ($lhResults->categories as $category) {
                $title = $category->title;
                echo <<<EOT
                <div class="grade_header grade_header-lighthouse" id="${title}">
                EOT;
                echo scoreMarkup($title, $category->score, 'h3', 'grade_heading');
                echo <<<EOT
                </div>
                <div class="experiments_bottlenecks">
                EOT;
                    echo getCategoryAudits($category,$lhResults);
                echo <<<EOT
                </div>         
                EOT;                
            }

            ?>
            </div>
        </div>
        </div>
          
       </div>
    </div>
 </div>


@endsection
