<?php

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\OpportunityTest\Cache;
use WebPageTest\OE\TestResult;

class CacheTest extends TestCase
{
    public function testRunMethodReturnsInstanceOfTestResult()
    {
        $testStepResult = new class {
            public function getRawResults()
            {
                return [
                ];
            }
        };
        $requests = [];
        $data = [
          $testStepResult,
          $requests
        ];
        $result = Cache::run($data);
        $this->assertInstanceOf(TestResult::class, $result);
    }
    public function testRunMethodReturnsGoodResultWhenNoScoreCacheInRawResults()
    {
        $testStepResult = new class {
            public function getRawResults()
            {
                return [
                ];
            }
        };
        $requests = [];
        $data = [
          $testStepResult,
          $requests
        ];
        $result = Cache::run($data);
        $this->assertTrue($result->isGood());
    }
    public function testRunMethodReturnsGoodResultWhenScoreCacheIs100()
    {
        $testStepResult = new class {
            public function getRawResults()
            {
                return [
                'score_cache' => 'test'
                ];
            }
        };
        $requests = [
          [
            'score_cache' => 100
          ]
        ];
        $data = [
          $testStepResult,
          $requests
        ];
        $result = Cache::run($data);
        $this->assertTrue($result->isGood());
    }
    public function testRunMethodReturnsBadResultWhenCacheInadequate()
    {
        $testStepResult = new class {
            public function getRawResults()
            {
                return [
                'score_cache' => 'test'
                ];
            }
        };
        $requests = [
            [
                'score_cache' => 100,
                'cache_time' => 86401,
                'host' => 'webpagetest.org',
                'is_secure' => true,
                'url' => '/result/12345tests'
            ],
            [
                'score_cache' => 40,
                'cache_time' => 86401,
                'host' => 'webpagetest.org',
                'is_secure' => true,
                'url' => '/result/12345tests2'
            ]
        ];
        $data = [
          $testStepResult,
          $requests
        ];
        $result = Cache::run($data);
        $this->assertFalse($result->isGood());
    }
}
