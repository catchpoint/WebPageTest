<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest\Custom;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\TestResult;

class EditResponseHtml implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        $location = $data[0];

        return new TestResult([
          "title" =>  "Edit Response HTML",
          "desc" =>  "This experiment allows you to freely edit the text of the initial HTML response",
          "examples" =>  array(),
          "experiments" =>  array(
              (object) [
                  'id' => '054',
                  'title' => 'Edit Response HTML',
                  "desc" => '<p>This experiment will replace the initial HTML with the submitted value as if it was served that way initially.</p>',
                  "expvar" => 'editresponsehtml',
                  'textinputvalue' => htmlentities(file_get_contents($location)),
                  "fullscreenfocus" => true
              ]
          ),
          "good" =>  null,
          "inputttext" => true
        ]);
    }
}
