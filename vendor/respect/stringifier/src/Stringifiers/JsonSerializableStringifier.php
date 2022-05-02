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

use Respect\Stringifier\Quoter;
use Respect\Stringifier\Stringifier;
use JsonSerializable;

/**
 * Converts an instance of JsonSerializable into a string.
 *
 * @author Henrique Moody <henriquemoody@gmail.com>
 */
final class JsonSerializableStringifier implements Stringifier
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
     * Initializes the stringifier.
     *
     * @param Stringifier $stringifier
     * @param Quoter $quoter
     */
    public function __construct(Stringifier $stringifier, Quoter $quoter)
    {
        $this->stringifier = $stringifier;
        $this->quoter = $quoter;
    }

    /**
     * {@inheritdoc}
     */
    public function stringify($raw, int $depth): ?string
    {
        if (!$raw instanceof JsonSerializable) {
            return null;
        }

        return $this->quoter->quote(
            sprintf(
                '[json-serializable] (%s: %s)',
                get_class($raw),
                $this->stringifier->stringify($raw->jsonSerialize(), $depth + 1)
            ),
            $depth
        );
    }
}
