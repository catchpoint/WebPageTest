<?php

/*
 * The RandomLib library for securely generating random numbers and strings in PHP
 *
 * @author     Anthony Ferrara <ircmaxell@ircmaxell.com>
 * @copyright  2011 The Authors
 * @license    http://www.opensource.org/licenses/mit-license.html  MIT License
 * @version    Build @@version@@
 */

/**
 * An abstract mixer to implement a common mixing strategy
 *
 * PHP version 5.3
 *
 * @category  PHPSecurityLib
 * @package   Random
 *
 * @author    Anthony Ferrara <ircmaxell@ircmaxell.com>
 * @author    Paragon Initiative Enterprises <security@paragonie.com>
 * @copyright 2011 The Authors
 * @license    http://www.opensource.org/licenses/mit-license.html  MIT License
 *
 * @version   Build @@version@@
 */
namespace RandomLib;

use SecurityLib\Util;

/**
 * An abstract mixer to implement a common mixing strategy
 *
 * @see      http://tools.ietf.org/html/rfc4086#section-5.2
 *
 * @category PHPSecurityLib
 * @package  Random
 *
 * @author   Anthony Ferrara <ircmaxell@ircmaxell.com>
 * @author    Paragon Initiative Enterprises <security@paragonie.com>
 */
abstract class AbstractMixer implements \RandomLib\Mixer
{

    /**
     * Get the block size (the size of the individual blocks used for the mixing)
     *
     * @return int The block size
     */
    abstract protected function getPartSize();

    /**
     * Mix 2 parts together using one method
     *
     * @param string $part1 The first part to mix
     * @param string $part2 The second part to mix
     *
     * @return string The mixed data
     */
    abstract protected function mixParts1($part1, $part2);

    /**
     * Mix 2 parts together using another different method
     *
     * @param string $part1 The first part to mix
     * @param string $part2 The second part to mix
     *
     * @return string The mixed data
     */
    abstract protected function mixParts2($part1, $part2);

    /**
     * @return bool
     */
    public static function advisable()
    {
        return (bool) static::test();
    }

    /**
     * Mix the provided array of strings into a single output of the same size
     *
     * All elements of the array should be the same size.
     *
     * @param array<int, string> $parts The parts to be mixed
     *
     * @return string The mixed result
     * @psalm-suppress MixedArgument
     */
    public function mix(array $parts)
    {
        if (empty($parts)) {
            return '';
        }
        /** @var int $len */
        $len        = Util::safeStrlen($parts[0]);
        /** @var array<int, array<int, string>> $parts */
        $parts      = $this->normalizeParts($parts);
        $stringSize = \count($parts[0]);
        $partsSize  = \count($parts);
        /** @var string $result */
        $result     = '';
        /** @var int $offset */
        $offset     = 0;
        for ($i = 0; $i < $stringSize; ++$i) {
            /** @var string $stub */
            $stub = (string) $parts[$offset][$i];
            for ($j = 1; $j < $partsSize; ++$j) {
                /** @var string $newKey */
                $newKey = $parts[($j + $offset) % $partsSize][$i];
                //Alternately mix the output for each source
                if ($j % 2 == 1) {
                    $stub ^= $this->mixParts1($stub, $newKey);
                } else {
                    $stub ^= $this->mixParts2($stub, $newKey);
                }
            }
            $result .= $stub;
            $offset  = ($offset + 1) % $partsSize;
        }

        /** @var string $final */
        $final = Util::safeSubstr($result, 0, $len);
        return $final;
    }

    /**
     * Normalize the part array and split it block part size.
     *
     * This will make all parts the same length and a multiple
     * of the part size
     *
     * @param array<int, string> $parts The parts to normalize
     *
     * @return array The normalized and split parts
     * @psalm-suppress MissingClosureReturnType
     * @psalm-suppress UntypedParam
     * @psalm-suppress MissingArgument
     */
    protected function normalizeParts(array $parts)
    {
        if (empty($parts)) {
            return $parts;
        }
        $blockSize = $this->getPartSize();
        $callback =
        /**
         * @var callable $callback
         * @param string $value
         * @return int
         */
        function ($value) {
            return (int) Util::safeStrlen($value);
        };

        $mapped = array_map($callback, $parts);
        if (count($mapped) < 1) {
            return array();
        }
        /** @var int $maxSize */
        $maxSize = count($mapped) > 1
            ? max($mapped)
            : array_shift($mapped);
        if ($maxSize % $blockSize != 0) {
            $maxSize += $blockSize - ($maxSize % $blockSize);
        }
        foreach ($parts as &$part) {
            $part = $this->str_pad($part, $maxSize, chr(0));
            $part = str_split($part, $blockSize);
        }

        return $parts;
    }

    /**
     * @param string $string
     * @param int $size
     * @param string $character
     * @return string
     */
    private function str_pad($string, $size, $character)
    {
        $start = Util::safeStrlen($string);
        $inc = Util::safeStrlen($character);
        for ($i = $start; $i < $size; $i+= $inc) {
            $string = $string . $character;
        }

        return Util::safeSubstr($string, 0, $size);
    }
}
