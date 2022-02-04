<?php

namespace GraphQL\Tests;

use GraphQL\RawObject;
use PHPUnit\Framework\TestCase;

class RawObjectTest extends TestCase
{
    /**
     * @covers \GraphQL\RawObject::__toString
     * @covers \GraphQL\RawObject::__construct
     */
    public function testConvertToString()
    {
        // Test convert array
        $json = new RawObject('[1, 4, "y", 6.7]');
        $this->assertEquals('[1, 4, "y", 6.7]', (string) $json);

        // Test convert graphql object
        $json = new RawObject('{arr: [1, "z"], str: "val", int: 1, obj: {x: "y"}}');
        $this->assertEquals('{arr: [1, "z"], str: "val", int: 1, obj: {x: "y"}}', (string) $json);
    }
}