<?php

namespace GraphQL\Tests;

use GraphQL\Util\StringLiteralFormatter;
use PHPUnit\Framework\TestCase;

/**
 * Class StringLiteralFormatterTest
 *
 * @package GraphQL\Tests
 */
class StringLiteralFormatterTest extends TestCase
{
    /**
     * @covers \GraphQL\Util\StringLiteralFormatter::formatValueForRHS
     */
    public function testFormatForClassRHSValue()
    {
        // Null test
        $nullString = StringLiteralFormatter::formatValueForRHS(null);
        $this->assertEquals('null', $nullString);

        // String tests
        $emptyString = StringLiteralFormatter::formatValueForRHS('');
        $this->assertEquals('""', $emptyString);

        $formattedString = StringLiteralFormatter::formatValueForRHS('someString');
        $this->assertEquals('"someString"', $formattedString);

        $formattedString = StringLiteralFormatter::formatValueForRHS('"quotedString"');
        $this->assertEquals('"\"quotedString\""', $formattedString);

        $formattedString = StringLiteralFormatter::formatValueForRHS("\"quotedString\"");
        $this->assertEquals('"\"quotedString\""', $formattedString);

        $formattedString = StringLiteralFormatter::formatValueForRHS('\'singleQuotes\'');
        $this->assertEquals('"\'singleQuotes\'"', $formattedString);

        $formattedString = StringLiteralFormatter::formatValueForRHS("with \n newlines");
        $this->assertEquals("\"\"\"with \n newlines\"\"\"", $formattedString);

	$formattedString = StringLiteralFormatter::formatValueForRHS('$var');
	$this->assertEquals('$var', $formattedString);

	$formattedString = StringLiteralFormatter::formatValueForRHS('$400');
	$this->assertEquals('"$400"', $formattedString);

        // Integer tests
        $integerString = StringLiteralFormatter::formatValueForRHS(25);
        $this->assertEquals('25', $integerString);

        // Float tests
        $floatString = StringLiteralFormatter::formatValueForRHS(123.123);
        $this->assertEquals('123.123', $floatString);

        // Bool tests
        $stringTrue = StringLiteralFormatter::formatValueForRHS(true);
        $this->assertEquals('true', $stringTrue);

        $stringFalse = StringLiteralFormatter::formatValueForRHS(false);
        $this->assertEquals('false', $stringFalse);
    }

    /**
     * @covers \GraphQL\Util\StringLiteralFormatter::formatArrayForGQLQuery
     */
    public function testFormatArrayForGQLQuery()
    {
        $emptyArray = [];
        $stringArray = StringLiteralFormatter::formatArrayForGQLQuery($emptyArray);
        $this->assertEquals('[]', $stringArray);

        $oneValueArray = [1];
        $stringArray = StringLiteralFormatter::formatArrayForGQLQuery($oneValueArray);
        $this->assertEquals('[1]', $stringArray);

        $twoValueArray = [1, 2];
        $stringArray = StringLiteralFormatter::formatArrayForGQLQuery($twoValueArray);
        $this->assertEquals('[1, 2]', $stringArray);

        $stringArray = ['one', 'two'];
        $stringArray = StringLiteralFormatter::formatArrayForGQLQuery($stringArray);
        $this->assertEquals('["one", "two"]', $stringArray);

        $booleanArray = [true, false];
        $stringArray = StringLiteralFormatter::formatArrayForGQLQuery($booleanArray);
        $this->assertEquals('[true, false]', $stringArray);

        $floatArray = [1.1, 2.2];
        $stringArray = StringLiteralFormatter::formatArrayForGQLQuery($floatArray);
        $this->assertEquals('[1.1, 2.2]', $stringArray);
    }

    /**
     * @covers \GraphQL\Util\StringLiteralFormatter::formatUpperCamelCase
     */
    public function testFormatUpperCamelCase()
    {
        $snakeCase = 'some_snake_case';
        $camelCase = StringLiteralFormatter::formatUpperCamelCase($snakeCase);
        $this->assertEquals('SomeSnakeCase', $camelCase);

        $nonSnakeCase = 'somenonSnakeCase';
        $camelCase = StringLiteralFormatter::formatUpperCamelCase($nonSnakeCase);
        $this->assertEquals('SomenonSnakeCase', $camelCase);
    }

    /**
     * @covers \GraphQL\Util\StringLiteralFormatter::formatLowerCamelCase
     */
    public function testFormatLowerCamelCase()
    {
        $snakeCase = 'some_snake_case';
        $camelCase = StringLiteralFormatter::formatLowerCamelCase($snakeCase);
        $this->assertEquals('someSnakeCase', $camelCase);

        $nonSnakeCase = 'somenonSnakeCase';
        $camelCase = StringLiteralFormatter::formatLowerCamelCase($nonSnakeCase);
        $this->assertEquals('somenonSnakeCase', $camelCase);
    }


}
