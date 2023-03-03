<?php

declare(strict_types=1);

namespace WebPageTest\OE\Assessment;

use JsonSerializable;
use WebPageTest\OE\TestResult;
use WebPageTest\OE\Assessment;
use WebPageTest\OE\Assessment\Types as AssessmentType;

class Usable implements Assessment, JsonSerializable
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
    private $tbtCheck;
    private $cls;
    private $axe_num_violations;
    private $axe_num_critical;
    private $axe_num_serious;
    private $genContentSize;
    private $genContentPercent;

    public function __construct(array $options)
    {
        $this->type = AssessmentType::USABLE;
        $this->grade = "";
        $this->sentiment = "";
        $this->summary = "";
        $this->opportunities = $options['opportunities'] ?? [];
        $this->num_recommended = $options['num_recommended'] ?? 0;
        $this->num_experiments = $options['num_experiments'] ?? 0;
        $this->num_good = $options['num_good'] ?? 0;
        $this->num_bad = $options['num_bad'] ?? 0;

        // Custom attributes
        $this->tbtCheck = null;
        $this->cls = null;
        $this->axe_num_violations = null;
        $this->axe_num_critical = null;
        $this->axe_num_serious = null;
        $this->genContentSize = null;
        $this->genContentPercent = null;
    }


    public function getGrade(): string
    {
        if (!empty($this->grade)) {
            return $this->grade;
        }

        if (
            $this->num_recommended > 2 &&
            (
            (!is_null($this->cls) && $this->cls > 0) ||
            (!is_null($this->tbtCheck) && $this->tbtCheck > 2)
            )
        ) {
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
            if (!empty($attrs['tbtCheck'])) {
                $this->tbtCheck = $attrs['tbtCheck'];
            }
            if (!empty($attrs['cls'])) {
                $this->cls = $attrs['cls'];
            }
            if (!empty($attrs['axe_num_violations'])) {
                $this->axe_num_violations = $attrs['axe_num_violations'];
            }
            if (!empty($attrs['axe_num_critical'])) {
                $this->axe_num_critical = $attrs['axe_num_critical'];
            }
            if (!empty($attrs['axe_num_serious'])) {
                $this->axe_num_serious = $attrs['axe_num_serious'];
            }
            if (!empty($attrs['genContentSize'])) {
                $this->genContentSize = $attrs['genContentSize'];
            }
            if (!empty($attrs['genContentPercent'])) {
                $this->genContentPercent = $attrs['genContentPercent'];
            }
        }
    }

    public function getCustomAttributes(): array
    {
        $tbtCheck = $this->tbtCheck;
        $cls = $this->cls;
        $axe_num_violations = $this->axe_num_violations;
        $axe_num_critical = $this->axe_num_critical;
        $axe_num_serious = $this->axe_num_serious;
        $genContentSize = $this->genContentSize;
        $genContentPercent = $this->genContentPercent;

        return [
            'tbtCheck' => $tbtCheck,
            'cls' => $cls,
            'axe_num_violations' => $axe_num_violations,
            'axe_num_critical' => $axe_num_critical,
            'axe_num_serious' => $axe_num_serious,
            'genContentSize' => $genContentSize,
            'genContentPercent' => $genContentPercent
        ];
    }

    private function buildSummary(): string
    {

        $tbtCheck = $this->tbtCheck;
        $cls = $this->cls;
        $axe_num_violations = $this->axe_num_violations;
        $axe_num_critical = $this->axe_num_critical;
        $axe_num_serious = $this->axe_num_serious;
        $genContentSize = $this->genContentSize;
        $genContentPercent = $this->genContentPercent;

        // build sentiment
        $summary = "This site ";
        if (!is_null($cls)) {
            if ($cls > .25) {
                $summary .= "had major layout shifts";
            } elseif ($cls > 0) {
                $summary .= "had minor layout shifts";
            } else {
                $summary .= "had good layout stability";
            }
            $summary .= ".";
        }

        if (!is_null($tbtCheck)) {
            (!is_null($cls)) ? $summary .= " It took" : $summary .= "took";
            if ($tbtCheck > 1000) {
                $summary .= " a long time";
            } elseif ($tbtCheck > 500) {
                $summary .= " some time";
            } else {
                $summary .= " little time";
            }
            $summary .= " to become interactive. ";
        }

        if ($axe_num_violations > 0) {
            $summary .= " It had $axe_num_violations accessibility issues, ";
            if ($axe_num_critical > 0) {
                $summary .= " $axe_num_critical critical";
            } elseif ($axe_num_serious > 0) {
                $summary .= "$axe_num_serious serious";
            } else {
                $summary .= " none serious";
            }
            $summary .= ".";
        }
        if (!is_null($genContentSize) && !is_null($genContentPercent)) {
            $genContentSize = floatval($genContentSize);
            $genContentPercent = floatval($genContentPercent);

            if ($genContentSize > .5 || $genContentPercent > 1) {
                $summary .= " Some HTML was generated after delivery, potentially delaying usability.";
            } else {
                $summary .= " HTML content was mostly generated server-side.";
            }
        }

        return $summary;
    }
}
