<?php

/**
 * For generation of test run specific URLs
 */
abstract class UrlGenerator {

  protected $run;
  protected $cached;
  protected $step;
  protected $baseUrl;
  protected $testId;

  protected function __construct($baseUrl, $testId, $run, $cached, $step = 1) {
    $this->baseUrl = rtrim(strval($baseUrl), "/");
    $this->testId = $testId;
    $this->run = intval($run);
    $this->cached = $cached ? true : false;
    $this->step = $step;
  }

  /**
   * @param bool $friendlyUrls If the URL should be friendly (via mod_rewrite) or standard
   * @param string $baseUrl Url base for the server (like http://my.wpt.server)
   * @param string $testId ID of the test
   * @param int $run Run number
   * @param bool $cached True if cached run, false otherwise
   * @param int $step The step number (1 by default)
   * @return FriendlyUrlGenerator|StandardUrlGenerator A UrlGenerator for friendly or standard URLs
   */
  public static function create($friendlyUrls, $baseUrl, $testId, $run, $cached, $step = 1) {
    if ($friendlyUrls) {
      return new FriendlyUrlGenerator($baseUrl, $testId, $run, $cached, $step);
    } else {
      return new StandardUrlGenerator($baseUrl, $testId, $run, $cached, $step);
    }
  }

  /**
   * @param string $page Result page to generate the URL for
   * @param string $extraParams|null Extra parameters to append (without '?' or '&' at start)
   * @return string The generated URL
   */
  public abstract function resultPage($page, $extraParams = null);

  /**
   * @param string $image Image name to generate the thumbnail URL for
   * @return string The generated URL
   */
  public abstract function thumbnail($image);

  /**
   * @param string $image Generated image name to generate the URL for
   * @return string The generated URL
   */
  public abstract function generatedImage($image);

  /**
   * @param bool $connectionView True for a connection view waterfall, false for the normal one.
   * @param int $width Width of the generated image
   * @param bool $withMime True if mime data should be generated, false otherwise
   * @return string The generated URL
   */
  public abstract function waterfallImage($connectionView, $width, $withMime);

  /**
   * @param string $extraParams|null Extra parameters to append (without '?' or '&' at start)
   * @return string The generated URL
   */
  public abstract function resultSummary($extraParams = null);

  /**
   * @return string The generated URL
   */
  public abstract function optimizationChecklistImage();

  /**
   * @param string $file The name of the file to get with the URL
   * @param string $video If it's a video-related file, this can be set to the corresponding video directory name
   * @return string The generated URL
   */
  public function getFile($file, $video = "") {
    $videoParam = $video ? "&video=" . $video : "";
    $url = $this->baseUrl . "/getfile.php?test=" . $this->testId . $videoParam . "&file=" . $file;
    return $url;
  }

  /**
   * @param string $file The name of the file to get with the URL
   * @return string The generated URL
   */
  public function getGZip($file) {
    $compressedParam = (substr($file, -3) == ".gz") ? "&compressed=1" : "";
    $url = $this->baseUrl . "/getgzip.php?test=" . $this->testId . $compressedParam . "&file=" . $file;
    return $url;
  }

  /**
   * @param string|int $requestNumber The request number to identify the response body
   * @return string The generated URL
   */
  public function responseBodyWithRequestNumber($requestNumber) {
    return $this->baseUrl . "/response_body.php?" . $this->urlParams() . "&request=" . strval($requestNumber);
  }

  /**
   * @param int $bodyId The body id to identify the response body
   * @return string The generated URL
   */
  public function responseBodyWithBodyId($bodyId) {
    return $this->baseUrl . "/response_body.php?" . $this->urlParams() . "&bodyid=" . strval($bodyId);
  }

  /**
   * @param string $end Optional. A specific "end" to use for video creation
   * @return string The generated URL to create a video
   */
  public function createVideo($end = null) {
    $tests = $this->testId . "-r:" . $this->run . "-c:" . ($this->cached ? 1 : 0);
    $tests .= ($this->step > 1) ? ("-p:" . $this->step) : "";
    $tests .= $end ? "-e:$end" : "";

    $id = $this->testId . "." . $this->run . "." . ($this->cached ? 1 : 0);
    $id .= ($this->step > 1) ? ("." . $this->step) : "";
    $id .= $end ? "-e$end" : "";
    return $this->baseUrl . "/video/create.php?tests=" . $tests . "&id=" . $id;
  }

  /**
   * @param string $end Optional. A specific "end" to use for filmstrip view
   * @return string The generated URL for the filmstrip view
   */
  public function filmstripView($end = null) {
    $tests = $this->testId . "-r:" . $this->run . "-c:" . ($this->cached ? 1 : 0);
    $tests .= ($this->step > 1) ? ("-s:" . $this->step) : "";
    $tests .= $end ? "-e:$end" : "";
    return $this->baseUrl . "/video/compare.php?tests=" . $tests;
  }

