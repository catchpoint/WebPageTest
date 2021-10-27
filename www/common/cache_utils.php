<?php declare(strict_types=1);

class CacheUtils {
  public static function cache_store (string $key, array $value, int $ttl=0) : bool {
    $key = sha1(__DIR__) . $key;
    if (isset($value)) {
      if (function_exists('apcu_store')) {
        apcu_store($key, $value, $ttl);
        return true;
      } elseif (function_exists('apc_store')) {
        apc_store($key, $value, $ttl);
        return true;
      } else {
        return false;
      }
    }
  }

  public static function cache_fetch ($key) : array {
    $ret = array();
    $success = false;

    $key = sha1(__DIR__) . $key;
    if (function_exists('apcu_fetch')) {
      $ret = apcu_fetch($key, $success);
      if (!$success) {
        $ret = array();
      }
    } elseif (function_exists('apc_fetch')) {
      $ret = apc_fetch($key, $success);
      if (!$success) {
        $ret = array();
      }
    }
    return $ret;
  }
}
