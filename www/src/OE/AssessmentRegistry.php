<?php

namespace WebPageTest\OE;

use WebPageTest\OE\TestResult;

class AssessmentRegistry
{
    private static $instance = null;

    public const QUICK = 'Quick';
    public const USABLE = 'Usable';
    public const RESILIENT = 'Resilient';
    public const CUSTOM = 'Custom';

    private $assessments = [
        self::QUICK => [
            'grade' => '',
            'sentiment' => '',
            'summary' => '',
            'opportunities' => [],
            'num_recommended' => 0,
            'num_experiments' => 0
        ],
        self::USABLE => [
            'grade' => '',
            'sentiment' => '',
            'summary' => '',
            'opportunities' => [],
            'num_recommended' => 0,
            'num_experiments' => 0
        ],
        self::RESILIENT => [
            'grade' => '',
            'sentiment' => '',
            'summary' => '',
            'opportunities' => [],
            'num_recommended' => 0,
            'num_experiments' => 0
        ],
        self::CUSTOM => [
            'grade' => '',
            'sentiment' => 'Advanced!',
            'summary' => '',
            'opportunities' => [],
            'num_recommended' => 0,
            'num_experiments' => 0
        ],
    ];

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new AssessmentRegistry();
        }

        return self::$instance;
    }

    public function register($category, TestResult $opportunity): void
    {
        $this->assessments[$category]['opportunities'][] = $opportunity;
    }

    public function registerMultiple($category, array $opportunities): void
    {
        array_push($this->assessments[$category]['opportunities'], ...$opportunities);
    }

    public function getAll()
    {
        return $this->assessments;
    }
}
