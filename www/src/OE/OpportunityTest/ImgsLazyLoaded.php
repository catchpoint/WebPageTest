<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\TestResult;

class ImgsLazyLoaded implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        $testStepResult = $data[0];

        $imgsInViewport = $testStepResult->getMetric('imgs-in-viewport');
        $imgsThatShouldNotBeLazy = array();
        if (isset($imgsInViewport)) {
            foreach ($imgsInViewport as $img) {
                if ($img["loading"] === "lazy" && strpos($img["src"], 'data:') !== 0) {
                    array_push($imgsThatShouldNotBeLazy, $img);
                }
            }
        }

        if (count($imgsThatShouldNotBeLazy)) {
            $shouldNotBeLazySrcs = array();
            foreach ($imgsThatShouldNotBeLazy as $img) {
                array_push($shouldNotBeLazySrcs, $img["src"]);
            }

            $opp = new TestResult([
                "title" =>  "Images within the initial viewport are being lazy-loaded.",
                "desc" => "When images are lazy-loaded using loading=\"lazy\", they will be requested after the" .
                          " layout is established, which is too late for images in the critical window.",
                "examples" => array_unique($shouldNotBeLazySrcs),
                "experiments" => array(
                    (object) [
                        "id" => '013',
                        'title' => 'Remove loading="lazy" from in-viewport images',
                        "desc" => '<p>This experiment removes <code>loading="lazy"</code> attributes from images' .
                                  ' that are inside the viewport at load</p>',
                        "expvar" => 'removeloadinglazy',
                        "expval" => array_unique($shouldNotBeLazySrcs)
                    ]
                ),
                "good" => false
            ]);
        } else {
            $opp = new TestResult([
                "title" => "Zero render-critical images are lazy-loaded.",
                "desc" => "When images are lazy-loaded using loading=\"lazy\", they will be requested after the" .
                          " layout is established, which is too late for images in the critical window.",
                "examples" => array(),
                "experiments" => array(),
                "good" => true
            ]);
        }

        return $opp;
    }
}
