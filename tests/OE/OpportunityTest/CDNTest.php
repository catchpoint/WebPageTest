<?php

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\OpportunityTest\CDN;
use WebPageTest\OE\TestResult;

class CDNTest extends TestCase
{
    public function testRunReturnsTestResult(): void
    {
        $testStepResult = new class {
            public function getRawResults()
            {
                return [
                ];
            }
        };
        $data = [
            $testStepResult,
            [
                [
                    'score_cdn' => 50,
                    'host' => 'example.com',
                    'is_secure' => false,
                    'url' => '/example.js'
                ]
            ]
        ];

        $result = CDN::run($data);

        $this->assertInstanceOf(TestResult::class, $result);
    }

    public function testRunReturnsOppWhenThereAreUnCDNedFiles(): void
    {
        $testStepResult = new class {
            public function getRawResults()
            {
                return [
                    'score_cdn' => 90
                ];
            }
        };
        $data = [
            $testStepResult,
            [
                [
                    'score_cdn' => 50,
                    'host' => 'example.com',
                    'is_secure' => false,
                    'url' => '/example.js'
                ],
                [
                    'score_cdn' => 80,
                    'host' => 'example.net',
                    'is_secure' => true,
                    'url' => '/example.css'
                ]
            ]
        ];

        $result = CDN::run($data);

        $this->assertEquals(count($data[1]) . " files were hosted without using a CDN.", $result->getTitle());
        $this->assertEquals(
            "A Content Delivery Network (CDN) distributes a website's files throughout the world, reducing request latency. These files do not use a CDN:",
            $result->getDescription()
        );
        $this->assertEquals([
            'example.com 0' => 'http://example.com/example.js',
            'example.net 1' => 'https://example.net/example.css',
        ], $result->getExamples());
        $this->assertFalse($result->isGood());
    }

    public function testRunReturnsOppWhenThereAreNoUnCDNedFiles(): void
    {
        $testStepResult = new class {
            public function getRawResults()
            {
                return [
                    'score_cdn' => 100
                ];
            }
        };
        $data = [
          $testStepResult,
            []
        ];

        $result = CDN::run($data);

        $this->assertEquals('This site uses a CDN for delivering its files.', $result->getTitle());
        $this->assertEquals(
            "A Content Delivery Network (CDN) distributes a website's files throughout the world, reducing request latency.",
            $result->getDescription()
        );
        $this->assertEquals([], $result->getExamples());
        $this->assertTrue($result->isGood());
    }
}
