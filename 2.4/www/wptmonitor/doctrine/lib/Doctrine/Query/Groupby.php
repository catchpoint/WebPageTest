<?php
/*
 *  $Id: Groupby.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Query_Groupby
 *
 * @package     Doctrine
 * @subpackage  Query
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Query_Groupby extends Doctrine_Query_Part
{
    /**
     * DQL GROUP BY PARSER
     * parses the group by part of the query string
     *
     * @param string $str
     * @return void
     */
    public function parse($clause, $append = false)
    {
        $terms = $this->_tokenizer->clauseExplode($clause, array(' ', '+', '-', '*', '/', '<', '>', '=', '>=', '<='));
        $str = '';

        foreach ($terms as $term) {
            $pos = strpos($term[0], '(');
            $hasComma = false;

            if ($pos !== false) {
                $name = substr($term[0], 0, $pos);

                $term[0] = $this->query->parseFunctionExpression($term[0]);
            } else {
                if (substr($term[0], 0, 1) !== "'" && substr($term[0], -1) !== "'") {

                    if (strpos($term[0], '.') !== false) {
                        if ( ! is_numeric($term[0])) {
                            $e = explode('.', $term[0]);

                            $field = array_pop($e);
                            
                            // Check if field name still has comma
                            if (($pos = strpos($field, ',')) !== false) {
                                $field = substr($field, 0, $pos);
                                $hasComma = true;
                            }

                            // Grab query connection
                            $conn = $this->query->getConnection();

                            if ($this->query->getType() === Doctrine_Query::SELECT) {
                                $componentAlias = implode('.', $e);

                                if (empty($componentAlias)) {
                                    $componentAlias = $this->query->getRootAlias();
                                }

                                $this->query->load($componentAlias);

                                // check the existence of the component alias
                                $queryComponent = $this->query->getQueryComponent($componentAlias);

                                $table = $queryComponent['table'];

                                $def = $table->getDefinitionOf($field);

                                // get the actual field name from alias
                                $field = $table->getColumnName($field);

                                // check column existence
                                if ( ! $def) {
                                    throw new Doctrine_Query_Exception('Unknown column ' . $field);
                                }

                                if (isset($def['owner'])) {
                                    $componentAlias = $componentAlias . '.' . $def['owner'];
                                }

                                $tableAlias = $this->query->getSqlTableAlias($componentAlias);

                                // build sql expression
                                $term[0] = $conn->quoteIdentifier($tableAlias) . '.' . $conn->quoteIdentifier($field);
                            } else {
                                // build sql expression
                                $field = $this->query->getRoot()->getColumnName($field);
                                $term[0] = $conn->quoteIdentifier($field);
                            }
                        }
                    } else {
                        if ( ! empty($term[0]) &&
                             ! is_numeric($term[0]) &&
                            $term[0] !== '?' && substr($term[0], 0, 1) !== ':') {

                            $componentAlias = $this->query->getRootAlias();

                            $found = false;
                            
                            // Check if field name still has comma
                            if (($pos = strpos($term[0], ',')) !== false) {
                                $term[0] = substr($term[0], 0, $pos);
                                $hasComma = true;
                            }

                            if ($componentAlias !== false &&
                                $componentAlias !== null) {
                                $queryComponent = $this->query->getQueryComponent($componentAlias);

                                $table = $queryComponent['table'];

                                // check column existence
                                if ($table->hasField($term[0])) {
                                    $found = true;

                                    $def = $table->getDefinitionOf($term[0]);

                                    // get the actual column name from field name
                                    $term[0] = $table->getColumnName($term[0]);


                                    if (isset($def['owner'])) {
                                        $componentAlias = $componentAlias . '.' . $def['owner'];
                                    }

                                    $tableAlias = $this->query->getSqlTableAlias($componentAlias);
                                    $conn = $this->query->getConnection();

                                    if ($this->query->getType() === Doctrine_Query::SELECT) {
                                        // build sql expression
                                        $term[0] = $conn->quoteIdentifier($tableAlias)
                                                 . '.' . $conn->quoteIdentifier($term[0]);
                                    } else {
                                        // build sql expression
                                        $term[0] = $conn->quoteIdentifier($term[0]);
                                    }
                                } else {
                                    $found = false;
                                }
                            }

                            if ( ! $found) {
                                $term[0] = $this->query->getSqlAggregateAlias($term[0]);
                            }
                        }
                    }
                }
            }

            $str .= $term[0] . ($hasComma ? ',' : '') . $term[1];
        }

        return $str;
    }
}
