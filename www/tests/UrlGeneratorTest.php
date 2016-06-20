<?php

require_once __DIR__ . '/../include/UrlGenerator.php';

class UrlGeneratorTest extends PHPUnit_Framework_TestCase {

  public function testGetFileUrl() {
    $expected = "http://test/getfile.php?test=qwerty&file=testFile";
    $expectedWithVideo = "http://test/getfile.php?test=qwerty&video=foo&file=testFile";

    $ug = UrlGenerator::create(true, "http://test/", "qwerty", 3, true);
    $this->assertEquals($expected, $ug->getFile("testFile"));
    $this->assertEquals($expectedWithVideo, $ug->getFile("testFile", "foo"));

    // check that run friendlyUrl, run number, and cached are not important for getFile URLs
    $ug = UrlGenerator::create(false, "http://test", "qwerty", 1, false);
    $this->assertEquals($expected, $ug->getFile("testFile"));
    $this->assertEquals($expectedWithVideo, $ug->getFile("testFile", "foo"));
  }

  public function testResultPageStandardUrl() {
    $expected = "https://test/details.php?test=qwerty&run=3";
    $expectedCached = $expected . "&cached=1";

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, false);
    $this->assertEquals($expected, $ug->resultPage("details"));

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, true);
    $this->assertEquals($expectedCached, $ug->resultPage("details"));
  }

  public function testResultPageFriendlyUrl() {
    $expected = "https://test/result/qwerty/3/details/";
    $expectedCached = $expected . "cached/";

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, false);
    $this->assertEquals($expected, $ug->resultPage("details"));

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, true);
    $this->assertEquals($expectedCached, $ug->resultPage("details"));
  }

  public function testThumbStandardUrl() {
    $expected = "https://test/thumbnail.php?test=qwerty&run=3&file=3_waterfall.png";
    $expectedCached = "https://test/thumbnail.php?test=qwerty&run=3&cached=1&file=3_Cached_waterfall.png";

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, false);
    $this->assertEquals($expected, $ug->thumbnail("waterfall.png"));

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, true);
    $this->assertEquals($expectedCached, $ug->thumbnail("waterfall.png"));
  }

  public function testThumbFriendlyUrl() {
    $expected = "https://test/result/qwerty/3_screen_thumb.jpg";
    $expectedCached = "https://test/result/qwerty/3_Cached_screen_thumb.jpg";

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, false);
    $this->assertEquals($expected, $ug->thumbnail("screen.jpg"));

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, true);
    $this->assertEquals($expectedCached, $ug->thumbnail("screen.jpg"));
  }

  public function testGeneratedImageStandardUrl() {
    $expected = "https://test/waterfall.php?test=160609_a7_b8&run=3";
    $expectedCached = $expected . "&cached=1";

    $ug = UrlGenerator::create(false, "https://test/", "160609_a7_b8", 3, false);
    $this->assertEquals($expected, $ug->generatedImage("waterfall"));

    $ug = UrlGenerator::create(false, "https://test/", "160609_a7_b8", 3, true);
    $this->assertEquals($expectedCached, $ug->generatedImage("waterfall"));
  }

  public function testGeneratedImageFriendlyUrl() {
    $expected = "https://test/results/16/06/09/a7/b8/3_waterfall.png";
    $expectedCached = "https://test/results/16/06/09/a7/b8/3_Cached_waterfall.png";

    $ug = UrlGenerator::create(true, "https://test/", "160609_a7_b8", 3, false);
    $this->assertEquals($expected, $ug->generatedImage("waterfall"));

    $ug = UrlGenerator::create(true, "https://test/", "160609_a7_b8", 3, true);
    $this->assertEquals($expectedCached, $ug->generatedImage("waterfall"));
  }
}
