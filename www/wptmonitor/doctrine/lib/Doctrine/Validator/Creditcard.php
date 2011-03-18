<?php
/*
 *  $Id: Creditcard.php 7490 2010-03-29 19:53:27Z jwage $
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * This software consists of voluntary contributions made by many individuals
 * and is licensed under the LGPL. For more information, see
 * <http://www.doctrine-project.org>.
 */

/**
 * Doctrine_Validator_Creditcard
 *
 * @package     Doctrine
 * @subpackage  Validator
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Validator_Creditcard extends Doctrine_Validator_Driver
{                                                         
    /**
     * checks if given value is a valid credit card number
     *
     * @link http://www.owasp.org/index.php/OWASP_Validation_Regex_Repository
     * @param mixed $value
     * @return boolean
     */
    public function validate($value)
    {
        if (is_null($value)) {
            return true;
        }
        $cardType = "";
        $card_regexes = array(
            "/^4\d{12}(\d\d\d){0,1}$/"      => 'visa',
            "/^5[12345]\d{14}$/"            => 'mastercard',
            "/^3[47]\d{13}$/"               => 'amex',
            "/^6011\d{12}$/"                => 'discover',
            "/^30[012345]\d{11}$/"          => 'diners',
            "/^3[68]\d{12}$/"               => 'diners',
        );
        foreach ($card_regexes as $regex => $type) {
            if (preg_match($regex, $value)) {
                 $cardType = $type;
                 break;
            }
        }
        if ( ! $cardType) {
            return false;
        }
        /* mod 10 checksum algorithm */
        $revcode = strrev($value);
        $checksum = 0;
        for ($i = 0; $i < strlen($revcode); $i++) {
            $currentNum = intval($revcode[$i]);
            if ($i & 1) {               /* Odd position */
                 $currentNum *= 2;
            }
            /* Split digits and add. */
            $checksum += $currentNum % 10;
            if ($currentNum > 9) {
                 $checksum += 1;
            }
        }
        if ($checksum % 10 == 0) {
            return true;
        } else {
            return false;
        }
    }
}