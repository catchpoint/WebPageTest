<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\Assessment\Quick;
use WebPageTest\OE\TestResult;

class QuickAssessmentTest extends TestCase
{
    public function testCanGetGradeFail()
    {
        $assessment = new Quick([
            'num_recommended' => 3
        ]);

        $assessment->loadCustomAttributes([
          'fcpCheck' => 5
        ]);

        $this->assertEquals('f', $assessment->getGrade());
    }
    public function testCanGetGradeC()
    {
        $assessment = new Quick([
            'num_recommended' => 1,
        ]);

        $assessment->loadCustomAttributes([
          'fcpCheck' => 5
        ]);

        $this->assertEquals('c', $assessment->getGrade());
    }

    public function testCanGetSentiment()
    {
        $assessment = new Quick([
            'num_recommended' => 3
        ]);
        $assessment->loadCustomAttributes([
            'fcpCheck' => 5,
        ]);

        $this->assertEquals('<span class="opportunity_summary_sentiment">Needs Improvement.</span>', $assessment->getSentiment());
    }

    public function testCanGetSummary()
    {
        $assessment = new Quick([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $this->assertNotEmpty($assessment->getSummary());
    }

    public function testCanGetOpportunities()
    {
        $assessment = new Quick([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $this->assertIsArray($assessment->getOpportunities());
    }

    public function testCanAddOpportunity()
    {
        $assessment = new Quick([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $opportunity = new TestResult();
        $assessment->addOpportunity($opportunity);

        $this->assertContains($opportunity, $assessment->getOpportunities());
    }

    public function testCanSetOpportunities()
    {
        $assessment = new Quick([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $opportunities = [
            new TestResult(),
            new TestResult(),
        ];

        $assessment->setOpportunities($opportunities);

        $this->assertEquals($opportunities, $assessment->getOpportunities());
    }

    public function testCanGetNumRecommended()
    {
        $assessment = new Quick([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $this->assertEquals(1, $assessment->getNumRecommended());
    }

    public function testCanSetNumRecommended()
    {
        $assessment = new Quick([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $assessment->setNumRecommended(3);

        $this->assertEquals(3, $assessment->getNumRecommended());
    }

    public function testCanGetNumExperiments()
    {
        $assessment = new Quick([
            'num_experiments' => 1,
            'fcpCheck' => 5,
        ]);

        $this->assertEquals(1, $assessment->getNumExperiments());
    }

    public function testCanSetNumExperiments()
    {
        $assessment = new Quick([
            'num_experiments' => 1,
            'fcpCheck' => 5,
        ]);

        $assessment->setNumExperiments(3);
        $this->assertEquals(3, $assessment->getNumExperiments());
    }
}
