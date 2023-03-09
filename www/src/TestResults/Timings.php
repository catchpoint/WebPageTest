<?php

declare(strict_types=1);

namespace WebPageTest\TestResults;

class Timings
{
    private const NO_METRIC_STRING = "-";

    public const ELEMENT = 'elementTiming.';
    public const USER = 'userTime.';

    private $runResults;
    private $numSteps;

    /**
     * @param mixed $runResults Run results to use for the table (TestRunResults)
     */
    public function __construct($runResults)
    {
        $this->runResults = $runResults;
        $this->numSteps = $this->runResults->countSteps();
    }

    /**
     * @return array All metrics for a step with keys 'element', 'user', 'navigation'
     */
    public function getAllForStep(int $stepNum): array
    {
        $idx = $stepNum - 1;
        return [
            'element' => $this->getElementTimings()[$idx],
            'user' => $this->getUserTimings()[$idx],
            'navigation' => $this->getNavigationTimings()[$idx],
        ];
    }

    /**
     * @return array Nav timings indexed by step
     */
    public function getNavigationTimings(): array
    {
        $timings = [];
        if (
            !$this->runResults->hasValidMetric("loadEventStart") &&
            !$this->runResults->hasValidMetric("domContentLoadedEventStart")
        ) {
            return $timings;
        }

        for ($i = 0; $i < $this->numSteps; $i++) {
            $stepResult = $this->runResults->getStepResult($i + 1);
            $timings[$i] = [
                'domContentLoadedEvent' =>
                    $this->getTimeRangeMetric($stepResult, 'domContentLoadedEventStart', 'domContentLoadedEventEnd'),
                'loadEvent' => $this->getTimeRangeMetric($stepResult, 'loadEventStart', 'loadEventEnd'),
            ];
        }
        return $timings;
    }

    /**
     * @return array User timings (from performance.mark() calls) indexed by step
     */
    public function getUserTimings(): array
    {
        return $this->getTimingsByType(self::USER);
    }

    /**
     * @return array Element timings (from elementtiming HTML arrtibutes) indexed by step
     */
    public function getElementTimings(): array
    {
        return $this->getTimingsByType(self::ELEMENT);
    }

    /**
     * @param string $type One of Timings::ELEMENT or Timings::USER
     */
    private function getTimingsByType(string $type): array
    {
        $timings = [];
        for ($i = 0; $i < $this->numSteps; $i++) {
            $stepResult = $this->runResults->getStepResult($i + 1);
            $data = $stepResult->getRawResults();
            $timings[$i] = [];
            $len = strlen($type);
            foreach ($data as $metric => $value) {
                if (substr($metric, 0, $len) === $type) {
                    $timings[$i][substr($metric, $len)] = $value === 0 ? '0s' : number_format($value / 1000, 3) . 's';
                }
            }
        }
        return $timings;
    }

    /**
     * @return string Single formatted metric
     */
    private function getTimeMetric($stepResult, $metric, $default = self::NO_METRIC_STRING): string
    {
        $value = $stepResult->getMetric($metric);
        if ($value === null) {
            return $default;
        }
        if ($value === 0) {
            return '0s';
        }
        return number_format($value / 1000.0, 3) . "s";
    }

    /**
     * @return string Range of 2 metrics, formatted like `(start - end)`
     */
    private function getTimeRangeMetric($stepResult, $startMetric, $endMetric)
    {
        $startValue = $this->getTimeMetric($stepResult, $startMetric, '?');
        $endValue = $this->getTimeMetric($stepResult, $endMetric, '?');
        $out = $startValue . ' - ' . $endValue;
        if ($startValue !== '?' && $endValue !== '?') {
            $diff = $stepResult->getMetric($endMetric) - $stepResult->getMetric($startMetric);
            if ($diff !== 0) {
                $diff = number_format($diff / 1000.0, 3);
            }
            $out .= sprintf(' (%ss)', $diff);
        }
        return $out;
    }
}
