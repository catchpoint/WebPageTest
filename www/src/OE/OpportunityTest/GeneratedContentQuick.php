<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\TestResult;

class GeneratedContentQuick implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        $genContentSize = $data[0];
        $genContentPercent = $data[1];
        $id = $data[2];

        $genContentSize = floatval($genContentSize);
        $genContentPercent = floatval($genContentPercent);

        if ($genContentSize > .5 || $genContentPercent > 1) {
            $amtNote = "(" . $genContentSize . "kb larger, or " . $genContentPercent . "% of total HTML)";

            $opp = new TestResult([
                "title" =>  'Final HTML (DOM) size is significantly larger than initially delivered HTML ' . $amtNote . '.',
                "desc" =>  'Typically this is due to over-reliance on JavaScript for generating content, but increases can also happen as a result of browsers normalizing HTML structure as well. When critical HTML content is generated with JavaScript in the browser, several performance bottlenecks can arise:',
                "examples" =>  array(
                    "Before content can be generated client-side, the browser must first parse, evaluate, and sometimes also request JavaScript over the network. These steps occur after the HTML is initially delivered, and can incur long delays depending on the device.",
                    "If the generated HTML contains references to external assets (images for example), the browser will not be able to discover and request them as early as desired."
                ),
                "experiments" =>  array(
                    (object) [
                        "id" => '053',
                        'title' => 'Mimic Pre-rendered HTML',
                        "desc" => '<p>This experiment mimics server-generated HTML by swapping the initial HTML with the fully rendered HTML from this test run. <strong>Note:</strong> this will very likely break site behavior, but is potentially useful for comparing early metrics and assessing whether moving logic to the server is worth the effort.</p>',
                        "expvar" => 'prerender',
                        "expval" => array($id)
                    ]
                ),
                "good" =>  false,
                "hideassets" => true,
                "custom_attributes" => [
                    'genContentSize' => $genContentSize,
                    'genContentPercent' => $genContentPercent
                ]
            ]);
        } else {
            $opp = new TestResult([
                "title" =>  'Final HTML (DOM) size is not significantly larger than the initial HTML.',
                "desc" =>  "When critical HTML content is generated with JavaScript in the browser, several performance bottlenecks can arise.",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" =>  true,
                "custom_attributes" => [
                    'genContentSize' => $genContentSize,
                    'genContentPercent' => $genContentPercent
                ]
            ]);
        }

        return $opp;
    }
}
