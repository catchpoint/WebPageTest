<?php

use PHPUnit\Framework\TestCase;
use WebPageTest\OE\TestResult;

final class TestResultTest extends TestCase
{
    public function testConstructor(): void
    {
        $testResult = new TestResult([
            'name' => 'My Test Result',
            'title' => 'My Test Result Title',
            'desc' => 'My Test Result Description',
            'examples' => [
                'example1' => 'Example 1',
                'example2' => 'Example 2',
            ],
            'experiments' => [
                'experiment1' => 'Experiment 1',
                'experiment2' => 'Experiment 2',
            ],
            'good' => true,
            'hideassets' => false,
            'custom_attributes' => [
                'attr1' => 'Attribute 1',
                'attr2' => 'Attribute 2',
            ],
        ]);

        $this->assertInstanceOf(TestResult::class, $testResult);
        $this->assertEquals('My Test Result', $testResult->getName());
        $this->assertEquals('My Test Result Title', $testResult->getTitle());
        $this->assertEquals('My Test Result Description', $testResult->getDescription());
        $this->assertEquals(['example1' => 'Example 1', 'example2' => 'Example 2'], $testResult->getExamples());
        $this->assertEquals(['experiment1' => 'Experiment 1', 'experiment2' => 'Experiment 2'], $testResult->getExperiments());
        $this->assertTrue($testResult->isGood());
        $this->assertFalse($testResult->hideAssets());
        $this->assertEquals(['attr1' => 'Attribute 1', 'attr2' => 'Attribute 2'], $testResult->getCustomAttributes());
    }

    public function testGetNameReturnsName()
    {
        $name = 'test';
        $testResult = new TestResult(['name' => $name]);
        $this->assertEquals($name, $testResult->getName());
    }

    public function testGetTitleReturnsTitle()
    {
        $title = 'Test Title';
        $testResult = new TestResult(['title' => $title]);
        $this->assertEquals($title, $testResult->getTitle());
    }

    public function testGetDescriptionReturnsDescription()
    {
        $description = 'Test Description';
        $testResult = new TestResult(['desc' => $description]);
        $this->assertEquals($description, $testResult->getDescription());
    }

    public function testGetExamplesReturnsExamples()
    {
        $examples = ['example 1', 'example 2'];
        $testResult = new TestResult(['examples' => $examples]);
        $this->assertEquals($examples, $testResult->getExamples());
    }

    public function testGetExperimentsReturnsExperiments()
    {
        $experiments = ['experiment 1', 'experiment 2'];
        $testResult = new TestResult(['experiments' => $experiments]);
        $this->assertEquals($experiments, $testResult->getExperiments());
    }

    public function testIsGoodReturnsGood()
    {
        $good = false;
        $testResult = new TestResult(['good' => $good]);
        $this->assertEquals($good, $testResult->isGood());
    }

    public function testHideAssetsReturnsHideAssets()
    {
        $hideAssets = true;
        $testResult = new TestResult(['hideassets' => $hideAssets]);
        $this->assertEquals($hideAssets, $testResult->hideAssets());
    }

    public function testGetCustomAttributesReturnsCustomAttributes()
    {
        $customAttributes = ['attribute1' => 'value1', 'attribute2' => 'value2'];
        $testResult = new TestResult(['custom_attributes' => $customAttributes]);
        $this->assertEquals($customAttributes, $testResult->getCustomAttributes());
    }
}
