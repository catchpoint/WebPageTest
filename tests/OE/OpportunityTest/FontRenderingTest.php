<?php

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\OpportunityTest\FontRendering;
use WebPageTest\OE\TestResult;

class FontRenderingTest extends TestCase
{
    public function testNoBlockingFonts()
    {
        $testStepResult = new class {
            public function getMetric()
            {
                return [
                ];
            }
        };
        $data = [
            $testStepResult
        ];
        $result = FontRendering::run($data);
        $this->assertInstanceOf(TestResult::class, $result);
        $this->assertEquals("Zero custom fonts load in ways that delay text visibility.", $result->getTitle());
        $this->assertTrue($result->isGood());
        $this->assertEmpty($result->getExamples());
        $this->assertEmpty($result->getExperiments());
    }

    public function testBlockingFonts()
    {
        $testStepResult = new class {
            public function getMetric()
            {
                $fonts = [
                ['family' => 'Open Sans', 'status' => 'loaded', 'display' => 'block'],
                ['family' => 'Roboto', 'status' => 'loading', 'display' => 'swap'],
                ['family' => 'Lato', 'status' => 'active', 'display' => 'swap', 'weight' => 'bold']
                ];
                return $fonts;
            }
        };
        $data = [
            $testStepResult
        ];
        $result = FontRendering::run($data);
        $this->assertEquals("Several fonts are loaded with settings that hide text while they are loading.", $result->getTitle());
        $this->assertTrue($result->hideAssets());
        $this->assertFalse($result->isGood());
        $this->assertNotEmpty($result->getExamples());
        $this->assertContains('Open Sans', $result->getExamples());
        $this->assertNotContains('Roboto', $result->getExamples());
        $this->assertNotContains('Lato bold', $result->getExamples());
        $this->assertNotEmpty($result->getExperiments());
        $this->assertEquals('018', $result->getExperiments()[0]->id);
        $this->assertEquals('fontdisplayswap', $result->getExperiments()[0]->expvar);
        $this->assertEquals([''], $result->getExperiments()[0]->expval);
    }
}
