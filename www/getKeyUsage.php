<?php
    header('Content-type:application/json;charset=utf-8');

    require_once('common.inc');
    if (!$privateInstall) {
        echo FormatResult(false, "/getKeyUsage.php only available on private instances.");
        return;
    }

    if (isset($_REQUEST['k']) && preg_match('/^(?P<key>[0-9A-Za-z]+)$/', $_REQUEST['k'], $matches)) {
        $api_key = $matches[0];
    } else {
        echo FormatResult(false, "Please provide a valid API key as a request param. Example: /getKeyUsage.php?k=your-api-key");
        return;
    }

    $key_usage_filename = __DIR__ . "/dat/keys_" . gmdate("Ymd") . ".dat";
    $key_usage_fp = fopen($key_usage_filename, "r");
    if ($key_usage_fp) {
        $contents = fgets($key_usage_fp);
        if ($contents) {
            $key_usages = json_decode(trim($contents), true);
            if (is_array($key_usages) && array_key_exists($api_key, $key_usages)) {
                $key_usage = $key_usages[$api_key];
            } else {
                echo FormatResult(false, "API key not found in usage file.");
            }
        } else {
            echo FormatResult(false, "Unable to read usage file contents.");
        }
    } else {
        echo FormatResult(false, "Unable to open file: " . $key_usage_filename);
    }
    fclose($key_usage_fp);
    if (!isset($key_usage)) {
        return;
    }

    $keys_path = dirname(__DIR__) . "/www/settings/keys.ini";
    $keys = parse_ini_file($keys_path, true, INI_SCANNER_TYPED);
    if ($keys) {
        if (is_array($keys) && array_key_exists($api_key, $keys) &&
            $keys[$api_key]['limit']) {
            $limit = $keys[$api_key]['limit'];
        } else {
            echo FormatResult(false, "'limit' not found in keys.ini");
        }
    } else {
        echo FormatResult(false, "Unable to find or open keys.ini at {$keys_path}");
    }
    if (!isset($limit)) {
        return;
    }

    $result = array(
        "usage" => $key_usage,
        "limit" => $limit
    );
    echo FormatResult(true, $result);
?>

<?php
    function FormatResult($success, $result) {
        return json_encode(array(
            "success" => $success,
            "result" => $result
        ));
    }
?>
