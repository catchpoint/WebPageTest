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
 * Doctrine_Query_Tokenizer
 *
 * @package     Doctrine
 * @subpackage  Query
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision$
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Guilherme Blanco <guilhermeblanco@hotmail.com>
 * @author      Stefan Klug <stefan.klug@googlemail.com>
 */
class Doctrine_Query_Tokenizer
{

    /**
     * Splits the given dql query into an array where keys represent different
     * query part names and values are arrays splitted using sqlExplode method
     *
     * example:
     *
     * parameter:
     *     $query = "SELECT u.* FROM User u WHERE u.name LIKE ?"
     * returns:
     *     array(
     *         'select' => array('u.*'),
     *         'from'   => array('User', 'u'),
     *         'where'  => array('u.name', 'LIKE', '?')
     *     );
     *
     * @param string $query             DQL query
     *
     * @throws Doctrine_Query_Exception If some generic parsing error occurs
     *
     * @return array                    An array containing the query string parts
     */
    public function tokenizeQuery($query)
    {
        $tokens = $this->sqlExplode($query, ' ');
        $parts = array();

        foreach ($tokens as $index => $token) {
            $token = trim($token);

            switch (strtolower($token)) {
                case 'delete':
                case 'update':
                case 'select':
                case 'set':
                case 'from':
                case 'where':
                case 'limit':
                case 'offset':
                case 'having':
                    $p = $token;
                    //$parts[$token] = array();
                    $parts[$token] = '';
                break;
            
                case 'order':
                case 'group':
                    $i = ($index + 1);
                    if (isset($tokens[$i]) && strtolower($tokens[$i]) === 'by') {
                        $p = $token;
                        $parts[$token] = '';
                        //$parts[$token] = array();
                    } else {
                        $parts[$p] .= "$token ";
                        //$parts[$p][] = $token;
                    }
                break;
            
                case 'by':
                    continue;
            
                default:
                    if ( ! isset($p)) {
                        throw new Doctrine_Query_Tokenizer_Exception(
                            "Couldn't tokenize query. Encountered invalid token: '$token'."
                        );
                    }

                    $parts[$p] .= "$token ";
                    //$parts[$p][] = $token;
            }
        }

        return $parts;
    }

    /**
     * Trims brackets from string
     *
     * @param string $str String to remove the brackets
     * @param string $e1  First bracket, usually '('
     * @param string $e2  Second bracket, usually ')'
     *
     * @return string
     */
    public function bracketTrim($str, $e1 = '(', $e2 = ')')
    {
        if (substr($str, 0, 1) === $e1 && substr($str, -1) === $e2) {
            return substr($str, 1, -1);
        } else {
            return $str;
        }
    }

    /**
     * Explodes a sql expression respecting bracket placement.
     *
     * This method transform a sql expression in an array of simple clauses,
     * while observing the parentheses precedence.
     *
     * Note: bracketExplode always trims the returned pieces
     *
     * <code>
     * $str = (age < 20 AND age > 18) AND email LIKE 'John@example.com'
     * $clauses = $tokenizer->bracketExplode($str, ' AND ', '(', ')');
     * // array("(age < 20 AND age > 18)", "email LIKE 'John@example.com'")
     * </code>
     *
     * @param string $str String to be bracket exploded
     * @param string $d   Delimeter which explodes the string
     * @param string $e1  First bracket, usually '('
     * @param string $e2  Second bracket, usually ')'
     *
     * @return array
     */
    public function bracketExplode($str, $d = ' ', $e1 = '(', $e2 = ')')
    {
        if (is_string($d)) {
            $d = array($d);
        }

        // Bracket explode has to be case insensitive
        $regexp = $this->getSplitRegExpFromArray($d) . 'i';
        $terms = $this->clauseExplodeRegExp($str, $regexp, $e1, $e2);

        $res = array();

        // Trim is here for historical reasons
        foreach ($terms as $value) {
            $res[] = trim($value[0]);
        }

        return $res;
    }

    /**
     * Explode quotes from string
     *
     * Note: quoteExplode always trims the returned pieces
     *
     * example:
     *
     * parameters:
     *     $str = email LIKE 'John@example.com'
     *     $d = ' LIKE '
     *
     * would return an array:
     *     array("email", "LIKE", "'John@example.com'")
     *
     * @param string $str String to be quote exploded
     * @param string $d   Delimeter which explodes the string
     *
     * @return array
     */
    public function quoteExplode($str, $d = ' ')
    {
        if (is_string($d)) {
            $d = array($d);
        }

        // According to the testcases quoteExplode is case insensitive
        $regexp = $this->getSplitRegExpFromArray($d) . 'i';
        $terms = $this->clauseExplodeCountBrackets($str, $regexp);

        $res = array();

        foreach ($terms as $val) {
            $res[] = trim($val[0]);
        }

        return $res;
    }

