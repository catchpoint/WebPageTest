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

use function is_object;
use function method_exists;
use Respect\Stringifier\Stringifier;

/**
 * Converts a object that implements the __toString() magic method into a string.
 *
 * @author Henrique Moody <henriquemoody@gmail.com>
 */
final class StringableObjectStringifier implements Stringifier
{
    /**
     * @var Stringifier
     */
    private $stringifier;

    /**
     * Initializes the stringifier.
     *
     * @param Stringifier $stringifier
     */
    public function __construct(Stringifier $stringifier)
    {
        $this->stringifier = $stringifier;
    }

    /**
     * {@inheritdoc}
     */
    public function stringify($raw, int $depth): ?string
    {
        if (!is_object($raw)) {
            return null;
        }

        if (!method_exists($raw, '__toString')) {
            return null;
        }

        return $this->stringifier->stringify($raw->__toString(), $depth);
    }
}
