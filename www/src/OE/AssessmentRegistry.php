<?php

declare(strict_types=1);

namespace WebPageTest\OE;

use WebPageTest\OE\TestResult;
use WebPageTest\OE\Assessment;
use WebPageTest\OE\Assessment\Quick as QuickAssessment;
use WebPageTest\OE\Assessment\Usable as UsableAssessment;
use WebPageTest\OE\Assessment\Resilient as ResilientAssessment;
use WebPageTest\OE\Assessment\Custom as CustomAssessment;
use WebPageTest\OE\Assessment\Types as AssessmentType;

class AssessmentRegistry
{
    /**
     * @var \WebPageTest\OE\AssessmentRegistry|null $instance
     */
    private static $instance = null;

    /**
     * @var array { string: \WebPageTest\OE\Assessment } $assessments
     */
    private array $assessments;

    private bool $is_built = false;

    private function __construct()
    {
        $this->assessments = [
            AssessmentType::QUICK => new QuickAssessment([]),
            AssessmentType::USABLE => new UsableAssessment([]),
            AssessmentType::RESILIENT => new ResilientAssessment([]),
            AssessmentType::CUSTOM => new CustomAssessment([]),
        ];
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new AssessmentRegistry();
        }

        return self::$instance;
    }

    /**
     * @param AssessmentType::QUICK|AssessmentType::USABLE|AssessmentType::RESILIENT|AssessmentType::CUSTOM $category
     * @param TestResult $opportunity
     **/
    public function register(string $category, TestResult $opportunity): void
    {
        $this->assessments[$category]->addOpportunity($opportunity);
    }

    /**
     * @param AssessmentType::QUICK|AssessmentType::USABLE|AssessmentType::RESILIENT|AssessmentType::CUSTOM $category
     * @param array { TestResult } $opportunities
     **/
    public function registerMultiple(string $category, array $opportunities): void
    {
        $this->assessments[$category]->setOpportunities($opportunities);
    }

    /**
     * @return array<array-key, Assessment>
     **/
    public function getAll()
    {
        if ($this->is_built) {
            return $this->assessments;
        } else {
            $this->assessments = $this->buildAssessments();
            $this->is_built = true;
            return $this->assessments;
        }
    }

    private function buildAssessments(): array
    {
        $assessments = $this->assessments;
        // fill out high-level info in
        foreach ($assessments as $key => $cat) {
            /**
             * @var array { \WebPageTest\OE\TestResult } $opps
             * */
            $opps = $assessments[$key]->getOpportunities();
            $num_checks = count($opps);
            $num_experiments = 0;
            $check_titles = [];
            $opp_titles = [];
            $num_good = 0;
            $custom_attributes = [];
            foreach ($opps as $op) {
                if ($op->isGood()) {
                    $num_good++;
                    array_push($check_titles, $op->getTitle());
                } elseif (count($op->getExperiments()) > 0) {
                    array_push($opp_titles, $op->getTitle());
                    $num_experiments += count($op->getExperiments());
                }

                array_push($custom_attributes, $op->getCustomAttributes());
            }
            $num_recommended = $num_checks - $num_good;

            $assessments[$key]->setNumRecommended($num_recommended);
            $assessments[$key]->setNumExperiments($num_experiments);
            $assessments[$key]->setNumGood($num_good);
            $assessments[$key]->setNumBad($num_checks - $num_good);
            $assessments[$key]->loadCustomAttributes(array_merge([], ...$custom_attributes));
        }

        return $assessments;
    }
}
