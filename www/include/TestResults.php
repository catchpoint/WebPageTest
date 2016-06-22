<?php

require_once __DIR__ . '/FileHandler.php';

// TODO: get rid of this as soon as we don't use loadAllPageData, etc anymore
require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../page_data.inc';

class TestResults {

  /**
   * @var TestInfo Information about the test
   */
  private $testInfo;

  /**
   * @var FileHandler The file handler to use
   */
  private $fileHandler;

  private $pageData;


  public function __construct($testInfo, $fileHandler = null) {
    $this->testInfo = $testInfo;
    $this->fileHandler = $fileHandler;
    $this->pageData = loadAllPageData($this->testInfo->getRootDirectory());
  }

  public function getUrlFromRun() {
    return empty($this->pageData[1][0]['URL']) ? "" : $this->pageData[1][0]['URL'];
  }

  /**
   * Exists only temporary until we got tests
   */
  public function getPageData() {
    return $this->pageData;
  }

}