<?php

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\OpportunityTest\Fonts3rdParty;
use WebPageTest\OE\TestResult;

class ExampleTest extends TestCase
{
    public function testRunMethodReturnsTestResult()
    {
        $testStepResult = new class {
            public function getRequests()
            {
                return [];
            }
        };
        $data = [
            $testStepResult,
            'example.com'
        ];

        $result = Fonts3rdParty::run($data);

        $this->assertInstanceOf(TestResult::class, $result);
    }

    public function testZeroThirdPartyFontsFound()
    {
        $testStepResult = new class {
            public function getRequests()
            {
                return [
                [
                'full_url' => 'https://example.com',
                'contentType' => 'text/html',
                'host' => 'example.com'
                ]
                ];
            }
        };

        $data = [
            $testStepResult,
            'example.com'
        ];

        $result = Fonts3rdParty::run($data);

        $this->assertEquals('Zero third-party fonts found.', $result->getTitle());
        $this->assertEmpty($result->getExamples());
        $this->assertEmpty($result->getExperiments());
        $this->assertTrue($result->isGood());
    }

    public function testOneThirdPartyFontFound()
    {
        $testStepResult = new class {
            public function getRequests()
            {
                return [
                ['full_url' => 'https://example.com', 'contentType' => 'text/html', 'host' => 'example.com'],
                ['full_url' => 'https://example.net/font.woff', 'contentType' => 'application/font-woff', 'host' => 'example.net'],
                ];
            }
        };
        $data = [
            $testStepResult,
            'example.com'
        ];

        $result = Fonts3rdParty::run($data);

        $this->assertEquals('1 font is hosted on 3rd-party hosts', $result->getTitle());
        $this->assertCount(1, $result->getExamples());
        $this->assertCount(4, $result->getExperiments());
        $this->assertFalse($result->isGood());
    }
}
