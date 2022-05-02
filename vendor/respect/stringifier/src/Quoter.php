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

interface Quoter
{
    /**
     * Should add quotes to the given string.
     *
     * @param string $string The string to add quotes to
     * @param int $depth The current depth
     *
     * @return string
     */
    public function quote(string $string, int $depth): string;
}
