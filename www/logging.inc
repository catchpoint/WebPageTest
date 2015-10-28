<?php

/**
 * Message logging
 *
 * @param mixed $msg
 */
function logMsg($msg, $logFile = './log.txt', $force = false)
{
    global $debug;
    if ((array_key_exists('debug', $_REQUEST) && $_REQUEST['debug']) || $debug || $force)
      error_log($msg . "\n", 3, $logFile);
}

/**
 * Message logging with the source location of the log message.
 * @param mixed $msg
 */
function logWithLocation($msg, $backtraceFrameIndex = 0)
{
  $backtrace = debug_backtrace();
  $file = $backtrace[$backtraceFrameIndex]["file"];
  $line = $backtrace[$backtraceFrameIndex]["line"];
  logMsg("$file:$line: $msg");
}

function logAlways($msg, $logFile = './log.txt') {
  $backtrace = debug_backtrace();
  $file = basename($backtrace[0]["file"]);
  $line = $backtrace[0]["line"];
  $function = $backtrace[1]["function"];
  logMsg("$file:$function:$line: $msg", $logFile, true);
}

function logArray($a, $depth, $space = "") {
  if ($depth > 0) {
    foreach ($a as $key => $value) {
      if (is_array($value)) {
        logAlways($space . $key . " -> array");
        logArray($value, $depth - 1, $space . "  ");
      } else {
        logAlways($space . $key . " -> " . $value);
      }

    }
  }
}

/**
 * Log unexpected input.  Usefull for debugging interaction with an agent.
 * Search for "Unexpected input" to find these messages in the logs.
 * Set a breakpoint in this function to stop on unexpected input.
 * @param mixed $msg
 */
function logMalformedInput($msg)
{
  logWithLocation("Unexpected input: " . $msg,
                  1);  // 1 -> Log the caller of this method, not this line.
}

/**
* Log a message to the error log
* 
* @param mixed $msg
*/
function logError($msg) {
  $dir = __DIR__ . '/log';
  if (!is_dir($dir))
    mkdir($dir, 0744, true);
  if (is_dir($dir)) {
    // Delete any error logs that are more than a week old
    $files = glob("$dir/error.log.*");
    $UTC = new DateTimeZone('UTC');
    $now = time();
    foreach ($files as $file) {
      if (preg_match('/error\.log\.([0-9]{8})$/', $file, $matches)) {
        $date = DateTime::createFromFormat('Ymd', $matches[1], $UTC);
        $time = $date->getTimestamp();
        if ($time < $now && $now - $time > 604800)
          unlink($file);
      }
    }
    $date = gmdate('Ymd');
    error_log(gmdate('H:i:s - ') . $msg . "\n", 3, "$dir/error.log.$date");
  }
}
?>
