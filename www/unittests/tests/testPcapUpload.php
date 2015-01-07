<?php

// Some date functions will complain loudly if a timezone is not set.
date_default_timezone_set('UTC');

// Create a temp dir where HAR files will be written.
const TMP        = 'unittests/tmp';
const FORMER_TMP = 'unittests/former_tmp';
if (file_exists(FORMER_TMP)) {
  rmdir(FORMER_TMP);
}

if (file_exists(TMP)) {
  rename(TMP, FORMER_TMP);
}

mkdir(TMP, 0755);

// TODO(skerner): When we promote the latest pcap2har script
// to stable, test the stable version.  The current stable version
// fails some of these tests.  However, we need to run at least
// some tests with the satbel version to catch errors in the loading
// or calling of the stable version of the script.
const USE_LATEST_PCAP2HAR = true;
const USE_STABLE_PCAP2HAR = false;

const SUPPRESS_PAGE_RECORDS = false;

function GetPCapFilePath($filename) {
  return "mobile/latest/pcap2har/tests/".$filename;
}

class PCapUploadTests extends \Enhance\TestFixture
{
  public function TestEmptyPCapLatest() {
    $consoleOut = array();
    $harFile = TMP."/EmptyPCapLatest.har";
    $returnCode = ExecPcap2Har(GetPCapFilePath("empty.pcap"),
                               $harFile,
                               USE_LATEST_PCAP2HAR,
                               SUPPRESS_PAGE_RECORDS,
                               $consoleOut);
    \Enhance\Assert::areIdentical(print_r(array(), true),
                                  print_r($consoleOut, true));
    \Enhance\Assert::areIdentical(0, $returnCode);
  }

  public function TestEmptyPCapStable() {
    $consoleOut = array();
    $harFile = TMP."/EmptyPCapStable.har";
    $returnCode = ExecPcap2Har(GetPCapFilePath("empty.pcap"),
                               $harFile,
                               USE_STABLE_PCAP2HAR,
                               SUPPRESS_PAGE_RECORDS,
                               $consoleOut);

    // The stable version throws an exception on an empty input.
    // Latest version fixes this.
    \Enhance\Assert::areIdentical(1, $returnCode);
  }

  // Test a simple .pcap file.  We use a unit test input file from pcap2har's
  // tests.  We only run one, to see that our wrapper correctly calls pcap2har.
  // The python tests should be run as well to be sure pcap2har.py works
  // correctly.
  public function TestHttpPCapLatest() {
    $consoleOut = array();
    $harFile = TMP."/httpFromPCapLatest.har";
    $returnCode = ExecPcap2Har(GetPCapFilePath("http.pcap"),
                               $harFile,
                               USE_LATEST_PCAP2HAR,
                               SUPPRESS_PAGE_RECORDS,
                               $consoleOut);

    \Enhance\Assert::areIdentical(print_r(array(), true),
                                  print_r($consoleOut, true));
    \Enhance\Assert::areIdentical(0, $returnCode);

    $harAsString = file_get_contents($harFile);
    $harAsPhpDict = json_decode($harAsString, true);

    \Enhance\Assert::isNotNull($harAsPhpDict);  // Failed to parse as JSON

    // Test a few properties of the HAR, to see that it is well formed.
    \Enhance\Assert::areIdentical("1.1", $harAsPhpDict['log']['version']);
    \Enhance\Assert::areIdentical("page_0",
                                  $harAsPhpDict['log']['pages'][0]['id']);
  }

