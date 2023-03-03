<?php

declare(strict_types=1);

namespace WebPageTest\OE;

use WebPageTest\OE\TestResult;

interface Assessment
{
    public function getGrade(): string;
    public function getSentiment(): string;
    public function getSummary(): string;
    public function getOpportunities(): array;
    public function addOpportunity(TestResult $opportunity): void;
    public function setOpportunities(array $opportunities): void;
    public function getNumRecommended(): int;
    public function setNumRecommended(int $num_recommended): void;
    public function getNumExperiments(): int;
    public function setNumExperiments(int $num_experiments): void;
    public function getNumGood(): int;
    public function setNumGood(int $num_good): void;
    public function getNumBad(): int;
    public function setNumBad(int $num_bad): void;
    public function loadCustomAttributes(array $attrs): void;
    public function jsonSerialize();
}
