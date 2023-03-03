<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\TestResult;

class GeneratedContentUsable implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        $genContentSize = floatval($data[0]);
        $genContentPercent = floatval($data[1]);

        if ($genContentSize > .5 || $genContentPercent > 1) {
            $amtNote = "(" . $genContentSize . "kb larger, or " . $genContentPercent . "% of total HTML)";


            $opp = new TestResult([
                "title" =>  'Final HTML (DOM) size is significantly larger than initially delivered HTML ' . $amtNote . '.',
                "desc" =>  'Typically this is due to over-reliance on JavaScript for generating content, but increases can also happen as a result of browsers normalizing HTML structure as well. When critical HTML content is generated with JavaScript in the browser, it can increase the time it takes for content to be made accessible to assistive technology such as screen readers.',
                "examples" =>  array(),
                "experiments" =>  array(
                    (object) [
                        'title' => 'Look for ways to deliver more HTML content from the start',
                        "desc" => '<p>Many modern frameworks offer patterns for generating useful HTML on the server. </p>',
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
                "desc" =>  "When critical HTML content is generated with JavaScript in the browser, it can increase the time it takes for content to be made accessible to assistive technology such as screen readers.",
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
