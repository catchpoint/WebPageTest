<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\Assessment\Usable;
use WebPageTest\OE\TestResult;

class UsableAssessmentTest extends TestCase
{
    public function testCanGetGrade()
    {
        $assessment = new Usable([
            'num_recommended' => 0
        ]);
        $assessment->loadCustomAttributes([
          'cls' => null,
          'tbtCheck' => null
        ]);
        $this->assertEquals('a', $assessment->getGrade());

        $assessment = new Usable([
            'num_recommended' => 1
        ]);
        $assessment->loadCustomAttributes([
          'cls' => 0,
          'tbtCheck' => null
        ]);
        $this->assertEquals('c', $assessment->getGrade());

        $assessment = new Usable([
            'num_recommended' => 3
        ]);
        $assessment->loadCustomAttributes([
          'cls' => 0,
          'tbtCheck' => null
        ]);
        $this->assertEquals('c', $assessment->getGrade());

        $assessment = new Usable([
            'num_recommended' => 3
        ]);
        $assessment->loadCustomAttributes([
          'cls' => 0,
          'tbtCheck' => 2
        ]);
        $this->assertEquals('c', $assessment->getGrade());

        $assessment = new Usable([
            'num_recommended' => 3
        ]);
        $assessment->loadCustomAttributes([
          'cls' => 1,
          'tbtCheck' => null
        ]);
        $this->assertEquals('f', $assessment->getGrade());

        $assessment = new Usable([
            'num_recommended' => 3
        ]);
        $assessment->loadCustomAttributes([
          'cls' => 1,
          'tbtCheck' => 3
        ]);
        $this->assertEquals('f', $assessment->getGrade());
    }

    public function testCanGetSentiment()
    {
        $assessment = new Usable([
            'num_recommended' => 0
        ]);
        $assessment->loadCustomAttributes([
          'cls' => null,
          'tbtCheck' => null
        ]);

        $this->assertEquals("<span class=\"opportunity_summary_sentiment\">Looks great!</span>", $assessment->getSentiment());

        $assessment = new Usable([
            'num_recommended' => 1
        ]);
        $assessment->loadCustomAttributes([
          'cls' => 0,
          'tbtCheck' => null
        ]);
        $this->assertEquals("<span class=\"opportunity_summary_sentiment\">Not bad...</span>", $assessment->getSentiment());

        $assessment = new Usable([
            'num_recommended' => 3
        ]);
        $assessment->loadCustomAttributes([
          'cls' => 1,
          'tbtCheck' => 3
        ]);
        $this->assertEquals("<span class=\"opportunity_summary_sentiment\">Needs Improvement.</span>", $assessment->getSentiment());
    }

    public function testCanGetSummary()
    {
        $assessment = new Usable([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $this->assertNotEmpty($assessment->getSummary());
    }

    public function testCanGetOpportunities()
    {
        $assessment = new Usable([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $this->assertIsArray($assessment->getOpportunities());
    }

    public function testCanAddOpportunity()
    {
        $assessment = new Usable([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $opportunity = new TestResult();
        $assessment->addOpportunity($opportunity);

        $this->assertContains($opportunity, $assessment->getOpportunities());
    }

    public function testCanSetOpportunities()
    {
        $assessment = new Usable([
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
        $assessment = new Usable([
            'num_recommended' => 1,
            'fcpCheck' => 5,
        ]);

        $this->assertEquals(1, $assessment->getNumRecommended());
    }

    public function testCanSetNumRecommended()
    {
        $assessment = new Usable([
            'num_recommended' => 1
        ]);

        $assessment->setNumRecommended(3);

        $this->assertEquals(3, $assessment->getNumRecommended());
    }

    public function testCanGetNumExperiments()
    {
        $assessment = new Usable([
            'num_experiments' => 1
        ]);

        $this->assertEquals(1, $assessment->getNumExperiments());
    }

    public function testCanSetNumExperiments()
    {
        $assessment = new Usable([
            'num_experiments' => 1
        ]);

        $assessment->setNumExperiments(3);
        $this->assertEquals(3, $assessment->getNumExperiments());
    }
}
