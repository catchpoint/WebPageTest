<?php

/*
 * This file is part of Respect/Stringifier.
 *
 * (c) Henrique Moody <henriquemoody@gmail.com>
 *
 * For the full copyright and license information, please view the "LICENSE.md"
 * file that was distributed with this source code.
 */

declare(strict_types=1);

namespace Respect\Stringifier\Stringifiers;

use function array_keys;
use function implode;
use function is_array;
use function is_int;
use function sprintf;
use Respect\Stringifier\Quoter;
use Respect\Stringifier\Stringifier;

/**
 * Converts an array value into a string.
 *
 * @author Henrique Moody <henriquemoody@gmail.com>
 */
final class ArrayStringifier implements Stringifier
{
    /**
     * @var Stringifier
     */
    private $stringifier;

    /**
     * @var Quoter
     */
    private $quoter;

    /**
     * @var int
     */
    private $maximumDepth;

    /**
     * @var int
     */
    private $itemsLimit;

    /**
     * Initializes the stringifier.
     *
     * @param Stringifier $stringifier
     * @param Quoter $quoter
     * @param int $maximumDepth
     * @param int $itemsLimit
     */
    public function __construct(Stringifier $stringifier, Quoter $quoter, int $maximumDepth, int $itemsLimit)
    {
        $this->stringifier = $stringifier;
        $this->quoter = $quoter;
        $this->maximumDepth = $maximumDepth;
        $this->itemsLimit = $itemsLimit;
    }

    /**
     * {@inheritdoc}
     */
    public function stringify($raw, int $depth): ?string
    {
        if (!is_array($raw)) {
            return null;
        }

        if (empty($raw)) {
            return $this->quoter->quote('{ }', $depth);
        }

        if ($depth >= $this->maximumDepth) {
            return '...';
        }

        $items = [];
        $itemsCount = 0;
        $isSequential = $this->isSequential($raw);
        foreach ($raw as $key => $value) {
            if (++$itemsCount > $this->itemsLimit) {
                $items[$itemsCount] = '...';
                break;
            }

            $items[$itemsCount] = '';
            if (false === $isSequential) {
                $items[$itemsCount] .= sprintf('%s: ', $this->stringifier->stringify($key, $depth + 1));
            }
            $items[$itemsCount] .= $this->stringifier->stringify($value, $depth + 1);
        }

        return $this->quoter->quote(sprintf('{ %s }', implode(', ', $items)), $depth);
    }

    /**
     * Returns whether the array is sequential or not.
     *
     * @param array $array
     *
     * @return bool
     */
    private function isSequential(array $array): bool
    {
        return array_keys($array) === range(0, count($array) - 1);
    }
}
