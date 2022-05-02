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

use function get_class;
use function getcwd;
use function sprintf;
use function str_replace;
use Respect\Stringifier\Quoter;
use Respect\Stringifier\Stringifier;
use Throwable;

/**
 * Converts an instance of Throwable into a string.
 *
 * @author Henrique Moody <henriquemoody@gmail.com>
 */
final class ThrowableStringifier implements Stringifier
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
        if (!$raw instanceof Throwable) {
            return null;
        }

        return $this->quoter->quote(
            sprintf(
                '[throwable] (%s: %s)',
                get_class($raw),
                $this->stringifier->stringify($this->getData($raw), $depth + 1)
            ),
            $depth
        );
    }

    private function getData(Throwable $throwable): array
    {
        return [
            'message' => $throwable->getMessage(),
            'code' => $throwable->getCode(),
            'file' => sprintf(
                '%s:%d',
                str_replace(getcwd().'/', '', $throwable->getFile()),
                $throwable->getLine()
            ),
        ];
    }
}
