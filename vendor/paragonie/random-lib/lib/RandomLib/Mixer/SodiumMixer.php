<?php
namespace RandomLib\Mixer;

use RandomLib\AbstractMixer;
use SecurityLib\Strength;
use SecurityLib\Util;

/**
 * Class SodiumMixer
 *
 * @package RandomLib\Mixer
 *
 * @category   PHPCryptLib
 * @package    Random
 * @subpackage Mixer
 *
 * @author     Paragon Initiative Enterprises <security@paragonie.com>
 * @copyright  2017 The Authors
 * @license    http://www.opensource.org/licenses/mit-license.html  MIT License
 *
 * @version    Build @@version@@
 */
class SodiumMixer extends AbstractMixer
{
    const SALSA20_BLOCK_SIZE = 64;

    /**
     * Return an instance of Strength indicating the strength of the source
     *
     * @return \SecurityLib\Strength An instance of one of the strength classes
     */
    public static function getStrength()
    {
        return new Strength(Strength::HIGH);
    }

    /**
     * Test to see if the mixer is available
     *
     * @return bool If the mixer is available on the system
     */
    public static function test()
    {
        return is_callable('sodium_crypto_stream') && is_callable('sodium_crypto_generichash');
    }

    /**
     * @return bool
     */
    public static function advisable()
    {
        return static::test() && !defined('HHVM_VERSION');
    }

    /**
     * Get the block size (the size of the individual blocks used for the mixing)
     *
     * @return int The block size
     */
    protected function getPartSize()
    {
        return self::SALSA20_BLOCK_SIZE;

    }

    /**
     * Mix 2 parts together using one method
     *
     * This method is jut a simple BLAKE2b hash of the two strings
     * concatenated together
     *
     * @param string $part1 The first part to mix
     * @param string $part2 The second part to mix
     *
     * @return string The mixed data
     */
    protected function mixParts1($part1, $part2)
    {
        return (string) \sodium_crypto_generichash($part1 . $part2, '', $this->getPartSize());
    }

    /**
     * Mix 2 parts together using another different method
     *
     * This method is a salsa20 stream based on a hash of the two inputs
     *
     * @param string $part1 The first part to mix
     * @param string $part2 The second part to mix
     *
     * @return string The mixed data
     */
    protected function mixParts2($part1, $part2)
    {
        // Pre-hash the two inputs into a 448-bit output
        /** @var string $hash */
        $hash = \sodium_crypto_generichash($part1 . $part2, '', 56);

        // Use salsa20 to expand into a pseudorandom string
        return (string) \sodium_crypto_stream(
            $this->getPartSize(),
            Util::safeSubstr($hash, 0, 24),
            Util::safeSubstr($hash, 0, 32)
        );
    }
}
