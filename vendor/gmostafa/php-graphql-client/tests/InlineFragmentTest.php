<?php

namespace GraphQL\Tests;

use GraphQL\InlineFragment;
use GraphQL\Query;
use GraphQL\QueryBuilder\QueryBuilder;
use PHPUnit\Framework\TestCase;

/**
 * Class InlineFragmentTest
 *
 * @package GraphQL\Tests
 */
class InlineFragmentTest extends TestCase
{
    /**
     * @covers \GraphQL\InlineFragment::__construct
     * @covers \GraphQL\InlineFragment::setSelectionSet
     * @covers \GraphQL\InlineFragment::constructSelectionSet
     * @covers \GraphQL\InlineFragment::__toString
     */
    public function testConvertToString()
    {
        $fragment = new InlineFragment('Test');
        $fragment->setSelectionSet(
            [
                'field1',
                'field2',
            ]
        );

        $this->assertEquals(
            '... on Test {
field1
field2
}',
            (string) $fragment
        );
    }

    /**
     * @covers \GraphQL\InlineFragment::__construct
     * @covers \GraphQL\InlineFragment::setSelectionSet
     * @covers \GraphQL\InlineFragment::constructSelectionSet
     * @covers \GraphQL\InlineFragment::__toString
     */
    public function testConvertNestedFragmentToString()
    {
        $fragment = new InlineFragment('Test');
        $fragment->setSelectionSet(
            [
                'field1',
                'field2',
                (new Query('sub_field'))
                    ->setArguments(
                        [
                            'first' => 5
                        ]
                    )
                    ->setSelectionSet(
                        [
                            'sub_field3',
                            (new InlineFragment('Nested'))
                                ->setSelectionSet(
                                    [
                                        'another_field'
                                    ]
                                ),
                        ]
                    )
            ]
        );

        $this->assertEquals(
            '... on Test {
field1
field2
sub_field(first: 5) {
sub_field3
... on Nested {
another_field
}
}
}',
            (string) $fragment
        );
    }

    /**
     * @covers \GraphQL\InlineFragment::__construct
     * @covers \GraphQL\InlineFragment::setSelectionSet
     * @covers \GraphQL\InlineFragment::getSelectionSet
     * @covers \GraphQL\InlineFragment::constructSelectionSet
     * @covers \GraphQL\InlineFragment::__toString
     */
    public function testConvertQueryBuilderToString()
    {
        $queryBuilder = new QueryBuilder();

        $fragment = new InlineFragment('Test', $queryBuilder);
        $queryBuilder->selectField('field1');
        $queryBuilder->selectField('field2');

        $this->assertEquals(
            '... on Test {
field1
field2
}',
            (string) $fragment
        );
    }
}
