<?php
require_once __DIR__ . '/page_data.inc';
require_once __DIR__ . '/object_detail.inc';
require_once __DIR__ . '/include/TestRunResults.php';

/**
 * Parse the page data and load the optimization-specific details for one step
 *
 * @param TestInfo $testInfo Test information
 * @param TestStepResult $testStepResult Results of the step to get the grades for
 * @return array|null An array with all labels, scores, grades, weights, etc per score
 */
function getOptimizationGradesForStep($testInfo, $testStepResult) {
  // The function getOptimizationGradesForRun is more powerful as it can compute averages.
  // With one step, it will do exactly what we want, so we create an artificial run
  $singlestepRunResult = TestRunResults::fromStepResults($testInfo, $testStepResult->getRunNumber(),
    $testStepResult->isCachedRun(), array($testStepResult));
  return getOptimizationGradesForRun($singlestepRunResult);
}

/**
 * Parse the page data and load the optimization-specific details for a complete run
 *
 * @param TestRunResults $testRunResults Results of the run to get the grades for
 * @return array|null An array with all labels, scores, grades, weights, etc per score
 */
function getOptimizationGradesForRun($testRunResults)
{
  if (!isset($testRunResults)) {
    return null;
  }
  $scores = array();

  $scores['keep-alive'] = $testRunResults->averageMetric('score_keep-alive');
  $scores['gzip'] = $testRunResults->averageMetric('score_gzip');
  $scores['image_compression'] = $testRunResults->averageMetric('score_compress');
  $scores['caching'] = $testRunResults->averageMetric('score_cache');
  $scores['combine'] = $testRunResults->averageMetric('score_combine');
  $scores['cdn'] = $testRunResults->averageMetric('score_cdn');
  $scores['cookies'] = $testRunResults->averageMetric('score_cookies');
  $scores['minify'] = $testRunResults->averageMetric('score_minify');
  $scores['e-tags'] = $testRunResults->averageMetric('score_etags');
  $scores['progressive_jpeg'] = $testRunResults->averageMetric('score_progressive_jpeg');

  $numTTFBScores = 0;
  $sumTTFBScores = 0.0;
  for ($i = 1; $i <= $testRunResults->countSteps(); $i++) {
    $stepResult = $testRunResults->getStepResult($i);
    $pageData = $stepResult->getRawResults();
    $ttfb = (int)$pageData['TTFB'];
    $latency = isset($test['testinfo']['latency']) ? $test['testinfo']['latency'] : null;
    $ttfbScore = gradeTTFBForStep($ttfb, $latency, $stepResult->createTestPaths(), $target);
    if (isset($ttfbScore)) {
      $numTTFBScores++;
      $sumTTFBScores += $ttfbScore;
    }
  }
  if ($numTTFBScores > 0) {
    $scores['ttfb'] = $sumTTFBScores / $numTTFBScores;
  }

  return createGradeArray($scores);
}

/**
 * @param int[] $scores Numeric scores for ttfb, keep-alive, gzip, image_compression, caching, combine, cdn, cookies,
 *                                         minify, e-tags, progressive_jpeg
 * @return array|null An array with all labels, scores, grades, weights, etc per score
 */
