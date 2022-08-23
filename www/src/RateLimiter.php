<?php

declare(strict_types=1);

namespace WebPageTest;

use Predis\Client as RedisClient;

class RateLimiter
{
    private RedisClient $client;
    private int $limit;
    private int $day_cycle_ttl;
    private string $cache_key;

    public function __construct(RedisClient $client, string $ip, int $limit = 50, int $days = 28)
    {
        $this->client = $client;
        $this->limit = $limit;
        $this->day_cycle_ttl = $days * (24 * 60 * 60);
        $this->cache_key = 'rladdr_' . 'per_month_' . $ip;
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
        $bucket = $this->client->get($this->cache_key);
        $bucket = is_array($bucket) ? $bucket : array($bucket);
        return array_filter($bucket, function ($value) {
            $time_constraint = time() - $this->day_cycle_ttl;
            return $time_constraint < $value;
        }, ARRAY_FILTER_USE_BOTH);
    }

    private function storeBucket(array $bucket): bool
    {
        try {
            $this->client->set($this->cache_key, $bucket, null, $this->day_cycle_ttl);
        } catch (\Exception $e) {
            error_log($e->getMessage());
            return false;
        }

        return true;
    }
}
