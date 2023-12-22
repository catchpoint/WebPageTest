<?php
/**
 * Ensures that functions within functions are never used.
 *
 * @author    Greg Sherwood <gsherwood@squiz.net>
 * @copyright 2006-2015 Squiz Pty Ltd (ABN 77 084 670 600)
 * @license   https://github.com/PHPCSStandards/PHP_CodeSniffer/blob/master/licence.txt BSD Licence
 */

namespace PHP_CodeSniffer\Standards\Squiz\Sniffs\PHP;

use PHP_CodeSniffer\Files\File;
use PHP_CodeSniffer\Sniffs\Sniff;
use PHP_CodeSniffer\Util\Tokens;

class InnerFunctionsSniff implements Sniff
{


    /**
     * Returns an array of tokens this test wants to listen for.
     *
     * @return array
     */
    public function register()
    {
        return [T_FUNCTION];

    }//end register()


    /**
     * Processes this test, when one of its tokens is encountered.
     *
     * @param \PHP_CodeSniffer\Files\File $phpcsFile The file being scanned.
     * @param int                         $stackPtr  The position of the current token in the
     *                                               stack passed in $tokens.
     *
     * @return void
     */
    public function process(File $phpcsFile, $stackPtr)
    {
        $tokens = $phpcsFile->getTokens();

        if (isset($tokens[$stackPtr]['conditions']) === false) {
            return;
        }

        $conditions         = $tokens[$stackPtr]['conditions'];
        $reversedConditions = array_reverse($conditions, true);

        $outerFuncToken = null;
        foreach ($reversedConditions as $condToken => $condition) {
            if ($condition === T_FUNCTION || $condition === T_CLOSURE) {
                $outerFuncToken = $condToken;
                break;
            }

            if (\array_key_exists($condition, Tokens::$ooScopeTokens) === true) {
                // Ignore methods in OOP structures defined within functions.
                return;
            }
        }

        if ($outerFuncToken === null) {
            // Not a nested function.
            return;
        }

        $error = 'The use of inner functions is forbidden';
        $phpcsFile->addError($error, $stackPtr, 'NotAllowed');

    }//end process()


}//end class
