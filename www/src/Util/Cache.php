<?php

declare(strict_types=1);

namespace WebPageTest\Util;

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
}
