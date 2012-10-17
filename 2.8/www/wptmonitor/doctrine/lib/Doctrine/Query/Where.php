<?php
/*
 *  $Id: Where.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Query_Where
 *
 * @package     Doctrine
 * @subpackage  Query
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Query_Where extends Doctrine_Query_Condition
{
    public function load($where)
    {
        // Handle operator ("AND" | "OR"), reducing overhead of this method processment
        $possibleOp = strtolower($where);

        if ($possibleOp == 'and' || $possibleOp == 'or')
        {
            return $where;
        }

        $where = $this->_tokenizer->bracketTrim(trim($where));
        $conn  = $this->query->getConnection();
        $terms = $this->_tokenizer->sqlExplode($where);  

        if (count($terms) > 1) {
            if (substr($where, 0, 6) == 'EXISTS') {
                return $this->parseExists($where, true);
            } elseif (substr($where, 0, 10) == 'NOT EXISTS') {
                return $this->parseExists($where, false);
            }
        }

        if (count($terms) < 3) {
            $terms = $this->_tokenizer->sqlExplode($where, array('=', '<', '<>', '>', '!='));
        }

        if (count($terms) > 1) {
            $leftExpr = array_shift($terms);
            $rightExpr = array_pop($terms);
            $operator = trim(substr($where, strlen($leftExpr), -strlen($rightExpr)));

            if (strpos($leftExpr, "'") === false && strpos($leftExpr, '(') === false) {
                // normal field reference found
                $a = explode('.', $leftExpr);
                array_pop($a); // Discard the field name (not needed!)
                $reference = implode('.', $a);

                if (empty($reference)) {
                    $map = $this->query->getRootDeclaration();
                    $alias = $this->query->getSqlTableAlias($this->query->getRootAlias());
                } else {
                    $map = $this->query->load($reference, false);
                    $alias = $this->query->getSqlTableAlias($reference);
                }
            }

            $sql = $this->_buildSql($leftExpr, $operator, $rightExpr);

            return $sql;
        } else {
            return $where;
        }
    }


    protected function _buildSql($leftExpr, $operator, $rightExpr)
    {
        $leftExprOriginal = $leftExpr;
        $leftExpr = $this->query->parseClause($leftExpr);

        // BETWEEN operation
        if ('BETWEEN' == strtoupper(substr($operator, 0, 7))) {
            $midExpr = trim(substr($operator, 7, -3));
            $operator = 'BETWEEN ' . $this->query->parseClause($midExpr) . ' AND';
        }

        // NOT BETWEEN operation
        if ('NOT BETWEEN' == strtoupper(substr($operator, 0, 11))) {
            $midExpr = trim(substr($operator, 11, -3));
            $operator = 'NOT BETWEEN ' . $this->query->parseClause($midExpr) . ' AND';
        }

        $op = strtolower($operator);
        $isInX = ($op == 'in' || $op == 'not in');

        // Check if we are not dealing with "obj.field IN :named"
        if (substr($rightExpr, 0 , 1) == ':' && $isInX) {
            throw new Doctrine_Query_Exception(
                'Cannot use ' . $operator . ' with a named parameter in "' .
                $leftExprOriginal . ' ' . $operator . ' ' . $rightExpr . '"'
            );
        }
        
        // Right Expression
        $rightExpr = ($rightExpr == '?' && $isInX)
            ? $this->_buildWhereInArraySqlPart($rightExpr)
            : $this->query->parseClause($rightExpr);

        return $leftExpr . ' ' . $operator . ' ' . $rightExpr;
    }


    protected function _buildWhereInArraySqlPart($rightExpr)
    {
        $params = $this->query->getInternalParams();
        $value = array();

        for ($i = 0, $l = count($params); $i < $l; $i++) {
            if (is_array($params[$i])) {
                $value = array_fill(0, count($params[$i]), $rightExpr);
                $this->query->adjustProcessedParam($i);

                break;
            }
        }

        return '(' . (count($value) > 0 ? implode(', ', $value) : $rightExpr) . ')';
    }

    /**
     * parses an EXISTS expression
     *
     * @param string $where         query where part to be parsed
     * @param boolean $negation     whether or not to use the NOT keyword
     * @return string
     */
    public function parseExists($where, $negation)
    {
        $operator = ($negation) ? 'EXISTS' : 'NOT EXISTS';

        $pos = strpos($where, '(');

        if ($pos == false) {
            throw new Doctrine_Query_Exception('Unknown expression, expected a subquery with () -marks');
        }

        $sub = $this->_tokenizer->bracketTrim(substr($where, $pos));

        $q = $this->query->createSubquery()->parseDqlQuery($sub, false);
        $sql = $q->getSqlQuery();
        $q->free();

        return $operator . ' (' . $sql . ')';
    }
}
