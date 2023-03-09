<?php

declare(strict_types=1);

namespace WebPageTest\TestResults;

use WebPageTest\Util\CustomMetricFiles;

class CustomMetrics
{
    public const ALL = 1;
    public const FROM_FILES = 2;
    public const FROM_TEST_SETTINGS = 3;

    private $runResults;
    private $numSteps;

    private $agentMetrics = ['jsLibsVulns', 'securityHeaders'];

    /**
     * @param mixed $runResults Run results to use for the table (TestRunResults)
     */
    public function __construct($runResults)
    {
        $this->runResults = $runResults;
        $this->numSteps = $this->runResults->countSteps();
    }

    /**
     * @param string $source One of CustomMetrics::ALL, CustomMetrics::FROM_FILES or CustomMetrics::FROM_TEST_SETTINGS
     */
    public function getBySource(int $source = self::ALL): array
    {
        $ignore = [];
        if ($source === self::FROM_TEST_SETTINGS) {
            $ignore = array_merge(CustomMetricFiles::getKeys(), $this->agentMetrics);
        }

        $metrics = [];
        for ($i = 0; $i < $this->numSteps; $i++) {
            $stepResult = $this->runResults->getStepResult($i + 1);
            $data = $stepResult->getRawResults();
            $metrics[$i] = [];
            if (!empty($data['custom'])) {
                foreach ($data['custom'] as $metric) {
                    if (isset($data[$metric])) {
                        $value = $data[$metric];
                        if (is_double($value)) {
                            $value = number_format($value, 3, '.', '');
                        }
                        if (!in_array($metric, $ignore)) {
                            $metrics[$i][$metric] = $value;
                        }
                    }
                }
            }
        }
        return $metrics;
    }
}
