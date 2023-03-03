<?php

declare(strict_types=1);

namespace WebPageTest\OE\Assessment;

use JsonSerializable;
use WebPageTest\OE\TestResult;
use WebPageTest\OE\Assessment;
use WebPageTest\OE\Assessment\Types as AssessmentType;

class Custom implements Assessment, JsonSerializable
{
    private string $type;
    private string $grade;
    private string $sentiment;
    private string $summary;
    /*
     *@var array { TestResult } $opportunities
     */
    private array $opportunities;
    private int $num_recommended;
    private int $num_experiments;
    private int $num_good;
    private int $num_bad;

    public function __construct(array $options)
    {
        $this->type = AssessmentType::CUSTOM;
        $this->grade = "";
        $this->sentiment = "<span class=\"opportunity_summary_sentiment\">Advanced.</span>";
        $this->summary = "Use this section to create custom experiments to add to your test.";
        $this->opportunities = $options['opportunities'] ?? [];
        $this->num_recommended = $options['num_recommended'] ?? 0;
        $this->num_experiments = $options['num_experiments'] ?? 0;
        $this->num_good = $options['num_good'] ?? 0;
        $this->num_bad = $options['num_bad'] ?? 0;
    }


    public function getGrade(): string
    {
        return $this->grade;
    }

    public function getSentiment(): string
    {
        return $this->sentiment;
    }

    public function getSummary(): string
    {
        return $this->summary;
    }

    /**
     * @return Array<TestResult>
     **/
    public function getOpportunities(): array
    {
        return $this->opportunities;
    }

    public function addOpportunity(TestResult $opportunity): void
    {
        $this->opportunities[] = $opportunity;
    }

    /**
     * @param Array<TestResult> $opportunities
     **/
    public function setOpportunities(array $opportunities): void
    {
        $this->opportunities = $opportunities;
    }

    public function getNumRecommended(): int
    {
        return $this->num_recommended;
    }

    public function setNumRecommended(int $num_recommended): void
    {
        $this->num_recommended = $num_recommended;
    }

    public function getNumExperiments(): int
    {
        return $this->num_experiments;
    }

    public function setNumExperiments(int $num_experiments): void
    {
        $this->num_experiments = $num_experiments;
    }

    public function getNumGood(): int
    {
        return $this->num_good;
    }

    public function setNumGood(int $num_good): void
    {
        $this->num_good = $num_good;
    }

    public function getNumBad(): int
    {
        return $this->num_bad;
    }

    public function setNumBad(int $num_bad): void
    {
        $this->num_bad = $num_bad;
    }

    public function jsonSerialize()
    {
        return [
            'type' => $this->type,
            'grade' => $this->grade,
            'sentiment' => $this->sentiment,
            'summary' => $this->getSummary(),
            'opportunities' => json_encode($this->opportunities),
            'numRecommended' => $this->num_recommended,
            'numGood' => $this->num_good,
            'numBad' => $this->num_bad
        ];
    }

    public function loadCustomAttributes(array $attrs): void
    {
    }
}
