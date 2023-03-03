<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\OpportunityTest\Util;
use WebPageTest\OE\TestResult;

class GeneratedContentResilient implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        $requests = $data[0];
        $genContentSize = $data[1];
        $genContentPercent = $data[2];
        $initialHost = $data[3];

        $genContentSize = floatval($genContentSize);
        $genContentPercent = floatval($genContentPercent);

        $jsRequests = array();
        $jsHosts = array();
        foreach ($requests as $request) {
            if ($request['contentType'] === "application/javascript" || $request['contentType'] === "text/javascript" || $request['contentType'] === "application/x-javascript") {
                array_push($jsRequests, Util::documentRelativePath($request['url'], $requests[0]['url']));
                if ($request['host'] !== $initialHost) {
                    array_push($jsHosts, $request['host']);
                }
            }
        }

        if ($genContentSize > .5 || $genContentPercent > 1) {
            $amtNote = "(" . $genContentSize . "kb larger, or " . $genContentPercent . "% of total HTML)";

            $opp = new TestResult([
                "title" =>  'Final HTML (DOM) size is significantly larger than initially delivered HTML ' . $amtNote . '.',
                "desc" =>  'Typically this is due to over-reliance on JavaScript for generating content, but increases can also happen as a result of browsers normalizing HTML structure as well. Common issues such as JavaScript errors and third-party network delays and outages can present potential single points of failure.',
                "examples" =>  array(),
                "experiments" =>  array(
                    (object) [
                        "id" => '015',
                        'title' => 'Disable Scripts',
                        "desc" => '<p>This experiment makes all scripts (inline and external) unrecognizable as javascript by the browser in order to demonstrate whether the site will still be usable if JavaScript fails to properly run.</p>',
                        "expvar" => 'disablescripts',
                        "expval" => array(''),
                        "hideassets" => true
                    ],
                    (object) [
                        "id" => '016',
                        'title' => 'Make Scripts Timeout',
                        "desc" => '<p>This experiment directs specified requests to WebPageTest\'s blackhole server, which will hang indefinitely until timing out. Use this experiment to test your site\'s ability to serve content if these services hang.</p>',
                        "expvar" => 'experiment-spof',
                        "expval" => array_unique($jsHosts)
                    ],
                    (object) [
                        "id" => '017',
                        'title' => 'Block Script Requests',
                        "desc" => '<p>This experiment causes specified requests to fail immediately. Use this experiment to test your site\'s ability to serve content if these services are unavailable.</p>',
                        "expvar" => 'experiment-block',
                        "expval" => array_unique($jsRequests)
                    ]
                ),
                "good" =>  false,
                "hideassets" => false,
                "custom_attributes" => [
                    "genContentSize" => $genContentSize,
                    "genContentPercent" => $genContentPercent
                ]
            ]);
        } else {
            $opp = new TestResult([
                "title" =>  'Final HTML (DOM) size is not significantly larger than the initial HTML.',
                "desc" =>  "When final HTML (DOM) size is significantly larger than initial HTML, it can reflect an over-reliance on JavaScript for generating content. Common issues such as JavaScript errors and third-party network delays and outages can present potential single points of failure.",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" =>  true,
                "custom_attributes" => [
                    "genContentSize" => $genContentSize,
                    "genContentPercent" => $genContentPercent
                ]
            ]);
        }

        return $opp;
    }
}
