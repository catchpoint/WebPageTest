<?php

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\OpportunityTest\AxeWarnings;
use WebPageTest\OE\TestResult;

class AxeWarningsTest extends TestCase
{
    public function testRunMethodReturnsInstanceOfTestResult()
    {
        $data = [
            [
                'violations' => [],
            ]
        ];
        $result = AxeWarnings::run($data);
        $this->assertInstanceOf(TestResult::class, $result);
    }

    public function testRunMethodReturnsGoodResultWhenNoViolations()
    {
        $data = [
            [
                'violations' => [],
            ]
        ];
        $result = AxeWarnings::run($data);
        $this->assertTrue($result->isGood());
        $this->assertEquals('Zero Accessibility Issues were Detected', $result->getTitle());
        $this->assertEquals('Axe found no accessibility issues. ', $result->getDescription());
        $this->assertEmpty($result->getCustomAttribute('axe_violations'));
        $this->assertEquals(0, $result->getCustomAttribute('axe_num_violations'));
        $this->assertEquals(0, $result->getCustomAttribute('axe_num_critical'));
        $this->assertEquals(0, $result->getCustomAttribute('axe_num_serious'));
        $this->assertEquals(0, $result->getCustomAttribute('axe_num_moderate'));
        $this->assertEquals(0, $result->getCustomAttribute('axe_num_minor'));
    }

    public function testRunMethodReturnsBadResultWhenViolationsExist()
    {
        $data = [
            [
                'violations' => [
                    [
                        'impact' => 'critical',
                        'help' => 'Helpful message for critical violation.',
                        'helpUrl' => 'https://example.com/critical-violation-help',
                        'nodes' => [
                            [
                                'failureSummary' => 'Failure summary for critical violation.',
                                'html' => '<button>Click me!</button>',
                            ],
                        ],
                    ],
                    [
                        'impact' => 'moderate',
                        'help' => 'Helpful message for moderate violation.',
                        'helpUrl' => 'https://example.com/moderate-violation-help',
                        'nodes' => [
                            [
                                'failureSummary' => 'Failure summary for moderate violation.',
                                'html' => '<input type="text" placeholder="Enter your name">',
                            ],
                        ],
                    ],
                ],
            ]
        ];
        $result = AxeWarnings::run($data);
        $this->assertFalse($result->isGood());
        $this->assertEquals('Accessibility Issues were Detected', $result->getTitle());
        $this->assertStringContainsString('Axe found 2 accessibility issues', $result->getDescription());
        $this->assertNotEmpty($result->getCustomAttribute('axe_violations'));
        $this->assertEquals(2, $result->getCustomAttribute('axe_num_violations'));
        $this->assertEquals(1, $result->getCustomAttribute('axe_num_critical'));
        $this->assertEquals(0, $result->getCustomAttribute('axe_num_serious'));
        $this->assertEquals(1, $result->getCustomAttribute('axe_num_moderate'));
        $this->assertEquals(0, $result->getCustomAttribute('axe_num_minor'));
    }
}
