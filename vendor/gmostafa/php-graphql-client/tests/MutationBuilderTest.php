<?php

namespace GraphQL\Tests;

use GraphQL\Mutation;
use GraphQL\QueryBuilder\MutationBuilder;
use PHPUnit\Framework\TestCase;

class MutationBuilderTest extends TestCase
{
    /**
     * @var MutationBuilder
     */
    protected $mutationBuilder;

    /**
     *
     */
    protected function setUp(): void
    {
        $this->mutationBuilder = new MutationBuilder('createObject');
    }

    /**
     * @covers \GraphQL\QueryBuilder\MutationBuilder::__construct
     * @covers \GraphQL\QueryBuilder\MutationBuilder::getQuery
     * @covers \GraphQL\QueryBuilder\MutationBuilder::getMutation
     */
    public function testConstruct()
    {
       $builder = new MutationBuilder('createObject');
       $builder->selectField('field_one');
       $this->assertInstanceOf(Mutation::class, $builder->getQuery());
       $this->assertInstanceOf(Mutation::class, $builder->getMutation());

       $expectedString = 'mutation {
createObject {
field_one
}
}';
       $this->assertEquals($expectedString, (string) $builder->getQuery());
       $this->assertEquals($expectedString, (string) $builder->getMutation());
    }
}