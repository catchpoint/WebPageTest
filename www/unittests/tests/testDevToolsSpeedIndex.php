<?php

// www/devtools.inc.php depends on some functions that are defined in
// www/common_lib.inc, so include that file first. However, in that file it
// is assumed that the cwd is the www directory, so we need to chdir.
chdir('..');
include_once 'common_lib.inc';
chdir('unittests');

include_once '../devtools.inc.php';

// Note: www/unittests/runAllTests.php appears to not detect new tests until
// one of the already-detected tests changes.

class DevToolsSpeedIndexTests extends \Enhance\TestFixture
{

  public function SetUp() {
    // Although this script is run from 'www/unittests', the actual Enhance
    // unit tests are run from 'www', so the unit test data directory must be
    // relative to that.
    $testDir = 'unittests/data';

    // After running through the body of GetDevToolsProgress, the results is
    // cached in a file, devToolsProgress.json.gz, so that it doesn't need
    // to be re-computed. However, for these tests, we do want the body of
    // GetDevToolsProgress to be run each time.
    $cachedFileName = "$testDir/devToolsProgress.json.gz";
    if (file_exists($cachedFileName)) {
      unlink($cachedFileName);
    }

    $this->progress = GetDevToolsProgress($testDir, 'sample', false);
  }

  public function TestSampleVisualProgress() {
    // Test visual progress.
    // The area points that the events at 100, 300, 400 and 800 count for
    // respectively are 500,000, 100,000, 200,000 and 200,000 (total 1,000,000).
    // Note that this is counting the one event in the sample data that is not
    // a leaf event.
    \Enhance\Assert::areIdentical(4, count($this->progress['VisualProgress']));
    \Enhance\Assert::areIdentical(0.5, $this->progress['VisualProgress'][100]);
    \Enhance\Assert::areIdentical(0.6, $this->progress['VisualProgress'][300]);
    \Enhance\Assert::areIdentical(0.8, $this->progress['VisualProgress'][400]);
    \Enhance\Assert::areIdentical(1.0, $this->progress['VisualProgress'][800]);
  }

  public function TestSampleSpeedIndex() {
    // Given the visual progress numbers above, the speed index can be
    // calculated to be 320.0.
    \Enhance\Assert::areIdentical(320.0, $this->progress['SpeedIndex']);
  }

}

?>
