<?php

declare(strict_types=1);

namespace WebPageTest\OE\Assessment;

use JsonSerializable;
use WebPageTest\OE\TestResult;
use WebPageTest\OE\Assessment;
use WebPageTest\OE\Assessment\Types as AssessmentType;

class Resilient implements Assessment, JsonSerializable
{
    private string $type;
    private string $grade = "";
    private string $sentiment = "";
    private string $summary = "";
    private array $opportunities = [];
    private int $num_recommended = 0;
    private int $num_experiments = 0;
    private int $num_good = 0;
    private int $num_bad = 0;


    // Custom attributs
    private $jsLibsVulns;
    private $blocking3pReqs;
    private $numVulns;
    private $num_high;
    private $num_medium;
    private $num_low;
    private $genContentSize;
    private $genContentPercent;

    public function __construct(array $options)
    {
        $this->type = AssessmentType::RESILIENT;
        $this->grade = "";
        $this->sentiment = "";
        $this->summary = "";
        $this->opportunities = $options['opportunities'] ?? [];
        $this->num_recommended = $options['num_recommended'] ?? 0;
        $this->num_experiments = $options['num_experiments'] ?? 0;
        $this->num_good = $options['num_good'] ?? 0;
        $this->num_bad = $options['num_bad'] ?? 0;

        // Custom attributes
        $this->jsLibsVulns = null;
        $this->blocking3pReqs = null;
        $this->numVulns = null;
        $this->num_high = null;
        $this->num_medium = null;
        $this->num_low = null;
        $this->genContentSize = null;
        $this->genContentPercent = null;
    }


    public function getGrade(): string
    {
        if (!empty($this->grade)) {
            return $this->grade;
        }

        if ($this->num_recommended > 2 && $this->blocking3pReqs > 0) {
            $this->grade = "f";
        } elseif ($this->num_recommended > 0) {
            $this->grade = "c";
        } else {
            $this->grade = "a";
        }
        return $this->grade;
    }

    public function getSentiment(): string
    {
        if (!empty($this->sentiment)) {
            return $this->sentiment;
        }

        $sentiment = "";
        $grade = $this->getGrade();
        if ($grade == 'a') {
            $sentiment = "<span class=\"opportunity_summary_sentiment\">Looks great!</span>";
        } elseif ($grade == 'c') {
            $sentiment = "<span class=\"opportunity_summary_sentiment\">Not bad...</span>";
        } elseif ($grade == 'f') {
            $sentiment = "<span class=\"opportunity_summary_sentiment\">Needs Improvement.</span>";
        }
        $this->sentiment = $sentiment;
        return $this->sentiment;
    }

    public function getSummary(): string
    {
        if (empty($this->summary)) {
            $this->summary = $this->buildSummary();
        }
        return $this->summary;
    }

    public function getOpportunities(): array
    {
        return $this->opportunities;
    }

    public function addOpportunity(TestResult $opportunity): void
    {
        $this->opportunities[] = $opportunity;
    }

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
        if (!empty($attrs)) {
            if (!empty($attrs['jsLibsVulns'])) {
                $this->jsLibsVulns = $attrs['jsLibsVulns'];
            }
            if (!empty($attrs['blocking3pReqs'])) {
                $this->blocking3pReqs = $attrs['blocking3pReqs'];
            }
            if (!empty($attrs['numVulns'])) {
                $this->numVulns = $attrs['numVulns'];
            }
            if (!empty($attrs['num_high'])) {
                $this->num_high = $attrs['num_high'];
            }
            if (!empty($attrs['num_medium'])) {
                $this->num_medium = $attrs['num_medium'];
            }
            if (!empty($attrs['num_low'])) {
                $this->num_low = $attrs['num_low'];
            }
            if (!empty($attrs['genContentSize'])) {
                $this->genContentSize = $attrs['genContentSize'];
            }
            if (!empty($attrs['genContentPercent'])) {
                $this->genContentPercent = $attrs['genContentPercent'];
            }
        }
    }

    private function buildSummary(): string
    {
        $jsLibsVulns = $this->jsLibsVulns;
        $blocking3pReqs = $this->blocking3pReqs;
        $numVulns = $this->numVulns;
        $num_high = $this->num_high;
        $num_medium = $this->num_medium;
        $num_low = $this->num_low;
        $genContentSize = $this->genContentSize;
        $genContentPercent = $this->genContentPercent;

          // build sentiment
        $summary = "This site ";
        if (!is_null($blocking3pReqs)) {
            if (count($blocking3pReqs) > 2) {
                $summary .= "had many";
            } elseif (count($blocking3pReqs) > 0) {
                $summary .= "had";
            } else {
                $summary .= "had no";
            }
            $summary .= " render-blocking 3rd party requests that could be a single point of failure.";
        }
        if ($jsLibsVulns) {
            (!is_null($blocking3pReqs)) ? $summary .= " It had $numVulns security issues" : $summary .= "had $numVulns security issues";
            if ($num_high > 0) {
                $summary .= ", $num_high high-priority";
            } elseif ($num_medium > 0) {
                $summary .= ", $num_medium low-priority";
            } elseif ($num_low > 0) {
                $summary .= ", $num_low low-priority";
            }

            $summary .= ".";
        } else {
            (!is_null($blocking3pReqs)) ? $summary .= " It had no security issues." : $summary .= "had no security issues.";
        }
        if (!is_null($genContentSize) && !is_null($genContentPercent)) {
            $genContentSize = floatval($genContentSize);
            $genContentPercent = floatval($genContentPercent);

            if ($genContentSize > .5 || $genContentPercent > 1) {
                $summary .= " Some HTML was generated after delivery, which can cause fragility.";
            } else {
                $summary .= " HTML content was mostly generated server-side.";
            }
        }

          return $summary;
    }
}
