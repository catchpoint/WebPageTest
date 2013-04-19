<?php
/*
 *  $Id: RawSql.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_RawSql
 *
 * Doctrine_RawSql is an implementation of Doctrine_Query_Abstract that skips the entire
 * DQL parsing procedure. The "DQL" that is passed to a RawSql query object for execution
 * is considered to be plain SQL and will be used "as is". The only query part that is special
 * in a RawSql query is the SELECT part, which has a special syntax that provides Doctrine
 * with the necessary information to properly hydrate the query results.
 *
 * @package     Doctrine
 * @subpackage  RawSql
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_RawSql extends Doctrine_Query_Abstract
{
    /**
     * @var array $fields
     */
    private $fields = array();

    /**
     * Constructor.
     *
     * @param Doctrine_Connection  The connection object the query will use.
     * @param Doctrine_Hydrator_Abstract  The hydrator that will be used for generating result sets.
     */
    function __construct(Doctrine_Connection $connection = null, Doctrine_Hydrator_Abstract $hydrator = null) {
        parent::__construct($connection, $hydrator);

        // Fix #1472. It's alid to disable QueryCache since there's no DQL for RawSql.
        // RawSql expects to be plain SQL + syntax for SELECT part. It is used as is in query execution.
        $this->useQueryCache(false);
    }

    protected function clear()
    {
        $this->_preQuery = false;
        $this->_pendingJoinConditions = array();
    }

    /**
     * parseDqlQueryPart
     * parses given DQL query part. Overrides Doctrine_Query_Abstract::parseDqlQueryPart().
     * This implementation does no parsing at all, except of the SELECT portion of the query
     * which is special in RawSql queries. The entire remaining parts are used "as is", so
     * the user of the RawSql query is responsible for writing SQL that is portable between
     * different DBMS.
     *
     * @param string $queryPartName     the name of the query part
     * @param string $queryPart         query part to be parsed
     * @param boolean $append           whether or not to append the query part to its stack
     *                                  if false is given, this method will overwrite
     *                                  the given query part stack with $queryPart
     * @return Doctrine_Query           this object
     */
 	public function parseDqlQueryPart($queryPartName, $queryPart, $append = false)
    {
        if ($queryPartName == 'select') {
     	    $this->_parseSelectFields($queryPart);
     	    return $this;
     	}
     	if ( ! isset($this->_sqlParts[$queryPartName])) {
     	    $this->_sqlParts[$queryPartName] = array();
     	}
     	
     	if ( ! $append) {
     	    $this->_sqlParts[$queryPartName] = array($queryPart);
     	} else {
     	    $this->_sqlParts[$queryPartName][] = $queryPart;
     	}
     	return $this;
    }
    
    /**
     * Adds a DQL query part. Overrides Doctrine_Query_Abstract::_addDqlQueryPart().
     * This implementation for RawSql parses the new parts right away, generating the SQL.
     */
    protected function _addDqlQueryPart($queryPartName, $queryPart, $append = false)
    {
        return $this->parseDqlQueryPart($queryPartName, $queryPart, $append);
    }
    
    /**
     * Add select parts to fields.
     *
     * @param $queryPart sting The name of the querypart
     */
    private function _parseSelectFields($queryPart)
    {
        preg_match_all('/{([^}{]*)}/U', $queryPart, $m);
        $this->fields = $m[1];
        $this->_sqlParts['select'] = array();
    }
    
    /**
     * parseDqlQuery
     * parses an sql query and adds the parts to internal array.
     * Overrides Doctrine_Query_Abstract::parseDqlQuery().
     * This implementation simply tokenizes the provided query string and uses them
     * as SQL parts right away.
     *
     * @param string $query     query to be parsed
     * @return Doctrine_RawSql  this object
     */
    public function parseDqlQuery($query)
    {
        $this->_parseSelectFields($query);
        $this->clear();

        $tokens = $this->_tokenizer->sqlExplode($query, ' ');

        $parts = array();
        foreach ($tokens as $key => $part) {
            $partLowerCase = strtolower($part);
            switch ($partLowerCase) {
                case 'select':
                case 'from':
                case 'where':
                case 'limit':
                case 'offset':
                case 'having':
                    $type = $partLowerCase;
                    if ( ! isset($parts[$partLowerCase])) {
                        $parts[$partLowerCase] = array();
                    }
                    break;
                case 'order':
                case 'group':
                    $i = $key + 1;
                    if (isset($tokens[$i]) && strtolower($tokens[$i]) === 'by') {
                        $type = $partLowerCase . 'by';
                        $parts[$type] = array();
                    } else {
                        //not a keyword so we add it to the previous type
                        $parts[$type][] = $part;
                    }
                    break;
                case 'by':
                    continue;
                default:
                    //not a keyword so we add it to the previous type.
                    if ( ! isset($parts[$type][0])) {
                        $parts[$type][0] = $part;
                    } else {
                        // why does this add to index 0 and not append to the
                        // array. If it had done that one could have used 
                        // parseQueryPart.
                        $parts[$type][0] .= ' '.$part;
                    }
            }
        }

        $this->_sqlParts = $parts;
        $this->_sqlParts['select'] = array();

        return $this;
    }

    /**
     * getSqlQuery
     * builds the sql query.
     *
     * @return string       the built sql query
     */
    public function getSqlQuery($params = array())
    {        
        // Assign building/execution specific params
        $this->_params['exec'] = $params;

        // Initialize prepared parameters array
        $this->_execParams = $this->getFlattenedParams();

        // Initialize prepared parameters array
        $this->fixArrayParameterValues($this->_execParams);

        $select = array();
        
        $formatter = $this->getConnection()->formatter;

        foreach ($this->fields as $field) {
            $e = explode('.', $field);
            if ( ! isset($e[1])) {
                throw new Doctrine_RawSql_Exception('All selected fields in Sql query must be in format tableAlias.fieldName');
            }
            // try to auto-add component
            if ( ! $this->hasSqlTableAlias($e[0])) {
                try {
                    $this->addComponent($e[0], ucwords($e[0]));
                } catch (Doctrine_Exception $exception) {
                    throw new Doctrine_RawSql_Exception('The associated component for table alias ' . $e[0] . ' couldn\'t be found.');
                }
            }

            $componentAlias = $this->getComponentAlias($e[0]);
            
            if ($e[1] == '*') {
                foreach ($this->_queryComponents[$componentAlias]['table']->getColumnNames() as $name) {
                    $field = $formatter->quoteIdentifier($e[0]) . '.' . $formatter->quoteIdentifier($name);

                    $select[$componentAlias][$field] = $field . ' AS ' . $formatter->quoteIdentifier($e[0] . '__' . $name);
                }
            } else {
                $field = $formatter->quoteIdentifier($e[0]) . '.' . $formatter->quoteIdentifier($e[1]);
                $select[$componentAlias][$field] = $field . ' AS ' . $formatter->quoteIdentifier($e[0] . '__' . $e[1]);
            }
        }

        // force-add all primary key fields
        if ( ! isset($this->_sqlParts['distinct']) || $this->_sqlParts['distinct'] != true) {
            foreach ($this->getTableAliasMap() as $tableAlias => $componentAlias) {
                $map = $this->_queryComponents[$componentAlias];

                foreach ((array) $map['table']->getIdentifierColumnNames() as $key) {
                    $field = $formatter->quoteIdentifier($tableAlias) . '.' . $formatter->quoteIdentifier($key);

                    if ( ! isset($this->_sqlParts['select'][$field])) {
                        $select[$componentAlias][$field] = $field . ' AS ' . $formatter->quoteIdentifier($tableAlias . '__' . $key);
                    }
                }
            }
        }

        $q = 'SELECT ';

        if (isset($this->_sqlParts['distinct']) && $this->_sqlParts['distinct'] == true) {
            $q .= 'DISTINCT ';
        }

        // first add the fields of the root component
        reset($this->_queryComponents);
        $componentAlias = key($this->_queryComponents);
        
        $this->_rootAlias = $componentAlias;

        $q .= implode(', ', $select[$componentAlias]);
        unset($select[$componentAlias]);

        foreach ($select as $component => $fields) {
            if ( ! empty($fields)) {
                $q .= ', ' . implode(', ', $fields);
            }
        }

        $string = $this->getInheritanceCondition($this->getRootAlias());

        if ( ! empty($string)) {
            $this->_sqlParts['where'][] = $string;
        }

        $q .= ( ! empty($this->_sqlParts['from']))?    ' FROM '     . implode(' ', $this->_sqlParts['from']) : '';
        $q .= ( ! empty($this->_sqlParts['where']))?   ' WHERE '    . implode(' AND ', $this->_sqlParts['where']) : '';
        $q .= ( ! empty($this->_sqlParts['groupby']))? ' GROUP BY ' . implode(', ', $this->_sqlParts['groupby']) : '';
        $q .= ( ! empty($this->_sqlParts['having']))?  ' HAVING '   . implode(' AND ', $this->_sqlParts['having']) : '';
        $q .= ( ! empty($this->_sqlParts['orderby']))? ' ORDER BY ' . implode(', ', $this->_sqlParts['orderby']) : '';
        $q .= ( ! empty($this->_sqlParts['limit']))?   ' LIMIT ' . implode(' ', $this->_sqlParts['limit']) : '';
        $q .= ( ! empty($this->_sqlParts['offset']))?  ' OFFSET ' . implode(' ', $this->_sqlParts['offset']) : '';

        if ( ! empty($string)) {
            array_pop($this->_sqlParts['where']);
        }
        return $q;
    }

	/**
     * getCountQuery
     * builds the count query.
     *
     * @return string       the built sql query
     */
	public function getCountSqlQuery($params = array())
    {
        //Doing COUNT( DISTINCT rootComponent.id )
        //This is not correct, if the result is not hydrated by doctrine, but it mimics the behaviour of Doctrine_Query::getCountQuery
        reset($this->_queryComponents);
        $componentAlias = key($this->_queryComponents);

        $this->_rootAlias = $componentAlias;

        $tableAlias = $this->getSqlTableAlias($componentAlias);
        $fields = array();

        foreach ((array) $this->_queryComponents[$componentAlias]['table']->getIdentifierColumnNames() as $key) {
        	$fields[] = $tableAlias . '.' . $key;
        }

        $q = 'SELECT COUNT(*) as num_results FROM (SELECT DISTINCT '.implode(', ',$fields);

        $string = $this->getInheritanceCondition($this->getRootAlias());
        if ( ! empty($string)) {
            $this->_sqlParts['where'][] = $string;
        }

        $q .= ( ! empty($this->_sqlParts['from']))?    ' FROM '     . implode(' ', $this->_sqlParts['from']) : '';
        $q .= ( ! empty($this->_sqlParts['where']))?   ' WHERE '    . implode(' AND ', $this->_sqlParts['where']) : '';
        $q .= ( ! empty($this->_sqlParts['groupby']))? ' GROUP BY ' . implode(', ', $this->_sqlParts['groupby']) : '';
        $q .= ( ! empty($this->_sqlParts['having']))?  ' HAVING '   . implode(' AND ', $this->_sqlParts['having']) : '';

        $q .= ') as results';

        if ( ! empty($string)) {
            array_pop($this->_sqlParts['where']);
        }

        return $q;
    }

	/**
     * count
     * fetches the count of the query
     *
     * This method executes the main query without all the
     * selected fields, ORDER BY part, LIMIT part and OFFSET part.
     *
     * This is an exact copy of the Dql Version
     *
     * @see Doctrine_Query::count()
     * @param array $params        an array of prepared statement parameters
     * @return integer             the count of this query
     */
    public function count($params = array())
    {
        $sql = $this->getCountSqlQuery();
        $params = $this->getCountQueryParams($params);
        $results = $this->getConnection()->fetchAll($sql, $params);

        if (count($results) > 1) {
            $count = count($results);
        } else {
            if (isset($results[0])) {
                $results[0] = array_change_key_case($results[0], CASE_LOWER);
                $count = $results[0]['num_results'];
            } else {
                $count = 0;
            }
        }

        return (int) $count;
    }

    /**
     * getFields
     * returns the fields associated with this parser
     *
     * @return array    all the fields associated with this parser
     */
    public function getFields()
    {
        return $this->fields;
    }

    /**
     * addComponent
     *
     * @param string $tableAlias
     * @param string $componentName
     * @return Doctrine_RawSql
     */
    public function addComponent($tableAlias, $path)
    {
        $tmp           = explode(' ', $path);
        $originalAlias = (count($tmp) > 1) ? end($tmp) : null;

        $e = explode('.', $tmp[0]);

        $fullPath = $tmp[0];
        $fullLength = strlen($fullPath);

        $table = null;

        $currPath = '';

        if (isset($this->_queryComponents[$e[0]])) {
            $table = $this->_queryComponents[$e[0]]['table'];

            $currPath = $parent = array_shift($e);
        }

        foreach ($e as $k => $component) {
            // get length of the previous path
            $length = strlen($currPath);

            // build the current component path
            $currPath = ($currPath) ? $currPath . '.' . $component : $component;

            $delimeter = substr($fullPath, $length, 1);

            // if an alias is not given use the current path as an alias identifier
            if (strlen($currPath) === $fullLength && isset($originalAlias)) {
                $componentAlias = $originalAlias;
            } else {
                $componentAlias = $currPath;
            }
            if ( ! isset($table)) {
                $conn = Doctrine_Manager::getInstance()
                        ->getConnectionForComponent($component);
                        
                $table = $conn->getTable($component);
                $this->_queryComponents[$componentAlias] = array('table' => $table);
            } else {
                $relation = $table->getRelation($component);

                $this->_queryComponents[$componentAlias] = array('table'    => $relation->getTable(),
                                                          'parent'   => $parent,
                                                          'relation' => $relation);
            }
            $this->addSqlTableAlias($tableAlias, $componentAlias);

            $parent = $currPath;
        }

        return $this;
    }

    /**
     * calculateResultCacheHash
     * calculate hash key for result cache
     *
     * @param array $params
     * @return string    the hash
     */
    public function calculateResultCacheHash($params = array())
    {
        $sql = $this->getSqlQuery();
        $conn = $this->getConnection();
        $params = $this->getFlattenedParams($params);
        $hash = md5($this->_hydrator->getHydrationMode() . $conn->getName() . $conn->getOption('dsn') . $sql . var_export($params, true));
        return $hash;
    }
}
