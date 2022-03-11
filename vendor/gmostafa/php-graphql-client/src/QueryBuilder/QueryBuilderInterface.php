<?php

namespace GraphQL\QueryBuilder;

use GraphQL\Query;

/**
 * Interface QueryBuilderInterface
 *
 * @package GraphQL\QueryBuilder
 */
interface QueryBuilderInterface
{
    /**
     * @return Query
     */
    function getQuery(): Query;
}