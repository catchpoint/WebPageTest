<?php

namespace GraphQL;

/**
 * Class NestableObject
 *
 * @codeCoverageIgnore
 *
 * @package GraphQL
 */
abstract class NestableObject
{
    // TODO: Remove this method and class entirely, it's purely tech debt
    /**
     * @return mixed
     */
    protected abstract function setAsNested();
}