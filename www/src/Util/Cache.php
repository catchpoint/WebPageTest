<?php

declare(strict_types=1);

namespace WebPageTest\Util;

use WebPageTest\Plan;
use WebPageTest\PlanList;

class Cache
{
    /*
     * params
     * string $key
     * string|array $value
     * int $ttl default 0
     *
     * returns bool
     */
    /**
     * @param array|false|string $value
     */
    public static function store(string $key, $value, int $ttl = 0): bool
    {
        $ret = false;
        // namespace the keys by installation
        $key = sha1(__DIR__) . $key;
        if (isset($value)) {
            if (function_exists('apcu_store')) {
                $ret = apcu_store($key, $value, $ttl);
            } elseif (function_exists('apc_store')) {
                $ret = apc_store($key, $value, $ttl);
            }
        }
        return $ret;
    }


    /*
     * returns string|array|null
     */
    public static function fetch(string $key)
    {
        $ret = null;
        $success = false;
        // namespace the keys by installation
        $key = \sha1(__DIR__) . $key;
        if (\function_exists('apcu_fetch')) {
            $ret = \apcu_fetch($key, $success);
            if (!$success) {
                $ret = null;
            }
        } elseif (\function_exists('apc_fetch')) {
            $ret = \apc_fetch($key, $success);
            if (!$success) {
                $ret = null;
            }
        }
        return $ret;
    }

    public static function storeWptPlans(PlanList $plan_list): bool
    {
        return self::store('WPT_PLANS', json_encode($plan_list), 0);
    }

    /*
     * @return PlanList|null
     */
    public static function fetchWptPlans()
    {
        $fetched = self::fetch('WPT_PLANS');
        if ($fetched && !empty($fetched)) {
            $arr = json_decode($fetched);
            if (!empty($arr)) {
                $plans = array_map(function ($opts) {
                    return new Plan((array)$opts);
                }, $arr);
                return new PlanList(...$plans);
            }
        }

        return null;
    }
}