  public function TestHttpPCapStable() {
    $consoleOut = array();
    $harFile = TMP."/httpFromPCapStable.har";
    $returnCode = ExecPcap2Har(GetPCapFilePath("http.pcap"),
                               $harFile,
                               USE_STABLE_PCAP2HAR,
                               SUPPRESS_PAGE_RECORDS,
                               $consoleOut);

    \Enhance\Assert::areIdentical(
        print_r(array("WARNING:root:First packet is not SYN."), true),
        print_r($consoleOut, true));
    \Enhance\Assert::areIdentical(0, $returnCode);

    $harAsString = file_get_contents($harFile);
    $harAsPhpDict = json_decode($harAsString, true);

    \Enhance\Assert::isNotNull($harAsPhpDict);  // Failed to parse as JSON

    // Test a few properties of the HAR, to see that it is well formed.
    \Enhance\Assert::areIdentical("1.1", $harAsPhpDict['log']['version']);
    \Enhance\Assert::areIdentical("pageref_0",
                                  $harAsPhpDict['log']['pages'][0]['id']);
  }

  // Test that a mangled pcap fails gracefully.
  public function TestMangledPCapLatest() {
    $consoleOut = array();
    $harFile = TMP."/fromMangledPCapLatest.har";
    $returnCode = ExecPcap2Har("unittests/data/invalid.pcap",
                               $harFile,
                               USE_LATEST_PCAP2HAR,
                               SUPPRESS_PAGE_RECORDS,
                               $consoleOut);
    \Enhance\Assert::areIdentical(1, $returnCode);
  }

  // Test that a mangled pcap fails gracefully.
  public function TestMangledPCapStable() {
    $consoleOut = array();
    $harFile = TMP."/fromMangledPCapStable.har";
    $returnCode = ExecPcap2Har("unittests/data/invalid.pcap",
                               $harFile,
                               USE_STABLE_PCAP2HAR,
                               SUPPRESS_PAGE_RECORDS,
                               $consoleOut);
    \Enhance\Assert::areIdentical(1, $returnCode);
  }

  // Test that pcap files created by loading google.com
  // can be read completely.
  public function TestGoogleDotComPCapFromEmulator() {
    $consoleOut = array();
    $harFile = TMP."/googleDotComFromEmulator.har";
    $returnCode = ExecPcap2Har("unittests/data/googleDotComFromDevice.pcap",
                               $harFile,
                               USE_LATEST_PCAP2HAR,
                               SUPPRESS_PAGE_RECORDS,
                               $consoleOut);
    \Enhance\Assert::areIdentical(print_r(array(), true),
                                  print_r($consoleOut, true));
    \Enhance\Assert::areIdentical(0, $returnCode);

    $harAsString = file_get_contents($harFile);
    $harAsPhpDict = json_decode($harAsString, true);

    \Enhance\Assert::isNotNull($harAsPhpDict);  // Failed to parse as JSON

    // Test a few properties of the HAR, to see that it is well formed.
    \Enhance\Assert::areIdentical("1.1",
				  $harAsPhpDict['log']['version']);

    // Older version of pcap2har see fewer requests, because packets arrive
    // out of the expected order.
    \Enhance\Assert::areIdentical(6,
				  count($harAsPhpDict['log']['entries']));

  }

  // Test that a second pcap files created by loading google.com
  // can be read completely.
  public function TestGoogleDotComPCapFromDevice() {
    $consoleOut = array();
    $harFile = TMP."/googleDotComFromDevice.har";
    $returnCode = ExecPcap2Har("unittests/data/googleDotComFromEmulator.pcap",
                               $harFile,
                               USE_LATEST_PCAP2HAR,
                               SUPPRESS_PAGE_RECORDS,
                               $consoleOut);

    \Enhance\Assert::areIdentical(print_r(array(), true),
				  print_r($consoleOut, true));
    \Enhance\Assert::areIdentical(0, $returnCode);

    $harAsString = file_get_contents($harFile);
    $harAsPhpDict = json_decode($harAsString, true);

    \Enhance\Assert::isNotNull($harAsPhpDict);  // Failed to parse as JSON

    // Test a few properties of the HAR, to see that it is well formed.
    \Enhance\Assert::areIdentical("1.1",
				  $harAsPhpDict['log']['version']);

    // Older version of pcap2har see fewer requests, because packets arrive
    // out of the expected order.
    \Enhance\Assert::areIdentical(11,
				  count($harAsPhpDict['log']['entries']));
  }
}

?>

