<?php

declare(strict_types=1);

namespace WebPageTest\Util;

class CustomMetricFiles
{
    /**
     * Check settings/custom_metrics and settings/common/custom_metrics
     * for .js files. Optionally /js/conditional_metrics/ is read too
     * but with given base filenames
     *
     * @param array $conditional A list of conditional metric names
     * @return array Assoc array with metric name => JS code to extract it
     */
    public static function get(array $conditional = []): array
    {
        $customMetrics = [];
        foreach ($conditional as $name) {
            $path = realpath(ASSETS_PATH . '/js/conditional_metrics/' . $name . '.js');
            if ($path) {
                $customMetrics[$name] = file_get_contents($path);
            }
        }

        $files = self::getFilenames();

        foreach ($files as $file) {
            $name = basename($file, '.js');
            $code = file_get_contents($file);
            $customMetrics[$name] = $code;
        }
        return $customMetrics;
    }

    /**
     * Find JS files in settings/custom_metrics and settings/common/custom_metrics
     * and optionally in assets/js/conditional_metrics
     *
     * @param bool $include_conditional TRUE if conditional_metrics are to be included
     * @return array List of abs paths to .js files
     */
    public static function getFilenames($include_conditional = false): array
    {
        $files = [];
        if (is_dir(SETTINGS_PATH . '/custom_metrics')) {
            $files = glob(SETTINGS_PATH . '/custom_metrics/*.js') ?? [];
        }

        if (is_dir(SETTINGS_PATH . '/common/custom_metrics')) {
            $common = glob(SETTINGS_PATH . '/common/custom_metrics/*.js') ?? [];
            $files = array_merge($files, $common);
        }

        if ($include_conditional && is_dir(ASSETS_PATH . '/js/conditional_metrics')) {
            $common = glob(ASSETS_PATH . '/js/conditional_metrics/*.js') ?? [];
            $files = array_merge($files, $common);
        }

        return $files;
    }

    /**
     * @return array List of custom metric names (basenames of the .js files)
     */
    public static function getKeys($include_conditional = true): array
    {
        $files = self::getFilenames($include_conditional);
        $keys = [];
        foreach ($files as $file) {
            $keys[] = basename($file, '.js');
        }
        return $keys;
    }
}
