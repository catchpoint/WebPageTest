<?php
set_time_limit(300);

date_default_timezone_set('UTC');

require_once('../lib/pclzip.lib.php');
require_once('../logging.inc');
require_once('../mobile/pcap2har.inc');

// Debugging flags.  Set to false by default.
define('FORCE_LOGGING_OF_PCAP2HAR_ERRORS', false);
define('RETAIN_PCAP_FILE_ON_ERROR', false);

function rrmdir($path)
{
  return is_file($path)?
    @unlink($path):
    array_map('rrmdir',glob($path.'/*'))==@rmdir($path)
  ;
}

$curId = 'pcapTempDir_' . rand();
$workDir = "/tmp/";
$pcappath = $workDir . $curId . "/";
$pcapfile = $pcappath . $curId . ".pcap";

if( isset($_FILES['file']) )
{
	mkdir($pcappath);
	if ($_FILES['file']['type'] == "application/zip" ||
		preg_match("/\.zip$/",$_FILES['file']['name']))
	{
		$archive = new PclZip($_FILES['file']['tmp_name']);
		$list = $archive->extract(PCLZIP_OPT_PATH, "$pcappath/");
		foreach ($list as &$file)
		{
			$filename = $file['filename'];
			$test = ".pcap";
			// Check if the string ends with .pcap
			$strlen = strlen($filename);
    	$testlen = strlen($test);
    	if ($testlen < $strlen &&
    			substr_compare($filename, $test, -$testlen) === 0)
   		{
				$pcapfile = $filename;
				break;
			}
		}
	}
	else
	{
		move_uploaded_file($_FILES['file']['tmp_name'], $pcapfile);
	}

	// Execute pcap2har
	$harfile = $pcapfile . ".har";
	$useLatestPCap2Har = ShouldUseLatestPcap2Har();
	$suppressPageRecords = false;  // Mobitest agent needs page records.
	$consoleOut = array();
	$returnCode = 0;
	ExecPcap2Har($pcapfile, $harfile, $useLatestPCap2Har,
                     $suppressPageRecords, $consoleOut);
	$harText = null;
	if (file_exists($harfile)) {
		$harText = file_get_contents($harfile);
	}

	if ($returnCode == 0)
	{
		header("HTTP/1.0 200 Ok");
		header('Content-type: application/json');
		header("Cache-Control: no-cache, must-revalidate");
		header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
		echo $harText;
		rrmdir($pcappath);
	}
	else
	{
		header("HTTP/1.0 400 Bad Request");
		header('Content-type: text/plain');
		header("Cache-Control: no-cache, must-revalidate");
		header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
		echo "Ret line: $retLine\r\n";
		echo "Return code: $returnCode\r\n";
		echo "Console out: \r\n";
		print_r($consoleOut);

		echo "\r\nOutput:\r\n";
		echo $harText;

		if (FORCE_LOGGING_OF_PCAP2HAR_ERRORS) {
			logAlways("pcap2har failed: console output is " . print_r($consoleOut, true));
		}

		if (RETAIN_PCAP_FILE_ON_ERROR) {
			logAlways("Error converting pcap file.  Left it on disk at " . $pcappath);
		} else {
			rrmdir($pcappath);
		}
	}
}

?>
