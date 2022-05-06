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

namespace Respect\Stringifier;

interface Stringifier
{
    /**
     * Converts the value into string if possible.
     *
     * @param mixed $raw The raw value to be converted.
     * @param int $depth The current depth of the conversion.
     *
     * @return null|string Returns NULL when the conversion is not possible.
     */
    public function stringify($raw, int $depth): ?string;
}
