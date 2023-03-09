<?php

require_once '../common.inc';
use WebPageTest\Util;
require_once '../include/TestInfo.php';
$testInfo = json_decode(gz_file_get_contents("../$testPath/testinfo.json.gz"));
$html = "";
if ($testInfo && $testInfo->metadata) {
    $recipes = json_decode($testInfo->metadata)->experiment->recipes;

    foreach ($recipes as $recipe) {
        if ($recipe->{'054'}) {
            $html = $recipe->{'054'}[0];
        }
    }
}

echo $html;
