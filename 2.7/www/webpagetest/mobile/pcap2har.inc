<?php

require_once('../logging.inc');

/**
 * Read a parameter from the current request.  Use a default if
 * no such param was sent.
 *
 * @param string $param
 * @param type $defaultValue
 * @return type
 */
function ReadRequestParamWithDefault($param, $defaultValue) {
    return array_key_exists($param, $_REQUEST)
        ? $_REQUEST[$param]
        : $defaultValue;
}

/**
 * Exec the pcap2har python script, which converts a
 * .pcap file to a .har .
 * TODO(skerner): This function is not used in workdone.php.  It shoudl be.
 *
 * @param string $pcapPath Path to read the PCAP file from.
 * @param string $harPath Path to which the HAR file will be written.
 * @param boolean $useLatestPCap2Har Use the latest version of pcap2har.py,
 *                as opposed to the stable version.
 * @param boolean $suppressPageRecords Pass --no-pages to pcap2har.
 *                This stops generation of page records in the har.
 * @param &array<string> $consoleOut Console output will be stored
 *                       in this array.
 * @return int The return code from pcap2har.py.
 */
function ExecPcap2Har($pcapPath, $harPath, $useLatestPCap2Har,
                      $suppressPageRecords,
                      &$consoleOut) {
  // When we update pcap2har, we need to test that each
  // agent can use the new version.  To make testing easy,
  // the agent that uploads a .pcap can control which version
  // of pcap2har.py is used.  If $useLatestPcap is false,
  // use the stable version.  If $useLatestPcap is true,
  // use the latest version.  Once a version is known to
  // work with all agents, we promote the latest version
  // to stable.
  $pathContainingPCapToHar = ($useLatestPCap2Har ? "./latest"
                                                 : ".");
  putenv("PYTHONPATH=".
         "$pathContainingPCapToHar:".
         "./dpkt-1.7:".
         "./simplejson");
  // When converting dates to ms since the epoch, do not add an offset
  // for time zones.
  putenv("TZ=UTC");

  $pcap2harExe = "$pathContainingPCapToHar/pcap2har/main.py";

  // Use switch --no-pages to avoid splitting requests into multiple page
  // loads.  WebpageTest agents start tcpdump for each page load, so we know
  // all network traffic is part of the same page load.  The heuristics used
  // to split requests into pages fail on some sites, such as m.yahoo.com.
  // However, the mobitest agents have code that works around this in the
  // agent, and require the (incorrect) page info.
  // TODO(skerner): Make the mobitest agents not need bogus data.
  $pcap2harArgs = ($suppressPageRecords ? "--no-pages" : "");
  $cmd = "/usr/bin/python " .
         "$pcap2harExe $pcap2harArgs $pcapPath $harPath 2>&1";

  $returnCode = NULL;  // Set by exec(..., $returnCode).
  $retLine = exec($cmd, $consoleOut, $returnCode);

  return $returnCode;
}

// When we upgrade the pcap to har converter, we need to test
// each agent.  Agents can opt in to testing the latest
// version by setting this POST param to '1'.
function ShouldUseLatestPcap2Har() {
    return ReadRequestParamWithDefault('useLatestPCap2Har', false);
}

?>
