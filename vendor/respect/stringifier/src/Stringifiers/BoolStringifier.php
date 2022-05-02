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

use function is_bool;
use Respect\Stringifier\Quoter;
use Respect\Stringifier\Stringifier;

/**
 * Converts a boolean value into a string.
 *
 * @author Henrique Moody <henriquemoody@gmail.com>
 */
final class BoolStringifier implements Stringifier
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
        if (!is_bool($raw)) {
            return null;
        }

        return $this->quoter->quote($raw ? 'TRUE' : 'FALSE', $depth);
    }
}
