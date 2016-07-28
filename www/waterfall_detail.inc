<?php
require_once __DIR__ . '/include/RequestDetailsHtmlSnippet.php';
require_once __DIR__ . '/include/RequestHeadersHtmlSnippet.php';

$useLinks = !$settings['nolinks'];
$requestDetailsSnippet = new RequestDetailsHtmlSnippet($testInfo, $testRunResults->getStepResult(1), $useLinks);
echo $requestDetailsSnippet->create();
?>

<br>
<?php include('./ads/details_bottom.inc'); ?>
<br>

<?php
  echo '<div id="headers">';
  if (array_key_exists('testinfo', $test) && array_key_exists('testerDNS', $test['testinfo']) && strlen($test['testinfo']['testerDNS']))
    echo "<p>Test Machine DNS Server(s): {$test['testinfo']['testerDNS']}</p>\n";
  $requestHeadersSnippet = new RequestHeadersHtmlSnippet($testRunResults->getStepResult(1), $useLinks);
  $snippet = $requestHeadersSnippet->create();
  if ($snippet) {
    echo '<br><hr><h2>Request Headers</h2>';
    echo $snippet;
  }
?>
</div>
