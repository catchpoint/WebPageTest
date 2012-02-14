<?php

include_once '../work/workdone.php';

// Some date functions will complain loudly if a timezone is not set.
date_default_timezone_set('UTC');

// TODO(skerner): When we promote the latest pcap2har script
// to stable, test the stable version.  The current stable version
// fails most of these tests, so there is no point running them.
const USE_LATEST_PCAP2HAR = true;
function GetPCapFilePath($filename) {
  return "mobile/pcap2har_latest/tests/".$filename;
}

class PCapUploadTests extends \Enhance\TestFixture
{
  public function TestEmptyPCap() {
    $consoleOut = array();
    $returnCode = ExecPcap2Har(GetPCapFilePath("empty.pcap"),
                               "testTmp_outOfTest.har",
                               USE_LATEST_PCAP2HAR,
                               $consoleOut);
    \Enhance\Assert::areIdentical(print_r(array(), true),
                                  print_r($consoleOut, true));
    \Enhance\Assert::areIdentical(0, $returnCode);
  }

  // Test a simple .pcap file.  We use a unit test input file from pcap2har's
  // tests.  We only run one, to see that our wrapper correctly calls pcap2har.
  // The python tests should be run as well to be sure pcap2har.py works
  // correctly.
  public function TestHttpPCap() {
    $consoleOut = array();
    $harFile = "testTmp_httpFromPCap.har";
    $returnCode = ExecPcap2Har(GetPCapFilePath("http.pcap"),
                               $harFile,
                               USE_LATEST_PCAP2HAR,
                               $consoleOut);


    \Enhance\Assert::areIdentical(array(), $consoleOut);
    \Enhance\Assert::areIdentical(0, $returnCode);

    $harAsString = file_get_contents($harFile);
    $harAsPhpDict = json_decode($harAsString, true);

    \Enhance\Assert::isNotNull($harAsPhpDict);  // Failed to parse as JSON

    // Test a few properties of the HAR, to see that it is well formed.
    \Enhance\Assert::areIdentical("1.1", $harAsPhpDict['log']['version']);
    \Enhance\Assert::areIdentical("page_0",
                                  $harAsPhpDict['log']['pages'][0]['id']);
  }

  // Test that a mangled pcap fails gracefully.
  public function TestMangledPCap() {
    $consoleOut = array();
    $harFile = "testTmp_fromMangledPCap.har";
    $returnCode = ExecPcap2Har("unittests/data/invalid.pcap",
                               $harFile,
                               USE_LATEST_PCAP2HAR,
                               $consoleOut);
    \Enhance\Assert::areIdentical(1, $returnCode);
  }

  // TODO(skerner): Test that loading google.com preserves all
  // connection data.
}

?>

