<?php

require_once __DIR__ . '/../include/TestPaths.php';

class TestPathsTest extends PHPUnit_Framework_TestCase {

  public function  testConstructor() {
    $fn = new TestPaths("test", 2, true, 3);
    $this->assertEquals("test/video_2_cached_3", $fn->videoDir());

    $fn = new TestPaths("test", 1, false, 3);
    $this->assertEquals("test/video_1_3", $fn->videoDir());

    $fn = new TestPaths("test", 4, true, 1);
    $this->assertEquals("test/video_4_cached", $fn->videoDir());

    $fn = new TestPaths("test", 5, false, 1);
    $this->assertEquals("test/video_5", $fn->videoDir());
  }

  public function testUnderscoreFilenameParse() {
    $fn = TestPaths::fromUnderscoreFileName("test", "3_Cached_2_my_base_12.ext");
    $this->assertNotNull($fn);
    $this->assertEquals("my_base_12.ext", $fn->getParsedBaseName());
    $this->assertEquals("test/video_3_cached_2", $fn->videoDir());

    $fn = TestPaths::fromUnderscoreFileName("test", "3_Cached_ab_4");
    $this->assertNotNull($fn);
    $this->assertEquals("ab_4", $fn->getParsedBaseName());
    $this->assertEquals("test/video_3_cached", $fn->videoDir());

    $fn = TestPaths::fromUnderscoreFileName("test", "3_2_x");
    $this->assertNotNull($fn);
    $this->assertEquals("x", $fn->getParsedBaseName());
    $this->assertEquals("test/video_3_2", $fn->videoDir());
  }

  public function testDotFileName() {
    $fn = new TestPaths("test/", 2, true, 3);
    $this->assertEquals("test/llab_2.1.3.visual.dat", $fn->visualDataFile());

    $fn = new TestPaths("test", 1, false, 3);
    $this->assertEquals("test/llab_1.0.3.visual.dat", $fn->visualDataFile());

    $fn = new TestPaths("test", 4, true, 1);
    $this->assertEquals("test/llab_4.1.visual.dat", $fn->visualDataFile());

    $fn = new TestPaths("test", 5, false, 1);
    $this->assertEquals("test/llab_5.0.visual.dat", $fn->visualDataFile());
  }

}
