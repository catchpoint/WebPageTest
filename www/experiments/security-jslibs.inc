<?php

(function () {

    global $testStepResult;
    global $jsLibsVulns;
    global $numVulns;
    global $num_high;
    global $num_medium;
    global $num_low;

    if ($testStepResult) {
        $jsLibsVulns = $testStepResult->getRawResults()['jsLibsVulns'];
    }

    if ($jsLibsVulns) {
        $numVulns = count($jsLibsVulns);
        $num_high = 0;
        $num_medium = 0;
        $num_low = 0;

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

        $opp = [
            "title" =>  "Several security vulnerabilies were detected by Snyk",
            "desc" =>  "Snyk has found $numVulns security vulnerabilit" . ($numVulns > 1 ? "ies" : "y") .
                ($num_high > 0 ? "$num_high high, " : '') .
                ($num_medium > 0 ? "$num_medium medium, " : '') .
                ($num_low > 0 ? "$num_low low, " : ''),
            "examples" =>  array(),
            "experiments" =>  array(
                (object) [
                    'title' => 'Update the following JavaScript packages',
                    "desc" => implode($secRecs)
                ]
            ),
            "good" =>  false
        ];
    } else {
        $opp = [
            "title" =>  "Zero security vulnerabilies were detected by Snyk",
            "desc" =>  "Snyk has found 0 security vulnerabilities with included packages.",
            "examples" =>  array(),
            "experiments" =>  array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Resilient, $opp);
})();
