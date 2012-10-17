<?php
/*
 *  $Id$
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
 * Doctrine_Search_Analyzer_Utf8
 *
 * This class is used to analyze (ie tokenize) an input $text in 
 * $encoding encoding, and return an array of words to be indexed.
 *
 * @package     Doctrine
 * @subpackage  Search
 * @author      Brice Figureau <brice+doctrine@daysofwonder.com>
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @version     $Revision$
 * @link        www.doctrine-project.org
 * @since       1.0
 */
class Doctrine_Search_Analyzer_Utf8 extends Doctrine_Search_Analyzer_Standard
{
    public function analyze($text, $encoding = null)
    {
        if (is_null($encoding)) {
          $encoding = isset($this->_options['encoding']) ? $this->_options['encoding']:'utf-8';
        }

        // check that $text encoding is utf-8, if not convert it
        if (strcasecmp($encoding, 'utf-8') != 0 && strcasecmp($encoding, 'utf8') != 0) {
            $text = iconv($encoding, 'UTF-8', $text);
        }

        $text = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $text);
        $text = str_replace('  ', ' ', $text);

        $terms = explode(' ', $text);
        
        $ret = array();
        if ( ! empty($terms)) {
            foreach ($terms as $i => $term) {
                if (empty($term)) {
                    continue;
                }
                $lower = mb_strtolower(trim($term), 'UTF-8');

                if (in_array($lower, self::$_stopwords)) {
                    continue;
                }

                $ret[$i] = $lower;
            }
        }
        return $ret;
    }
}