function createGradeArray($scores) {

  $opt = array();

  // put them in rank-order
  $opt['ttfb'] = array();
  $opt['keep-alive'] = array();
  $opt['gzip'] = array();
  $opt['image_compression'] = array();
  $opt['caching'] = array();
  $opt['combine'] = array();
  $opt['cdn'] = array();
  $opt['cookies'] = array();
  $opt['minify'] = array();
  $opt['e-tags'] = array();

  foreach (array_keys($opt) as $scoreName) {
    if (array_key_exists($scoreName, $scores) && $scores[$scoreName] >= 0) {
      $opt[$scoreName]['score'] = $scores[$scoreName];
    }
  }
  if (array_key_exists('progressive_jpeg', $scores) && $scores['progressive_jpeg'] >= 0) {
    $opt['progressive_jpeg'] = array(
      'score' => $scores['progressive_jpeg'],
      'label' => 'Progressive JPEGs',
      'important' => true
    );
  }

  // define the labels for all  of them
  $opt['ttfb']['label'] = 'First Byte Time';
  $opt['keep-alive']['label'] = 'Keep-alive Enabled';
  $opt['gzip']['label'] = 'Compress Transfer';
  $opt['image_compression']['label'] = 'Compress Images';
  $opt['caching']['label'] = 'Cache static content';
  $opt['combine']['label'] = 'Combine js and css files';
  $opt['cdn']['label'] = 'Effective use of CDN';
  $opt['cookies']['label'] = 'No cookies on static content';
  $opt['minify']['label'] = 'Minify javascript';
  $opt['e-tags']['label'] = 'Disable E-Tags';

  // flag the important ones
  $opt['ttfb']['important'] = true;
  $opt['keep-alive']['important'] = true;
  $opt['gzip']['important'] = true;
  $opt['image_compression']['important'] = true;
  $opt['caching']['important'] = true;
  $opt['cdn']['important'] = true;

  // apply grades
  foreach( $opt as $check => &$item )
  {
    $grade = 'N/A';
    $weight = 0;
    if( $check == 'cdn' )
    {
      if( $item['score'] >= 80 )
      {
        $item['grade'] = "<img src=\"{$GLOBALS['cdnPath']}/images/grade_check.png\" alt=\"yes\">";
        $item['class'] = 'A';
      }
      else
      {
        $item['grade'] = 'X';
        $item['class'] = 'NA';
      }
    }
    else
    {
      if( isset($item['score']) )
      {
        $weight = 100;
        if( $item['score'] >= 90 )
          $grade = 'A';
        elseif( $item['score'] >= 80 )
          $grade = 'B';
        elseif( $item['score'] >= 70 )
          $grade = 'C';
        elseif( $item['score'] >= 60 )
          $grade = 'D';
        elseif( $item['score'] >= 0 )
          $grade = 'F';
        else
          $weight = 0;
      }
      $item['grade'] = $grade;
      if( $grade == "N/A" )
        $item['class'] = "NA";
      else
        $item['class'] = $grade;
    }
    $item['weight'] = $weight;
  }

    return $opt;
}

/**
 * @param int $ttfb The TTFB of this step
 * @param int|null $latency The latency or null if it's unknown
 * @param TestPaths $localPaths Paths corresponding to this step
 * @param int $target Gets set to the target TTFB
 * @return int|null The TTFB score or null, if it can't get determined
 */
function gradeTTFBForStep($ttfb, $latency, $localPaths, &$target) {
  $score = null;
  if( $ttfb )
  {
    // see if we can fast-path fail this test without loading the object data
    if( isset($latency) )
    {
      $rtt = (int)$latency + 100;
      $worstCase = $rtt * 7 + 1000;  // 7 round trips including dns, socket, request and ssl + 1 second back-end
      if( $ttfb > $worstCase )
        $score = 0;
    } else {
      $latency = 0;
    }

    if( !isset($score) )
    {
      $target = getTargetTTFBForStep($localPaths, $latency);
      $score = (int)min(max(100 - (($ttfb - $target) / 10), 0), 100);
    }
  }

  return $score;
}

/**
 * Determine the target TTFB for the given test step
 * @param TestPaths $localPaths Paths corresponding to this step
 * @param int $rtt The latency if set, or null
 * @return int|null The target TTFB or null if it can't get determined
 */
function getTargetTTFBForStep($localPaths, $rtt) {
  $target = NULL;

  // load the object data (unavoidable, we need the socket connect time to the first host)
  require_once('object_detail.inc');

  $secure = false;
  $requests = getRequestsForStep($localPaths, null, $secure, $haveLocations, false);
  if( count($requests) )
  {
    // figure out what the RTT is to the server (take the connect time from the first request unless it is over 3 seconds)
    if (isset($requests[0]['connect_start']) &&
      $requests[0]['connect_start'] >= 0 &&
      isset($requests[0]['connect_end']) &&
      $requests[0]['connect_end'] > $requests[0]['connect_start']) {
      $rtt = $requests[0]['connect_end'] - $requests[0]['connect_start'];
    } else {
      $connect_ms = $requests[0]['connect_ms'];
      if ($rtt > 0 && (!isset($connect_ms) || $connect_ms > 3000 || $connect_ms < 0))
        $rtt += 100;    // allow for an additional 100ms to reach the server on top of the traffic-shaped RTT
      else
        $rtt = $connect_ms;
    }

    // allow for a minimum of 100ms for the RTT
    $rtt = max($rtt, 100);

    $ssl_ms = 0;
    $i = 0;
    while (isset($requests[$i])) {
      if (isset($requests[$i]['contentType']) &&
        (stripos($requests[$i]['contentType'], 'ocsp') !== false ||
          stripos($requests[$i]['contentType'], 'crl') !== false)) {
        $i++;
      } else {
        if ($requests[$i]['is_secure'])
          $ssl_ms = $rtt;
        break;
      }
    }

    // RTT's: DNS + Socket Connect + HTTP Request + 100ms allowance
    $target = ($rtt * 3) + $ssl_ms + 100;
  }

  return $target;
}
?>
