<?php

namespace GraphQL\QueryBuilder;

use GraphQL\Query;

/**
 * Class QueryBuilder
 *
 * @package GraphQL
 */
class QueryBuilder extends AbstractQueryBuilder
{
    /**
     * Changing method visibility to public
     *
     * @param Query|QueryBuilder|string $selectedField
     *
     * @return AbstractQueryBuilder|QueryBuilder
     */
    public function selectField($selectedField)
    {
        return parent::selectField($selectedField);
    }

    /**
     * Changing method visibility to public
     *
     * @param string $argumentName
     * @param        $argumentValue
     *
     * @return AbstractQueryBuilder|QueryBuilder
     */
    public function setArgument(string $argumentName, $argumentValue)
    {
        return parent::setArgument($argumentName, $argumentValue);
    }

    /**
     * Changing method visibility to public
     *
     * @param string $name
     * @param string $type
     * @param bool   $isRequired
     * @param null   $defaultValue
     *
     * @return AbstractQueryBuilder|QueryBuilder
     */
    public function setVariable(string $name, string $type, bool $isRequired = false, $defaultValue = null)
    {
        return parent::setVariable($name, $type, $isRequired, $defaultValue);
    }
}