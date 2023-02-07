<?php

declare(strict_types=1);

namespace WebPageTest\CPGraphQlTypes;

use IteratorAggregate;
use Traversable;
use Countable;
use ArrayIterator;
use WebPageTest\CPGraphQlTypes\ApiKey;

/**
 * @template-implements IteratorAggregate<ApiKey> getIterator()
 * @template-implements Countable count()
 *
 */
class ApiKeyList implements IteratorAggregate, Countable
{
    private array $list;

    public function __construct(ApiKey ...$api_key)
    {
        $this->list = $api_key;
    }

    public function add(ApiKey $api_key)
    {
        $this->list[] = $api_key;
    }

    public function toArray(): array
    {
        return $this->list;
    }

    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->list);
    }

    public function count(): int
    {
        return count($this->list);
    }
}