  /**
   * @param string $frame The thumbnail name
   * @param int $fit Maximum size of the thumbnail
   * @return string The URL for a thumbnail of the video frame
   */
  public function videoFrameThumbnail($frame, $fit) {
    $file = "video_" . rtrim(strtolower($this->underscorePrefix()), "_") . "/" . $frame;
    return $this->baseUrl . "/thumbnail.php?test=" . $this->testId . "&fit=" . $fit . "&file=" . $file;
  }

  /**
   * @return string The generated URL to download all video frames
   */
  public function downloadVideoFrames() {
    return $this->baseUrl . "/video/downloadFrames.php?" . $this->urlParams();
  }

  /**
   * @param string $page Step-independent Result page to generate the URL for
   * @param string $extraParams|null Extra parameters to append (without '?' or '&' at start)
   * @return string The generated URL
   */
  public function stepDetailPage($page, $extraParams = null) {
    $extraParams = $extraParams ? ("&" . $extraParams) : "";
    return $this->baseUrl . "/" . $page . ".php?" . $this->urlParams() . $extraParams;
  }

  protected function underscorePrefix() {
    $stepSuffix = $this->step > 1 ? ($this->step . "_") : "";
    return strval($this->run) . "_" . ($this->cached ? "Cached_" : "") . $stepSuffix;
  }

  protected function urlParams() {
    $stepParam = $this->step > 1 ? ("&step=" . $this->step) : "";
    return "test=" . $this->testId . "&run=" . $this->run . ($this->cached ? "&cached=1" : "") . $stepParam;
  }
}

class FriendlyUrlGenerator extends UrlGenerator {

  public function resultPage($page, $extraParams = null) {
    $url = $this->baseUrl . "/result/" . $this->testId . "/" . $this->run . "/" . $page . "/";
    if ($this->cached) {
      $url .= "cached/";
    }
    if ($extraParams != null) {
      $url .= "?" . $extraParams;
    }
    return $url;
  }

  public function thumbnail($image) {
    $dotPos = strrpos($image, ".");
    if ($dotPos === false) {
      $thumbName = $image . "_thumb";
    } else {
      $thumbName = substr($image, 0, $dotPos) . "_thumb" . substr($image, $dotPos);
    }

    return $this->baseUrl . "/result/" . $this->testId . "/" . $this->underscorePrefix() . $thumbName;
  }

  public function generatedImage($image) {
    $parts = explode("_", $this->testId);
    $testPath = substr($parts[0], 0, 2) . "/" . substr($parts[0], 2, 2) . "/" . substr($parts[0], 4, 2) .
                "/" . $parts[1];
    if (sizeof($parts) > 2) {
      $testPath .= "/" . $parts[2];
    }
    return $this->baseUrl . "/results/" . $testPath . "/" . $this->underscorePrefix() . $image . ".png";
  }

  public function resultSummary($extraParams = null) {
    $url = $this->baseUrl . "/result/" . $this->testId . "/";
    if ($extraParams != null) {
      $url .= "?" . $extraParams;
    }
    return $url;
  }

  public function waterfallImage($connectionView, $width, $withMime) {
    $params = "&width=" . $width;
    $params .= $connectionView ? "&type=connection" : "";
    $params .= $withMime ? "&mime=1" : "";
    return $this->baseUrl . "/waterfall.png?" . $this->urlParams() . $params;
  }

  public function optimizationChecklistImage() {
    return $this->generatedImage("optimization");
  }
}

class StandardUrlGenerator extends UrlGenerator {

  public function resultPage($page, $extraParams = null) {
    $extraParams = $extraParams ? ("&" . $extraParams) : "";
    return $this->baseUrl . "/" . $page . ".php?" . $this->urlParams() . $extraParams;
  }

  public function thumbnail($image) {
    return $this->baseUrl . "/thumbnail.php?" . $this->urlParams() . "&file=" . $this->underscorePrefix() . $image;
  }

  public function generatedImage($image) {
    return $this->baseUrl . "/" . $image . ".php?" . $this->urlParams();
  }

  public function resultSummary($extraParams = null) {
    $extraParams = $extraParams ? ("&" . $extraParams) : "";
    return $this->baseUrl . "/results.php?test=" . $this->testId . $extraParams;
  }

  public function waterfallImage($connectionView, $width, $withMime) {
    $params = "&width=" . $width;
    $params .= $connectionView ? "&type=connection" : "";
    $params .= $withMime ? "&mime=1" : "";
    return $this->baseUrl . "/waterfall.php?" . $this->urlParams() . $params;
  }

  public function optimizationChecklistImage() {
    return $this->generatedImage("optimizationChecklist");
  }
}