<?php

require_once __DIR__ . '/../include/UrlGenerator.php';

class UrlGeneratorTest extends PHPUnit_Framework_TestCase {

  public function testGetFileUrl() {
    $expected = "http://test/getfile.php?test=qwerty&file=testFile";
    $expectedWithVideo = "http://test/getfile.php?test=qwerty&video=foo&file=testFile";

    $ug = UrlGenerator::create(true, "http://test/", "qwerty", 3, true);
    $this->assertEquals($expected, $ug->getFile("testFile"));
    $this->assertEquals($expectedWithVideo, $ug->getFile("testFile", "foo"));

    // check that run friendlyUrl, run number, cached, and step are not important for getFile URLs
    $ug = UrlGenerator::create(false, "http://test", "qwerty", 1, false, 2);
    $this->assertEquals($expected, $ug->getFile("testFile"));
    $this->assertEquals($expectedWithVideo, $ug->getFile("testFile", "foo"));
  }

  public function testPartialResponseBodyUrl() {
    // doesn't matter if friendly or not, as this is implemented by the base class
    $ug = UrlGenerator::create(false, "", "TEST_ID", 3, true);
    $expectedWithRequestNumber = "/response_body.php?test=TEST_ID&run=3&cached=1&request=5";
    $expectedWithBodyId = "/response_body.php?test=TEST_ID&run=3&cached=1&bodyid=90653";
    $this->assertEquals($expectedWithRequestNumber, $ug->responseBodyWithRequestNumber(5));
    $this->assertEquals($expectedWithBodyId, $ug->responseBodyWithBodyId(90653));
  }

  public function testPartialResponseBodyUrlWithStep() {
    // doesn't matter if friendly or not, as this is implemented by the base class
    $ug = UrlGenerator::create(false, "", "TEST_ID", 3, true, 2);
    $expectedWithRequestNumber = "/response_body.php?test=TEST_ID&run=3&cached=1&step=2&request=5";
    $expectedWithBodyId = "/response_body.php?test=TEST_ID&run=3&cached=1&step=2&bodyid=90653";
    $this->assertEquals($expectedWithRequestNumber, $ug->responseBodyWithRequestNumber(5));
    $this->assertEquals($expectedWithBodyId, $ug->responseBodyWithBodyId(90653));
  }

