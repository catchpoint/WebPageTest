<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\Util\Cache;

class RateLimiter
{
    public function __construct(string $ip, int $limit = 50, int $days = 28)
    {
        $this->ip = $ip;
        $this->limit = $limit;
        $this->day_cycle_ttl = $days * (24 * 60 * 60);
        $this->cache_key = 'rladdr_' . 'per_month_' . $ip;
        $this->bucket = array();
    }

    public function check(?int $run_count): bool
    {
        $times_to_add = $run_count ?? 1;
        $bucket = $this->fetchBucket();
        if (count($bucket) >= $this->limit) {
            return false;
        } else {
            array_push($bucket, ...array_fill(0, $times_to_add, time()));
            $this->storeBucket($bucket);
        }
        return true;
    }

    private function fetchBucket(): array
    {
        $bucket = Cache::fetch($this->cache_key);
        $bucket = is_array($bucket) ? $bucket : array($bucket);
        return array_filter($bucket, function ($value) {
            $time_constraint = time() - $this->day_cycle_ttl;
            return $time_constraint < $value;
        }, ARRAY_FILTER_USE_BOTH);
    }

    private function storeBucket(array $bucket): void
    {
        $success = Cache::store($this->cache_key, $bucket, $this->day_cycle_ttl);
        if ($success) {
            $this->bucket = $bucket;
        }
    }
}
