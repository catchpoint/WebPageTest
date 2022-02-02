<?php

namespace GraphQL;

use GraphQL\Exception\InvalidSelectionException;

trait FieldTrait
{
    /**
     * Stores the selection set desired to get from the query, can include nested queries
     *
     * @var array
     */
    protected $selectionSet;

    /**
     * @param array $selectionSet
     *
     * @return $this
     * @throws InvalidSelectionException
     */
    public function setSelectionSet(array $selectionSet)
    {
        $nonStringsFields = array_filter($selectionSet, function($element) {
            return !is_string($element) && !$element instanceof Query && !$element instanceof InlineFragment;
        });
        if (!empty($nonStringsFields)) {
            throw new InvalidSelectionException(
                'One or more of the selection fields provided is not of type string or Query'
            );
        }

        $this->selectionSet = $selectionSet;

        return $this;
    }

    /**
     * @return string
     */
    protected function constructSelectionSet(): string
    {
        if (empty($this->selectionSet)) {
            return '';
	    }

        $attributesString = " {" . PHP_EOL;
        $first            = true;
        foreach ($this->selectionSet as $attribute) {

            // Append empty line at the beginning if it's not the first item on the list
            if ($first) {
                $first = false;
            } else {
                $attributesString .= PHP_EOL;
            }

            // If query is included in attributes set as a nested query
            if ($attribute instanceof Query) {
                $attribute->setAsNested();
            }

            // Append attribute to returned attributes list
            $attributesString .= $attribute;
        }
        $attributesString .= PHP_EOL . "}";

        return $attributesString;
    }

    public function getSelectionSet()
    {
        return $this->selectionSet;
    }
}
