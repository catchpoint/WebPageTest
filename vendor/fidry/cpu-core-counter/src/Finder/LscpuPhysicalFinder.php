<?php

/*
 * This file is part of the Fidry CPUCounter Config package.
 *
 * (c) Théo FIDRY <theo.fidry@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

namespace Fidry\CpuCoreCounter\Finder;

use function count;
use function explode;
use function is_array;
use function preg_grep;
use function strtok;
use const PHP_EOL;

/**
 * The number of physical processors.
 *
 * @see https://stackoverflow.com/a/23378780/5846754
 */
final class LscpuPhysicalFinder extends ProcOpenBasedFinder
{
    public function toString(): string
    {
        return 'LscpuPhysicalFinder';
    }

    public function getCommand(): string
    {
        return 'lscpu -p';
    }

    protected function countCpuCores(string $process): ?int
    {
        $lines = explode(PHP_EOL, $process);
        $actualLines = preg_grep('/^\d+/', $lines);

        if (!is_array($actualLines)) {
            return null;
        }

        $cores = [];
        foreach ($actualLines as $line) {
            strtok($line, ',');
            $core = strtok(',');

            if (false === $core) {
                continue;
            }

            $cores[$core] = true;
        }
        unset($cores['-']);

        $count = count($cores);

        return 0 === $count ? null : $count;
    }
}
