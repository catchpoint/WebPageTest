<?php
/*
 *  $Id: JoinCondition.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Query_JoinCondition
 *
 * @package     Doctrine
 * @subpackage  Query
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Query_JoinCondition extends Doctrine_Query_Condition
{
    public function load($condition)
    {
        $condition = trim($condition);
        $e = $this->_tokenizer->sqlExplode($condition);

        foreach ($e as $k => $v) {
          if ( ! $v) {
            unset($e[$k]);
          }
        }
        $e = array_values($e);

        if (($l = count($e)) > 2) {
            $leftExpr = $this->query->parseClause($e[0]);
            $operator  = $e[1];

            if ($l == 4) {
                // FIX: "field NOT IN (XXX)" issue
                // Related to ticket #1329
                $operator .= ' ' . $e[2]; // Glue "NOT" and "IN"
                $e[2] = $e[3]; // Move "(XXX)" to previous index

                unset($e[3]); // Remove unused index
            } else if ($l >= 5) {
                // FIX: "field BETWEEN field2 AND field3" issue
                // Related to ticket #1488
                $e[2] .= ' ' . $e[3] . ' ' . $e[4];

                unset($e[3], $e[4]); // Remove unused indexes
            }

            if (substr(trim($e[2]), 0, 1) != '(') {
                $expr = new Doctrine_Expression($e[2], $this->query->getConnection());
                $e[2] = $expr->getSql();
            }

            // We need to check for agg functions here
            $rightMatches = array();
            $hasRightAggExpression = $this->_processPossibleAggExpression($e[2], $rightMatches);

            // Defining needed information
            $value = $e[2];

            if (substr($value, 0, 1) == '(') {
                // trim brackets
                $trimmed   = $this->_tokenizer->bracketTrim($value);
                $trimmed_upper = strtoupper($trimmed);

                if (substr($trimmed_upper, 0, 4) == 'FROM' || substr($trimmed_upper, 0, 6) == 'SELECT') {
                    // subquery found
                    $q = $this->query->createSubquery()
                        ->parseDqlQuery($trimmed, false);
                    $value   = '(' . $q->getSqlQuery() . ')';
                    $q->free();
                } elseif (substr($trimmed_upper, 0, 4) == 'SQL:') {
                    // Change due to bug "(" XXX ")"
                    //$value = '(' . substr($trimmed, 4) . ')';
                    $value = substr($trimmed, 4);
                } else {
                    // simple in expression found
                    $e = $this->_tokenizer->sqlExplode($trimmed, ',');
                    $value = array();

                    foreach ($e as $part) {
                        $value[] = $this->parseLiteralValue($part);
                    }

                    $value = '(' . implode(', ', $value) . ')';
                }
            } elseif ( ! $hasRightAggExpression) {
                // Possible expression found (field1 AND field2)
                // In relation to ticket #1488
                $e     = $this->_tokenizer->bracketExplode($value, array(' AND ', ' \&\& '), '(', ')');
                $value = array();

                foreach ($e as $part) {
                    $value[] = $this->parseLiteralValue($part);
                }

                $value = implode(' AND ', $value);
            }

            if ($hasRightAggExpression) {
                $rightExpr = $rightMatches[1] . '(' . $value . ')' . $rightMatches[3];
                $rightExpr = $this->query->parseClause($rightExpr);
            } else {
                $rightExpr = $value;
            }

            $condition  = $leftExpr . ' ' . $operator . ' ' . $rightExpr;

            return $condition;
        }

        $parser = new Doctrine_Query_Where($this->query, $this->_tokenizer);

        return $parser->parse($condition);
    }


    protected function _processPossibleAggExpression(& $expr, & $matches = array())
    {
        $hasAggExpr = preg_match('/(.*[^\s\(\=])\(([^\)]*)\)(.*)/', $expr, $matches);

        if ($hasAggExpr) {
            $expr = $matches[2];

            // We need to process possible comma separated items
            if (substr(trim($matches[3]), 0, 1) == ',') {
                $xplod = $this->_tokenizer->sqlExplode(trim($matches[3], ' )'), ',');

                $matches[3] = array();

                foreach ($xplod as $part) {
                    if ($part != '') {
                        $matches[3][] = $this->parseLiteralValue($part);
                    }
                }

                $matches[3] = '), ' . implode(', ', $matches[3]);
            }
        }

        return $hasAggExpr;
    }
}
