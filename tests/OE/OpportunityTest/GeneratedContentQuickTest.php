<?php

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\OpportunityTest\GeneratedContentQuick;
use WebPageTest\OE\TestResult;

class GeneratedContentQuickTest extends TestCase
{
    public function testRunReturnsInstanceOfTestResult()
    {
        $data = [0.5, 1, 1];
        $result = GeneratedContentQuick::run($data);
        $this->assertInstanceOf(TestResult::class, $result);
    }

    public function testRunReturnsTestResultWithTitleAndDesc()
    {
        $data = [0.5, 1, 1];
        $result = GeneratedContentQuick::run($data);
        $this->assertNotEmpty($result->getTitle());
        $this->assertNotEmpty($result->getDescription());
    }

    public function testRunWithContentSizeOverLimitReturnsTestResultWithCorrectTitleAndDesc()
    {
        $data = [1, 0.5, 1];
        $result = GeneratedContentQuick::run($data);
        $this->assertEquals('Final HTML (DOM) size is significantly larger than initially delivered HTML (1kb larger, or 0.5% of total HTML).', $result->getTitle());
        $this->assertEquals('Typically this is due to over-reliance on JavaScript for generating content, but increases can also happen as a result of browsers normalizing HTML structure as well. When critical HTML content is generated with JavaScript in the browser, several performance bottlenecks can arise:', $result->getDescription());
    }

    public function testRunWithContentSizeOverLimitReturnsTestResultWithExamplesAndExperiments()
    {
        $data = [1, 0.5, 1];
        $result = GeneratedContentQuick::run($data);
        $this->assertNotEmpty($result->getExamples());
        $this->assertNotEmpty($result->getExperiments());
    }

    public function testRunWithContentSizeUnderLimitReturnsTestResultWithCorrectTitleAndDesc()
    {
        $data = [0.5, 1, 1];
        $result = GeneratedContentQuick::run($data);
        $this->assertEquals('Final HTML (DOM) size is not significantly larger than the initial HTML.', $result->getTitle());
        $this->assertEquals('When critical HTML content is generated with JavaScript in the browser, several performance bottlenecks can arise.', $result->getDescription());
    }

    public function testRunWithContentSizeUnderLimitReturnsTestResultWithoutExamplesAndExperiments()
    {
        $data = [0.5, 1, 1];
        $result = GeneratedContentQuick::run($data);
        $this->assertEmpty($result->getExamples());
        $this->assertEmpty($result->getExperiments());
    }

    public function testRunWithGenContentSizeAsFloatReturnsTestResultWithCustomAttributes()
    {
        $data = [0.5, 1, 1];
        $result = GeneratedContentQuick::run($data);
        $this->assertArrayHasKey('genContentSize', $result->getCustomAttributes());
        $this->assertIsFloat($result->getCustomAttributes()['genContentSize']);
    }

    public function testRunWithGenContentPercentAsFloatReturnsTestResultWithCustomAttributes()
    {
        $data = [0.5, 1, 1];
        $result = GeneratedContentQuick::run($data);
        $this->assertArrayHasKey('genContentPercent', $result->getCustomAttributes());
        $this->assertIsFloat($result->getCustomAttributes()['genContentPercent']);
    }
}
