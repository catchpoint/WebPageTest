<?php

namespace GraphQL\QueryBuilder;

use GraphQL\Mutation;

class MutationBuilder extends QueryBuilder
{
    /**
     * MutationBuilder constructor.
     *
     * @param string $queryObject
     * @param string $alias
     */
    public function __construct(string $queryObject = '', string $alias = '')
    {
        parent::__construct($queryObject, $alias);
        $this->query = new Mutation($queryObject, $alias);
    }

    /**
     * Synonymous method to getQuery(), it just return a Mutation type instead of Query type creating a neater
     * interface when using interfaces
     *
     * @return Mutation
     */
    public function getMutation(): Mutation
    {
        return $this->getQuery();
    }
}