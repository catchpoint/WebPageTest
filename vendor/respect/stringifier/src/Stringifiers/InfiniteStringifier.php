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

use function is_float;
use function is_infinite;
use Respect\Stringifier\Quoter;
use Respect\Stringifier\Stringifier;

/**
 * Converts an infinite float value into a string.
 *
 * @author Henrique Moody <henriquemoody@gmail.com>
 */
final class InfiniteStringifier implements Stringifier
{
    /**
     * @var Quoter
     */
    private $quoter;

    /**
     * Initializes the stringifier.
     *
     * @param Quoter $quoter
     */
    public function __construct(Quoter $quoter)
    {
        $this->quoter = $quoter;
    }

    /**
     * {@inheritdoc}
     */
    public function stringify($raw, int $depth): ?string
    {
        if (!is_float($raw)) {
            return null;
        }

        if (!is_infinite($raw)) {
            return null;
        }

        return $this->quoter->quote(($raw > 0 ? '' : '-').'INF', $depth);
    }
}
