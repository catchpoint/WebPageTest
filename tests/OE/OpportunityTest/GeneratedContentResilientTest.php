<?php

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\OpportunityTest\GeneratedContentResilient;
use WebPageTest\OE\TestResult;

class GeneratedContentResilientTest extends TestCase
{
    public function testRunWithLargeContentSize()
    {
        $data = [
            [
                ['url' => 'http://example.com', 'contentType' => 'application/javascript', 'host' => 'example.com'],
                ['url' => 'http://example.com', 'contentType' => 'text/javascript', 'host' => 'example.com'],
                ['url' => 'http://example.com', 'contentType' => 'application/x-javascript', 'host' => 'example.com'],
            ],
            1,
            2,
            'example.com',
        ];

        $result = GeneratedContentResilient::run($data);

        $this->assertInstanceOf(TestResult::class, $result);
        $this->assertFalse($result->isGood());
        $this->assertNotEmpty($result->getExperiments());
        $this->assertNotEmpty($result->getCustomAttribute('genContentSize'));
        $this->assertNotEmpty($result->getCustomAttribute('genContentPercent'));
    }

    public function testRunWithSmallContentSize()
    {
        $data = [
            [
                ['url' => 'http://example.com', 'contentType' => 'text/html', 'host' => 'example.com'],
                ['url' => 'http://example.com', 'contentType' => 'image/png', 'host' => 'example.com'],
            ],
            0.1,
            0.2,
            'example.com',
        ];

        $result = GeneratedContentResilient::run($data);

        $this->assertTrue($result->isGood());
        $this->assertEmpty($result->getExperiments());
        $this->assertArrayHasKey('genContentSize', $result->getCustomAttributes());
        $this->assertArrayHasKey('genContentPercent', $result->getCustomAttributes());
    }
}
