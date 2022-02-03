<?php

namespace GraphQL;

use GraphQL\QueryBuilder\QueryBuilderInterface;

/**
 * Class InlineFragment
 *
 * @package GraphQL
 */
class InlineFragment extends NestableObject
{
    use FieldTrait;

    /**
     * Stores the format for the inline fragment format
     *
     * @var string
     */
    protected const FORMAT = '... on %s%s';

    /**
     * @var string
     */
    protected $typeName;

    /**
     * @var QueryBuilderInterface|null
     */
    protected $queryBuilder;

    /**
     * InlineFragment constructor.
     *
     * @param string $typeName
     * @param QueryBuilderInterface|null $queryBuilder
     */
    public function __construct(string $typeName, ?QueryBuilderInterface $queryBuilder = null)
    {
        $this->typeName = $typeName;
        $this->queryBuilder = $queryBuilder;
    }

    /**
     *
     */
    public function __toString()
    {
        if ($this->queryBuilder !== null) {
            $this->setSelectionSet($this->queryBuilder->getQuery()->getSelectionSet());
        }

        return sprintf(static::FORMAT, $this->typeName, $this->constructSelectionSet());
    }

    /**
     * @codeCoverageIgnore
     *
     * @return mixed|void
     */
    protected function setAsNested()
    {
        // TODO: Remove this method, it's purely tech debt
    }
}
