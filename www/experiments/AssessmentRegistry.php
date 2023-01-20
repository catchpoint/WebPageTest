<?php

class AssessmentRegistry
{
    private static $instance = null;

    const Quick = 'Quick';
    const Usable = 'Usable';
    const Resilient = 'Resilient';
    const Custom = 'Custom';

    private $assessments = [
        self::Quick => [
            'grade' => '',
            'sentiment' => '',
            'summary' => '',
            'opportunities' => [],
            'num_recommended' => 0,
            'num_experiments' => 0
        ],
        self::Usable => [
            'grade' => '',
            'sentiment' => '',
            'summary' => '',
            'opportunities' => [],
            'num_recommended' => 0,
            'num_experiments' => 0
        ],
        self::Resilient => [
            'grade' => '',
            'sentiment' => '',
            'summary' => '',
            'opportunities' => [],
            'num_recommended' => 0,
            'num_experiments' => 0
        ],
        self::Custom => [
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

    public function register($category, $opportunity)
    {
        $this->assessments[$category]['opportunities'][] = $opportunity;
    }

    public function getAll()
    {
        return $this->assessments;
    }
}