    /**
     * Explodes a string into array using custom brackets and
     * quote delimeters
     *
     * Note: sqlExplode trims all returned parts
     *
     * example:
     *
     * parameters:
     *     $str = "(age < 20 AND age > 18) AND name LIKE 'John Doe'"
     *     $d   = ' '
     *     $e1  = '('
     *     $e2  = ')'
     *
     * would return an array:
     *     array(
     *         '(age < 20 AND age > 18)',
     *         'name',
     *         'LIKE',
     *         'John Doe'
     *     );
     *
     * @param string $str String to be SQL exploded
     * @param string $d   Delimeter which explodes the string
     * @param string $e1  First bracket, usually '('
     * @param string $e2  Second bracket, usually ')'
     *
     * @return array
     */
    public function sqlExplode($str, $d = ' ', $e1 = '(', $e2 = ')')
    {
        if (is_string($d)) {
            $d = array($d);
        }

        $terms = $this->clauseExplode($str, $d, $e1, $e2);
        $res = array();

        foreach ($terms as $value) {
            $res[] = trim($value[0]);
        }

        return $res;
    }

    /**
     * Explodes a string into array using custom brackets and quote delimeters
     * Each array element is a array of length 2 where the first entry contains
     * the term, and the second entry contains the corresponding delimiter
     *
     * example:
     *
     * parameters:
     *     $str = "(age < 20 AND age > 18) AND name LIKE 'John'+' Doe'"
     *     $d   = array(' ', '+')
     *     $e1  = '('
     *     $e2  = ')'
     *
     * would return an array:
     *     array(
     *         array('(age < 20 AND age > 18)', ' '),
     *         array('AND',  ' '),
     *         array('name', ' '),
     *         array('LIKE', ' '),
     *         array('John', '+'),
     *         array(' Doe', '')
     *     );
     *
     * @param string $str String to be clause exploded
     * @param string $d   Delimeter which explodes the string
     * @param string $e1  First bracket, usually '('
     * @param string $e2  Second bracket, usually ')'
     *
     * @return array
     */
    public function clauseExplode($str, array $d, $e1 = '(', $e2 = ')')
    {
        $regexp = $this->getSplitRegExpFromArray($d);

        return $this->clauseExplodeRegExp($str, $regexp, $e1, $e2);
    }

    /**
     * Builds regular expression for split from array. Return regular
     * expression to be applied
     *
     * @param $d
     *
     * @return string
     */
    private function getSplitRegExpFromArray(array $d)
    {
        foreach ($d as $key => $string) {
            $escapedString = preg_quote($string);
            if (preg_match('#^\w+$#', $string)) {
                $escapedString = "\W$escapedString\W";
            }
            $d[$key] = $escapedString;
        }

        if (in_array(' ', $d)) {
            $d[] = '\s';
        }

        return '#(' . implode('|', $d) . ')#';
    }

    /**
     * Same as clauseExplode, but you give a regexp, which splits the string
     *
     * @param $str
     * @param $regexp
     * @param $e1
     * @param $e2
     *
     * @return array
     */
    private function clauseExplodeRegExp($str, $regexp, $e1 = '(', $e2 = ')')
    {
        $terms = $this->clauseExplodeCountBrackets($str, $regexp, $e1, $e2);
        $terms = $this->mergeBracketTerms($terms);

        // This is only here to comply with the old function signature
        foreach ($terms as & $val) {
            unset($val[2]);
        }

        return $terms;
    }

    /**
     * this function is like clauseExplode, but it doesn't merge bracket terms
     *
     * @param $str
     * @param $d
     * @param $e1
     * @param $e2
     *
     * @return unknown_type
     */
    private function clauseExplodeCountBrackets($str, $regexp, $e1 = '(', $e2 = ')')
    {
        $quoteTerms = $this->quotedStringExplode($str);
        $terms = array();
        $i = 0;

        foreach ($quoteTerms as $key => $val) {
            if ($key & 1) { // a quoted string
               // If the last term had no ending delimiter, we append the string to the element,
               // otherwise, we create a new element without delimiter
               if ($terms[$i - 1][1] == '') {
                   $terms[$i - 1][0] .= $val;
               } else {
                   $terms[$i++] = array($val, '', 0);
               }
            } else { // Not a quoted string
                // Do the clause explode
                $subterms = $this->clauseExplodeNonQuoted($val, $regexp);

                foreach ($subterms as &$sub) {
                    $c1 = substr_count($sub[0], $e1);
                    $c2 = substr_count($sub[0], $e2);

                    $sub[2] = $c1 - $c2;
                }

                // If the previous term had no delimiter, merge them
                if ($i > 0 && $terms[$i - 1][1] == '') {
                    $first = array_shift($subterms);
                    $idx = $i - 1;

                    $terms[$idx][0] .= $first[0];
                    $terms[$idx][1] = $first[1];
                    $terms[$idx][2] += $first[2];
                }

                $terms = array_merge($terms, $subterms);
                $i += sizeof($subterms);
            }
        }
        
        return $terms;
    }

