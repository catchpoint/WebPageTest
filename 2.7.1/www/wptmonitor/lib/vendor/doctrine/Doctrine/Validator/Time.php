<?php
/*
 *  $Id: Time.php 3884 2008-02-22 18:26:35Z jwage $
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
 * Doctrine_Validator_Time
 *
 * @package     Doctrine
 * @subpackage  Validator
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 3884 $
 * @author      Mark Pearson <mark.pearson0@googlemail.com>
 */
class Doctrine_Validator_Time extends Doctrine_Validator_Driver
{
    /**
     * validate
     *
     * checks if given value is a valid time
     *
     * @param mixed $value
     * @return boolean
     */
    public function validate($value)
    {
        if (is_null($value)) {
            return true;
        }

		if ( ! preg_match('/^\s*(\d{2}):(\d{2})(:(\d{2}))?(\.(\d{1,6}))?([+-]\d{1,2}(:(\d{2}))?)?\s*$/', $value, $matches)) {
            return false;
        }

        $hh = (isset($matches[1])) ? intval($matches[1]) : 0;
        $mm = (isset($matches[2])) ? intval($matches[2]) : 0;
        $ss = (isset($matches[4])) ? intval($matches[4]) : 0;
        $ms = (isset($matches[6])) ? intval($matches[6]) : 0;
        $tz_hh = (isset($matches[7])) ? intval($matches[7]) : 0;
        $tz_mm = (isset($matches[9])) ? intval($matches[9]) : 0;

        return 	($hh >= 0 && $hh <= 23) &&
				($mm >= 0 && $mm <= 59) &&
				($ss >= 0 && $ss <= 59) &&
				($tz_hh >= -13 && $tz_hh <= 14) &&
				($tz_mm >= 0 && $tz_mm <= 59) ;
    }
}
