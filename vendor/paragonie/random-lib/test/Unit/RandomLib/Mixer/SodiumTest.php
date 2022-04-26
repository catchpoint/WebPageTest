<?php

/*
 * The RandomLib library for securely generating random numbers and strings in PHP
 *
 * @author     Anthony Ferrara <ircmaxell@ircmaxell.com>
 * @copyright  2011 The Authors
 * @license    http://www.opensource.org/licenses/mit-license.html  MIT License
 * @version    Build @@version@@
 */
namespace RandomLib\Mixer;

use SecurityLib\Strength;

class SodiumTest extends \PHPUnit_Framework_TestCase
{
    public static function provideMix()
    {
        $data = array(
            array(array(), ''),
            array(array('', ''), ''),
            array(array('a'), '61'),
            array(array('a', 'b'), '44'),
            array(array('aa', 'ba'), '6967'),
            array(array('ab', 'bb'), '73a6'),
            array(array('aa', 'bb'), 'bc7b'),
            array(array('aa', 'bb', 'cc'), '0cbd'),
            array(array('aabbcc', 'bbccdd', 'ccddee'), '5f0005cacd7c'),
        );

        return $data;
    }

    protected function setUp()
    {
        if (!\is_callable('sodium_crypto_generichash') || defined('HHVM_VERSION')) {
            $this->markTestSkipped('sodium extension is not available');
        }
    }

    public function testConstructWithoutArgument()
    {
        $hash = new SodiumMixer();
        $this->assertTrue($hash instanceof \RandomLib\Mixer);
    }

    public function testGetStrength()
    {
        $strength = new Strength(Strength::HIGH);
        $actual = SodiumMixer::getStrength();
        $this->assertEquals($actual, $strength);
    }

    public function testTest()
    {
        $actual = SodiumMixer::test();
        $this->assertTrue($actual);
    }

    /**
     * @dataProvider provideMix
     */
    public function testMix($parts, $result)
    {
        $mixer = new SodiumMixer();
        $actual = $mixer->mix($parts);
        $this->assertEquals($result, bin2hex($actual));
    }
}
