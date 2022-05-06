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

use Respect\Stringifier\Quoters\CodeQuoter;
use Respect\Stringifier\Quoters\StringQuoter;
use Respect\Stringifier\Stringifier;

/**
 * Converts a value into a string using the defined Stringifiers.
 *
 * @author Henrique Moody <henriquemoody@gmail.com>
 */
final class ClusterStringifier implements Stringifier
{
    /**
     * @var Stringifier[]
     */
    private $stringifiers;

    /**
     * Initializes the stringifier.
     *
     * @param Stringifier[] ...$stringifiers
     */
    public function __construct(Stringifier ...$stringifiers)
    {
        $this->setStringifiers($stringifiers);
    }

    /**
     * Create a default instance of the class.
     *
     * This instance includes all possible stringifiers.
     *
     * @return ClusterStringifier
     */
    public static function createDefault(): self
    {
        $quoter = new CodeQuoter();

        $stringifier = new self();
        $stringifier->setStringifiers([
            new TraversableStringifier($stringifier, $quoter),
            new DateTimeStringifier($stringifier, $quoter, 'c'),
            new ThrowableStringifier($stringifier, $quoter),
            new StringableObjectStringifier($stringifier),
            new JsonSerializableStringifier($stringifier, $quoter),
            new ObjectStringifier($stringifier, $quoter),
            new ArrayStringifier($stringifier, $quoter, 3, 5),
            new InfiniteStringifier($quoter),
            new NanStringifier($quoter),
            new ResourceStringifier($quoter),
            new BoolStringifier($quoter),
            new NullStringifier($quoter),
            new JsonParsableStringifier(),
        ]);

        return $stringifier;
    }

    /**
     * Set stringifiers.
     *
     * @param array $stringifiers
     *
     * @return void
     */
    public function setStringifiers(array $stringifiers): void
    {
        $this->stringifiers = [];

        foreach ($stringifiers as $stringifier) {
            $this->addStringifier($stringifier);
        }
    }

    /**
     * Add a stringifier to the chain
     *
     * @param Stringifier $stringifier
     *
     * @return void
     */
    public function addStringifier(Stringifier $stringifier): void
    {
        $this->stringifiers[] = $stringifier;
    }

    /**
     * {@inheritdoc}
     */
    public function stringify($value, int $depth): ?string
    {
        foreach ($this->stringifiers as $stringifier) {
            $string = $stringifier->stringify($value, $depth);
            if (null === $string) {
                continue;
            }

            return $string;
        }

        return null;
    }
}
