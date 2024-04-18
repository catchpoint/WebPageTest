<?php
/**
 * Tests to verify that the "explain" command functions as expected.
 *
 * @author    Juliette Reinders Folmer <phpcs_nospam@adviesenzo.nl>
 * @copyright 2023 Juliette Reinders Folmer. All rights reserved.
 * @license   https://github.com/squizlabs/PHP_CodeSniffer/blob/master/licence.txt BSD Licence
 */

namespace PHP_CodeSniffer\Tests\Core\Ruleset;

use PHP_CodeSniffer\Config;
use PHP_CodeSniffer\Ruleset;
use PHPUnit\Framework\TestCase;

/**
 * Test the Ruleset::explain() function.
 *
 * @covers \PHP_CodeSniffer\Ruleset::explain
 */
class ExplainTest extends TestCase
{


    /**
     * Test the output of the "explain" command.
     *
     * @return void
     */
    public function testExplain()
    {
        // Set up the ruleset.
        $config  = new Config(['--standard=PSR1', '-e']);
        $ruleset = new Ruleset($config);

        $expected  = PHP_EOL;
        $expected .= 'The PSR1 standard contains 8 sniffs'.PHP_EOL.PHP_EOL;
        $expected .= 'Generic (4 sniffs)'.PHP_EOL;
        $expected .= '------------------'.PHP_EOL;
        $expected .= '  Generic.Files.ByteOrderMark'.PHP_EOL;
        $expected .= '  Generic.NamingConventions.UpperCaseConstantName'.PHP_EOL;
        $expected .= '  Generic.PHP.DisallowAlternativePHPTags'.PHP_EOL;
        $expected .= '  Generic.PHP.DisallowShortOpenTag'.PHP_EOL.PHP_EOL;
        $expected .= 'PSR1 (3 sniffs)'.PHP_EOL;
        $expected .= '---------------'.PHP_EOL;
        $expected .= '  PSR1.Classes.ClassDeclaration'.PHP_EOL;
        $expected .= '  PSR1.Files.SideEffects'.PHP_EOL;
        $expected .= '  PSR1.Methods.CamelCapsMethodName'.PHP_EOL.PHP_EOL;
        $expected .= 'Squiz (1 sniff)'.PHP_EOL;
        $expected .= '---------------'.PHP_EOL;
        $expected .= '  Squiz.Classes.ValidClassName'.PHP_EOL;

        $this->expectOutputString($expected);

        $ruleset->explain();

    }//end testExplain()


}//end class