    /**
     * Explodes a string by the given delimiters, and counts quotes in every
     * term. This function doesn't respect quoted strings.
     * The returned array contains a array per term. These term array contain
     * the following elemnts:
     * [0] = the term itself
     * [1] = the delimiter splitting this term from the next
     * [2] = the sum of opening and closing brackets in this term
     *          (eg. -2 means 2 closing brackets (or 1 opening and 3 closing))
     *
     * example:
     *
     * parameters:
     *     $str = "a (b '(c+d))'"
     *     $d = array(' ', '+')
     *
     * returns:
     *     array(
     *        array('a', ' ', 0),
     *        array('(b', ' ', 1),
     *        array("'(c", '+', 1),
     *        array("d))'", '', -2)
     *     );
     *
     * @param $str
     * @param $d
     * @param $e1
     * @param $e2
     *
     * @return array
     */
    private function clauseExplodeNonQuoted($str, $regexp)
    {
        $str = preg_split($regexp, $str, -1, PREG_SPLIT_DELIM_CAPTURE);
        $term = array();
        $i = 0;

        foreach ($str as $key => $val) {
            // Every odd entry is a delimiter, so add it to the previous term entry
            if ( ! ($key & 1)) {
                $term[$i] = array($val, '');
            } else {
                $term[$i++][1] = $val;
            }
        }

        return $term;
    }

    /**
     * This expects input from clauseExplodeNonQuoted.
     * It will go through the result and merges any bracket terms with 
     * unbalanced bracket count.
     * Note that only the third parameter in each term is used to get the 
     * bracket overhang. This is needed to be able to handle quoted strings
     * wich contain brackets
     *
     * example:
     *
     * parameters:
     *     $terms = array(
     *         array("'a(b'", '+', 0)
     *         array('(2', '+', 1),
     *         array('3)', '-', -1),
     *         array('5', '' , '0')
     *     );
     *
     * would return:
     *     array(
     *         array("'a(b'", '+', 0),
     *         array('(2+3)', '-', 0),
     *         array('5'    , '' , 0)
     *     );
     *
     * @param $terms array
     *
     * @return array
     */
    private function mergeBracketTerms(array $terms)
    {
        $res = array();
        $i = 0;

        foreach ($terms as $val) {
            if ( ! isset($res[$i])) {
                $res[$i] = array($val[0], $val[1], $val[2]);
            } else {
                $res[$i][0] .= $res[$i][1] . $val[0]; 
                $res[$i][1] = $val[1];
                $res[$i][2] += $val[2];
            }

            // Bracket overhang
            if ($res[$i][2] == 0) {
                $i++;
            }
        }

        return $res;
    }


    /**
     * Explodes the given string by <quoted words>
     *
     * example:
     *
     * paramters:
     *     $str ="'a' AND name = 'John O\'Connor'"
     *
     * returns
     *     array("", "'a'", " AND name = ", "'John O\'Connor'")
     *
     * Note the trailing empty string. In the result, all even elements are quoted strings.
     *
     * @param $str the string to split
     *
     * @return array
     */
    public function quotedStringExplode($str)
    {
        // Split by all possible incarnations of a quote
        $split = array_map('preg_quote', array("\\'","''","'", "\\\"", "\"\"", "\""));
        $split = '#(' . implode('|', $split) . ')#';
        $str = preg_split($split, $str, -1, PREG_SPLIT_DELIM_CAPTURE);

        $parts = array();
        $mode = false; // Mode is either ' or " if the loop is inside a string quoted with ' or "
        $i = 0;

        foreach ($str as $key => $val) {
            // This is some kind of quote
            if ($key & 1) {
                if ( ! $mode) {
                    if ($val == "'" || $val == "\"") {
                        $mode = $val;
                        $i++;
                    }
                } else if ($mode == $val) {
                    if ( ! isset($parts[$i])) {
                        $parts[$i] = $val;
                    } else {
                        $parts[$i] .= $val;
                    }

                    $mode = false;
                    $i++;

                    continue;
                }
            }

            if ( ! isset($parts[$i])) {
                $parts[$i] = $val;
            } else {
                $parts[$i] .= $val;
            }
        }

        return $parts;
    }
}
