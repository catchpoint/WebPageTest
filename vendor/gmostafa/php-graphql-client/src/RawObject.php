<?php

namespace GraphQL;

/**
 * Class RawObject
 *
 * @package GraphQL
 */
class RawObject
{
    /**
     * @var string
     */
    protected $objectString;

    /**
     * JsonObject constructor.
     *
     * @param string $objectString
     */
    public function __construct(string $objectString)
    {
        $this->objectString = $objectString;
    }

    /**
     * @return mixed
     */
    public function __toString()
    {
        return $this->objectString;
    }
}