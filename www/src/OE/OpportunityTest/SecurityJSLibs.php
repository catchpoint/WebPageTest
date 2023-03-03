<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\TestResult;

class SecurityJSLibs implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        $testStepResult = $data[0];

        $jsLibsVulns = $testStepResult->getRawResults()['jsLibsVulns'] ?? [];
        $numVulns = count($jsLibsVulns);
        $num_high = 0;
        $num_medium = 0;
        $num_low =  0;

        if (!$jsLibsVulns) {
            return new TestResult([
                "name" => "security-js-libs",
                "title" => "Zero security vulnerabilies were detected by Snyk",
                "desc" => "Snyk has found 0 security vulnerabilities with included packages.",
                "examples" => [],
                "experiments" => [],
                "custom_attributes" => [
                    'jsLibsVulns' => [],
                    'numVulns' => $numVulns,
                    'num_high' => $num_high,
                    'num_medium' => $num_medium,
                    'num_low' => $num_low
                ],
                "good" =>  true
            ]);
        }

        foreach ($jsLibsVulns as $v) {
            if ($v['severity'] === "high") {
                $num_high++;
            }
            if ($v['severity'] === "medium") {
                $num_medium++;
            }
            if ($v['severity'] === "low") {
                $num_low++;
            }
        }

        $warningsArr = array();
        foreach ($jsLibsVulns as $v) {
            array_push($warningsArr, $v['severity'] . ": ");
        }

        $secRecs = array();
        $thisRec = "";
        if (count($jsLibsVulns)) {
            if (count($jsLibsVulns) > 6) {
                $thisRec .= '<ul class="util_overflow_more">';
            } else {
                $thisRec .=  '<ul>';
            }
            foreach ($jsLibsVulns as $v) {
                $thisRec .=  '<li class="recommendation_level-' . $v['severity'] . '"><span>' . $v['severity'] . '</span> ' . ' ' . $v["name"] . ' ' . $v["version"] . ' <a href="' . $v["url"] . '" class="external">View recommendation on Snyk</a></li>';
            }
            $thisRec .=  '</ul>';
            array_push($secRecs, $thisRec);
        }

        return new TestResult([
            "title" =>  "Several security vulnerabilies were detected by Snyk",
            "desc" =>  "Snyk has found $numVulns security vulnerabilit" . ($numVulns > 1 ? "ies" : "y") . ": $num_high high, $num_medium medium, $num_low low.",
            "examples" =>  array(),
            "experiments" =>  array(
                (object) [
                    'title' => 'Update the following JavaScript packages',
                    "desc" => implode($secRecs)
                ]
            ),
            "good" =>  false,
            "custom_attributes" => [
              "jsLibsVulns" => $jsLibsVulns,
              "numVulns" => $numVulns,
              "num_high" => $num_high,
              "num_medium" => $num_medium,
              "num_low" => $num_low
            ]
        ]);
    }
}
