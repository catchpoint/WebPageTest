<?php

namespace Psalm\Internal\Type\ParseTree;

use Psalm\Internal\Type\ParseTree;

/**
 * @internal
 */
final class KeyedArrayPropertyTree extends ParseTree
{
    public string $value;

    public function __construct(string $value, ?ParseTree $parent = null)
    {
        $this->value = $value;
        $this->parent = $parent;
    }
}
