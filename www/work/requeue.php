<?php
chdir('..');
require_once('common.inc');

header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

if (isset($_REQUEST['id']) && isset($_REQUEST['sig']) && isset($_REQUEST['location'])) {
    $testId = $_REQUEST['id'];
    $signature = $_REQUEST['sig'];
    if (ValidateTestId($testId)) {
        $signature_matches = true;
        $secret = GetServerSecret();
        if (!isset($secret))
            $secret = '';
        if (strlen($secret)) {
            $signature_matches = false;
            $sig = sha1("$testId$secret");
            if ($sig == $signature) {
                $signature_matches = true;
            }
        }
        if ($signature_matches) {
            $testPath = './' . GetTestPath($testId);
            if (is_dir($testPath)) {
                $job = file_get_contents('php://input');
                if (isset($job) && is_string($job) && strlen($job)) {
                    if (RequeueJob($testId, $job)) {
                        if (!file_exists("$testPath/test.waiting")) {
                            touch("$testPath/test.waiting");
                            logTestMsg($testId, "Requeued test");
                        }
                        if (isset($_REQUEST['node'])) {
                            touch("$testPath/test.scheduled");
                        }
                        @unlink("$testPath/test.running");
                    }
                }
            }
        }
    }
}

function RequeueJob($testId, $job) {
    $ret = false;

    // logic mostly matches AddTestJob from common_lib.inc except it is not submitting multiple runs

    $location = $_REQUEST['location'];
    $info = GetLocationInfo($location);
    $scheduler = GetSetting('cp_scheduler');
    $scheduler_salt = GetSetting('cp_scheduler_salt');
    $host = GetSetting('host');
    $jobID = isset($_REQUEST['jobID']) ? $_REQUEST['jobID'] : null;

    if ($jobID && $scheduler && $scheduler_salt && isset($info) && is_array($info) && isset($info['scheduler_node'])) {
        // Scheduler queue
        $ret = AddSchedulerJob($jobID, $job, $scheduler, $scheduler_salt, $info['scheduler_node'], $host, 0);
    } elseif (isset($info) && is_array($info) && isset($info['queue'])) {
        // explicitly configured beanstalk work queues
        $queueType = $info['queue'];
        $addr = GetSetting("{$queueType}Addr");
        $port = GetSetting("{$queueType}Port");
        if ($queueType == 'beanstalk' && $addr && $port) {
            try {
                require_once('./lib/beanstalkd/pheanstalk_init.php');
                $pheanstalk = new Pheanstalk_Pheanstalk($addr, $port);
                $tube = 'wpt.work.' . sha1($location);
                $message = gzdeflate(json_encode(array('job' => $job)), 7);
                if ($message) {
                    $pheanstalk->putInTube($tube, $message, 1);
                    $ret = true;
                }
            } catch(Exception $e) {
            }
        }
    } else {
        // Directory-based files (and global beanstalk)
        $test = GetTestInfo($testId);
        if (isset($test) && is_array($test) && isset($test['job'])) {
            $locationLock = LockLocation($location);
            if (isset($locationLock)) {
                $ret = true;
                if( !is_dir($test['workdir']) )
                    mkdir($test['workdir'], 0777, true);
                $workDir = $test['workdir'];
                $fileName = pathinfo($test['job'])['filename'] . '.url';
                $testNum = GetDailyTestNum();
                $sortableIndex = '000000' . GetSortableString($testNum);
                $fileName = "$sortableIndex.$fileName";
                $file = "$workDir/$fileName";
                if (file_put_contents($file, $job)) {
                    if (!AddJobFile($location, $workDir, $fileName, 0)) {
                        $ret = false;
                        unlink($file);
                    }
                } else {
                    $ret = false;
                }
                Unlock($locationLock);
            }
        }
    }

    return $ret;
}