<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\TestResult;
use WebPageTest\OE\OpportunityTest\Util;

class UnusedPreloads implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        $testStepResult = $data[0];
        $rootURL = $data[1];

        $requests = $testStepResult->getRequests();
        $unusedPreloads = array();

        foreach ($requests as $request) {
            if (
                Util::initiatedByRoot($request, $rootURL) &&
                isset($request['preloadUnused']) &&
                $request['preloadUnused'] == "true"
            ) {
                array_push($unusedPreloads, Util::documentRelativePath($request['url'], $requests[0]['url']));
            }
        }

        if (count($unusedPreloads) > 0) {
            $opp = new TestResult([
                "title" => count($unusedPreloads) . " resource" . (count($unusedPreloads) > 1 ? "s are" : " is") .
                           " being preloaded, but " . (count($unusedPreloads) > 1 ? "are" : "is") . " not used during" .
                           " page load.",
                "desc" => "Preloaded resources are fetched at a high priority, delaying the arrival of other" .
                          " resources in the page. In the case where a preloaded resource is never actually" .
                          " used by the page, that means potentially critical requests will be delayed, slowing" .
                          " down the initial loading of your site.",
                "examples" =>  array_unique($unusedPreloads),
                "experiments" =>  array(
                    (object) [
                        'id' => '022',
                        'title' => 'Remove Unused Preloads',
                        "desc" => '<p>This experiment removes specified unused preloads from the page, allowing other' .
                                  ' critical resources to be requested earlier.</p>',
                        "expvar" => 'removepreload',
                        "expval" => array_unique($unusedPreloads)
                    ]
                ),
                "good" =>  false
            ]);
        } else {
            $opp = new TestResult([
                "title" => 'Zero unused preloads were found.',
                "desc" => 'Preloaded resources are fetched at a high priority, delaying the arrival of other' .
                          ' resources in the page. In the case where a preloaded resource is never actually used by' .
                          ' the page, that means potentially critical requests will be delayed, slowing down the' .
                          ' initial loading of your site.',
                "examples" =>  array(),
                "experiments" =>   array(),
                "good" =>  true
            ]);
        }

        return $opp;
    }
}
