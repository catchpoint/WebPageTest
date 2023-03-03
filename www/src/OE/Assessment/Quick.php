<?php

declare(strict_types=1);

namespace WebPageTest\OE\Assessment;

use JsonSerializable;
use WebPageTest\OE\TestResult;
use WebPageTest\OE\Assessment;
use WebPageTest\OE\Assessment\Types as AssessmentType;

class Quick implements Assessment, JsonSerializable
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

    // Custom attributes
    private $ttfbCheck;
    private $fcpCheck;
    private $blockingCSSReqs;
    private $blockingJSReqs;
    private $lcp_time;

    public function __construct(array $options)
    {
        $this->type = AssessmentType::QUICK;
        $this->grade = "";
        $this->sentiment = "";
        $this->summary = "";
        $this->opportunities = $options['opportunities'] ?? [];
        $this->num_recommended = $options['num_recommended'] ?? 0;
        $this->num_experiments = $options['num_experiments'] ?? 0;
        $this->num_good = $options['num_good'] ?? 0;
        $this->num_bad = $options['num_bad'] ?? 0;

        // Custom attributes
        $this->ttfbCheck = null;
        $this->fcpCheck = null;
        $this->blockingCSSReqs = null;
        $this->blockingJSReqs = null;
        $this->lcp_time = null;
    }


    public function getGrade(): string
    {
        if (!empty($this->grade)) {
            return $this->grade;
        }

        if ($this->num_recommended > 2 && $this->fcpCheck > 3) {
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
            if (!empty($attrs['ttfbCheck'])) {
                $this->ttfbCheck = $attrs['ttfbCheck'];
            }
            if (!empty($attrs['fcpCheck'])) {
                $this->fcpCheck = $attrs['fcpCheck'];
            }
            if (!empty($attrs['blockingCSSReqs'])) {
                $this->blockingCSSReqs = $attrs['blockingCSSReqs'];
            }
            if (!empty($attrs['blockingJSReqs'])) {
                $this->blockingJSReqs = $attrs['blockingJSReqs'];
            }
            if (!empty($attrs['lcp_time'])) {
                $this->lcp_time = $attrs['lcp_time'];
            }
        }
    }

    private function buildSummary(): string
    {
        $ttfbCheck = $this->ttfbCheck;
        $fcpCheck = $this->fcpCheck;
        $blockingCSSReqs = $this->blockingCSSReqs;
        $blockingJSReqs = $this->blockingJSReqs;
        $lcp_time = $this->lcp_time;

        // build sentiment
        $summary = "This site ";
        if ($ttfbCheck > 2000) {
            $summary .= "was very slow";
        } elseif ($ttfbCheck > 1000) {
            $summary .= "took little time";
        } else {
            $summary .= "was quick";
        }
        $summary .= " to connect and deliver initial code. It began rendering content";

        $fcpCheck = $fcpCheck / 1000;
        if ($fcpCheck > 5) {
            $summary .= " with considerable delay.";
        } elseif ($fcpCheck > 2) {
            $summary .= " with little delay.";
        } else {
            $summary .= " very quickly.";
        }

        if (!is_null($blockingCSSReqs) && !is_null($blockingJSReqs) && (count($blockingCSSReqs) > 0 || count($blockingJSReqs) > 0)) {
             $summary .= " There were " . ( count($blockingCSSReqs) + count($blockingJSReqs) ) . " render-blocking requests.";
        } else {
            $summary .= " There were no render-blocking requests.";
        }

        if (!is_null($lcp_time)) {
            $summary .= " The largest content rendered ";
            if ($lcp_time > 3500) {
                $summary .= " later than ideal.";
            } elseif ($lcp_time > 2500) {
                $summary .= " a little late.";
            } else {
                $summary .= " quickly.";
            }
        }

        return $summary;
    }
}
