<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\TestResult;
use WebPageTest\OE\OpportunityTest\Util;

class HTTPRedirects implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        $testStepResult = $data[0];
        $requests = $testStepResult->getRequests();
        $redirectedRequests = array();

        foreach ($requests as $request) {
            if (isset($request['responseCode']) && Util::is300s($request)) {
                $loc = "";
                foreach ($request["headers"]["response"] as $header) {
                    if (strpos($header, "Location:") !== null) {
                        $loc = substr($header, strlen("Location:"));
                    }
                }
                array_push($redirectedRequests, array($request['full_url'], $loc));
            }
        }

        $opp = null;

        if (count($redirectedRequests) > 0) {
            $expsToAdd = null;
            if (isset($requests[0]['responseCode']) && Util::is300s($requests[0])) {
                $to = $requests[1]['full_url'];
                $expsToAdd = array();
                $expsToAdd[] = (object) [
                    "id" => '047',
                    'title' => 'Remove Redirect on First Request',
                    "desc" => '<p>This experiment will replace the initial url with its redirected location,' .
                              ' demonstrating time saved when no redirect is in play.</p>',
                    "expvar" => 'experiment-setinitialurl',
                    "expval" => array($to),
                    "hideassets" => true
                ];
            }

            $opp = new TestResult([
                "title" => count($redirectedRequests) . " request" .
                           (count($redirectedRequests) > 1 ? "s are" : " is") . " resulting in an HTTP redirect.",
                "desc" => "HTTP redirects can result in additional DNS resolution, TCP connection and HTTPS" .
                          " negotiation times, making them very costly for performance, particularly on high" .
                          " latency networks.",
                "examples" =>  self::joinValues($redirectedRequests),
                "good" =>  false,
                "experiments" => $expsToAdd,
            ]);
        } else {
            $opp = new TestResult([
                "title" => 'Zero requests were found that resulted in an HTTP redirect.',
                "desc" => "HTTP redirects can result in additional DNS resolution, TCP connection and HTTPS" .
                          " negotiation times, making them very costly for performance, particularly on high latency" .
                          " networks.",
                "examples" => array(),
                "good" => true
            ]);
        }

        return $opp;
    }

    /**
     * @return string[]
     *
     * @psalm-return list<non-empty-string>
     * @param (false|mixed|string)[][] $arr
     *
     * @psalm-param list{0: list{mixed, false|string}, 1?: list{mixed, false|string},...} $arr
     */
    private static function joinValues(array $arr): array
    {
        $oneLevel = array();
        foreach ($arr as $item) {
            array_push($oneLevel, 'FROM: ' . implode(" TO: ", $item));
        }
        return $oneLevel;
    }
}
