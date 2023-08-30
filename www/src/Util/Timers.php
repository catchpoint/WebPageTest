<?php

declare(strict_types=1);

namespace WebPageTest\Util;

class Timers
{
    private $timers = [];

    public function startTimer($name, $description = null)
    {
        $this->timers[$name] = [
            'start' => microtime(true),
            'desc' => $description,
        ];
    }

    public function endTimer($name)
    {
        $this->timers[$name]['end'] = microtime(true);
    }

    public function getTimers()
    {
        $metrics = [];

        if (count($this->timers)) {
            foreach ($this->timers as $name => $timer) {
                if (isset($timer['end']) && isset($timer['start'])) {
                    $timeTaken = ($timer['end'] - $timer['start']) * 1000;
                    $output = sprintf('%s;dur=%f', $name, $timeTaken);

                    if ($timer['desc'] != null) {
                        $output .= sprintf(';desc="%s"', addslashes($timer['desc']));
                    }
                    $metrics[] = $output;
                }
            }
        }
        if (empty($metrics)) {
            return null;
        } else {
            return implode(', ', $metrics);
        }
    }
}
