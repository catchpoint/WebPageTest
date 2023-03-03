<?php

declare(strict_types=1);

namespace WebPageTest\OE\OpportunityTest\Custom;

use WebPageTest\OE\OpportunityTest;
use WebPageTest\OE\TestResult;

class FindAndReplace implements OpportunityTest
{
    public static function run(array $data): TestResult
    {
        return new TestResult([
          "title" =>  "Find and Replace Text",
          "desc" =>  "This experiment allows you to find and replace arbitrary text or html in a request.",
          "examples" =>  array(),
          "experiments" =>  array(
              (object) [
                  'id' => '026',
                  'title' => 'Find/Replace Text',
                  "desc" => '<p>This experiment will find and replace occurrences of text in the page, with the option of using regular expressions, capturing parentheses, and flags as well</p>',
                  "expvar" => 'findreplace',
                  "expfields" => array(
                      (object) [
                          'label' => 'find',
                          'type' => 'text'
                      ],
                      (object) [
                          'label' => 'replace',
                          'name' => 'replacement',
                          'type' => 'text'
                      ],
                      (object) [
                          'label' => 'Use Regular Expressions?',
                          'name' => 'useRegExp',
                          'type' => 'checkbox'
                      ],
                      (object) [
                          'label' => 'RegExp Flags (default: gi)',
                          'name' => 'flags',
                          'type' => 'text'
                      ]
                  )
              ]
          ),
          "good" =>  null,
          "inputttext" => true
        ]);
    }
}