  public function testResultPageStandardUrl() {
    $expected = "https://test/details.php?test=qwerty&run=3";
    $expectedCached = $expected . "&cached=1";

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, false);
    $this->assertEquals($expected, $ug->resultPage("details"));

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, true);
    $this->assertEquals($expectedCached, $ug->resultPage("details"));

    $this->assertEquals($expectedCached . "&param=value", $ug->resultPage("details", "param=value"));
  }

  public function testResultPageStandardUrlWithStep() {
    $expected = "https://test/details.php?test=qwerty&run=3&step=2";
    $expectedCached = "https://test/details.php?test=qwerty&run=3&cached=1&step=2";

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, false, 2);
    $this->assertEquals($expected, $ug->resultPage("details"));

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, true, 2);
    $this->assertEquals($expectedCached, $ug->resultPage("details"));

    $this->assertEquals($expectedCached . "&param=value", $ug->resultPage("details", "param=value"));
  }

  public function testResultPageFriendlyUrl() {
    $expected = "https://test/result/qwerty/3/details/";
    $expectedCached = $expected . "cached/";

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, false);
    $this->assertEquals($expected, $ug->resultPage("details"));

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, true);
    $this->assertEquals($expectedCached, $ug->resultPage("details"));

    $this->assertEquals($expectedCached . "?param=value", $ug->resultPage("details", "param=value"));
  }

  public function testResultPageFriendlyUrlWithStep() {
    $expected = "https://test/result/qwerty/3/details/2/";
    $expectedCached = "https://test/result/qwerty/3/details/cached/2/";

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, false, 2);
    $this->assertEquals($expected, $ug->resultPage("details"));

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, true, 2);
    $this->assertEquals($expectedCached, $ug->resultPage("details"));

    $this->assertEquals($expectedCached . "?param=value", $ug->resultPage("details", "param=value"));
  }

  public function testThumbStandardUrl() {
    $expected = "https://test/thumbnail.php?test=qwerty&run=3&file=3_waterfall.png";
    $expectedCached = "https://test/thumbnail.php?test=qwerty&run=3&cached=1&file=3_Cached_waterfall.png";

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, false);
    $this->assertEquals($expected, $ug->thumbnail("waterfall.png"));

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, true);
    $this->assertEquals($expectedCached, $ug->thumbnail("waterfall.png"));
  }

  public function testThumbStandardUrlWithStep() {
    $expected = "https://test/thumbnail.php?test=qwerty&run=3&step=2&file=3_2_waterfall.png";
    $expectedCached = "https://test/thumbnail.php?test=qwerty&run=3&cached=1&step=2&file=3_Cached_2_waterfall.png";

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, false, 2);
    $this->assertEquals($expected, $ug->thumbnail("waterfall.png"));

    $ug = UrlGenerator::create(false, "https://test/", "qwerty", 3, true, 2);
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

  public function testThumbFriendlyUrlWithStep() {
    $expected = "https://test/result/qwerty/3_2_screen_thumb.jpg";
    $expectedCached = "https://test/result/qwerty/3_Cached_2_screen_thumb.jpg";

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, false, 2);
    $this->assertEquals($expected, $ug->thumbnail("screen.jpg"));

    $ug = UrlGenerator::create(true, "https://test/", "qwerty", 3, true, 2);
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

    $ug = UrlGenerator::create(true, "https://test/", "160609_a7_b8", 3, false, 1);
    $this->assertEquals($expected, $ug->generatedImage("waterfall"));

    $ug = UrlGenerator::create(true, "https://test/", "160609_a7_b8", 3, true, 1);
    $this->assertEquals($expectedCached, $ug->generatedImage("waterfall"));
  }

  public function testGeneratedImageFriendlyUrlWithStep() {
    $expected = "https://test/results/16/06/09/a7/b8/3_2_waterfall.png";
    $expectedCached = "https://test/results/16/06/09/a7/b8/3_Cached_2_waterfall.png";

    $ug = UrlGenerator::create(true, "https://test/", "160609_a7_b8", 3, false, 2);
    $this->assertEquals($expected, $ug->generatedImage("waterfall"));

    $ug = UrlGenerator::create(true, "https://test/", "160609_a7_b8", 3, true, 2);
    $this->assertEquals($expectedCached, $ug->generatedImage("waterfall"));
  }

  public function testResultSummaryFriendlyUrl() {
    $expected = "https://test/result/160609_a7_b8/";
    $ug = UrlGenerator::create(true, "https://test/", "160609_a7_b8", 3, true, 2);
    $this->assertEquals($expected, $ug->resultSummary());
    $this->assertEquals($expected . "?param=value", $ug->resultSummary("param=value"));
  }

  public function testResultSummaryStandardUrl() {
    $expected = "https://test/results.php?test=160609_a7_b8";
    $ug = UrlGenerator::create(false, "https://test/", "160609_a7_b8", 3, true, 2);
    $this->assertEquals($expected, $ug->resultSummary());
    $this->assertEquals($expected . "&param=value", $ug->resultSummary("param=value"));
  }

  public function testGetGZipUrl() {
    $expected = "https://test/getgzip.php?test=160609_a7_b8&file=foobar.txt";
    $ug = UrlGenerator::create(true, "https://test/", "160609_a7_b8", 3, true);
    $this->assertEquals($expected, $ug->getGZip("foobar.txt"));
  }

  public function testGetGZipUrlFromCompressed() {
    $expected = "https://test/getgzip.php?test=160609_a7_b8&compressed=1&file=foobar.txt.gz";
    $ug = UrlGenerator::create(true, "https://test/", "160609_a7_b8", 3, true);
    $this->assertEquals($expected, $ug->getGZip("foobar.txt.gz"));
  }

  public function testCreateVideoUrl() {
    $expected = "https://test/video/create.php?tests=160609_a7_b8-r:3-c:1&id=160609_a7_b8.3.1";
    $ug = UrlGenerator::create(false, "https://test/", "160609_a7_b8", 3, true, 1);
    $this->assertEquals($expected, $ug->createVideo());
  }

  public function testCreateVideoUrlMultistep() {
    $expected = "https://test/video/create.php?tests=160609_a7_b8-r:3-c:1-s:2&id=160609_a7_b8.3.1.2";
    $ug = UrlGenerator::create(false, "https://test/", "160609_a7_b8", 3, true, 2);
    $this->assertEquals($expected, $ug->createVideo());
  }

  public function testDownloadVideoFrames() {
    $expected = "https://test/video/downloadFrames.php?test=160609_a7_b8&run=3&cached=1&step=2";
    $ug = UrlGenerator::create(false, "https://test/", "160609_a7_b8", 3, true, 2);
    $this->assertEquals($expected, $ug->downloadVideoFrames());
  }
}
