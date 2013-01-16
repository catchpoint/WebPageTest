<?php

/**
 * Message logging
 *
 * @param mixed $msg
 */
function logMsg($msg, $logFile = './log.txt', $force = false)
{
    global $debug;
    if ($debug || $force) {
        $file = fopen($logFile, 'a');
        if ($file) {
            fwrite($file, gmdate('Y/m/d H:i:s - ') . $msg . "\n");
            fclose($file);
        }
    }
}

function logAlways($msg, $logFile = './log.txt') {
  logMsg($msg, $logFile, true);  // true -> force logging.
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

?>
