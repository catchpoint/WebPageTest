<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\OpportunityTest\Util;
use WebPageTest\OE\TestResult;

class MetaViewport implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        $metaMetric = $data[0];

        $expectedWidth = "width=device-width";
        $expectedScale = "initial-scale=1";
        $opp = null;
        // null if metric was not included in run,
        // "Not found" if it ran and no meta tag was present
        if (
            $metaMetric === "Not found" ||
            strpos($metaMetric, $expectedScale) === false ||
            strpos($metaMetric, $expectedWidth) === false
        ) {
            $opp = new TestResult([
              "title" => 'Meta Viewport not configured properly for mobile-friendly layout.',
              "desc" => 'A meta viewport tag will help a mobile-friendly site scale and display properly on small' .
                        'screen devices.',
              "examples" =>  array(
                (
                  $metaMetric === "Not found" ?
                  "It looks like no meta viewport tag is present." :
                  "The current meta viewport tag has a content property value of " . htmlentities($metaMetric) . ".")
              ),
              "experiments" =>  array(
                  (object) [
                      "id" => '009',
                      'title' => 'Add a Meta Viewport Tag',
                      "desc" => 'This experiment inserts a ' .
                                htmlentities('<meta name="viewport" content="width=device-width, initial-scale=1">') .
                                ' in the <code>head</code> of this site.',
                      "expvar" => 'swap',
                      "expval" => array(Util::encodeURIComponent("</head>") . "|" .
                                  Util::encodeURIComponent('<meta name="viewport" content="width=device-width,' .
                                  'initial-scale=1"></head>'))
                  ]
              ),
              "good" =>  false,
              "hideassets" => true
            ]);
        } else {
            $opp = new TestResult([
              "title" => 'Meta Viewport tag is configured properly.',
              "desc" => "A meta viewport tag will help a mobile-friendly site scale and display properly on small" .
                        " screen devices.",
              "examples" => array(),
              "experiments" => array(),
              "good" => true
            ]);
        }
        return $opp;
    }
}
