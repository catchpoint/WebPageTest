<?php
/*
 *  $Id: Query.php 1393 2007-05-19 17:49:16Z zYne $
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
 * Doctrine_Query_Abstract
 *
 * @package     Doctrine
 * @subpackage  Query
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 1393 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @todo        See {@link Doctrine_Query}
 */
abstract class Doctrine_Query_Abstract
{
    /**
     * QUERY TYPE CONSTANTS
     */

    /**
     * constant for SELECT queries
     */
    const SELECT = 0;

    /**
     * constant for DELETE queries
     */
    const DELETE = 1;

    /**
     * constant for UPDATE queries
     */
    const UPDATE = 2;

    /**
     * constant for INSERT queries
     */
    const INSERT = 3;

    /**
     * constant for CREATE queries
     */
    const CREATE = 4;

    /** @todo document the query states (and the transitions between them). */
    /**
     * A query object is in CLEAN state when it has NO unparsed/unprocessed DQL parts.
     */
    const STATE_CLEAN  = 1;

    /**
     * A query object is in state DIRTY when it has DQL parts that have not yet been
     * parsed/processed.
     */
    const STATE_DIRTY  = 2;

    /**
     * A query is in DIRECT state when ... ?
     */
    const STATE_DIRECT = 3;

    /**
     * A query object is on LOCKED state when ... ?
     */
    const STATE_LOCKED = 4;

    /**
     * @var array  Table alias map. Keys are SQL aliases and values DQL aliases.
     */
    protected $_tableAliasMap = array();

    /**
     * @var Doctrine_View  The view object used by this query, if any.
     */
    protected $_view;

    /**
     * @var integer $_state   The current state of this query.
     */
    protected $_state = Doctrine_Query::STATE_CLEAN;

    /**
     * @var array $_params  The parameters of this query.
     */
    protected $_params = array('exec' => array(),
                               'join' => array(),
                               'where' => array(),
                               'set' => array(),
                               'having' => array());

    /**
     * @var array $_execParams The parameters passed to connection statement
     */
    protected $_execParams = array();

    /* Caching properties */
    /**
     * @var Doctrine_Cache_Interface  The cache driver used for caching result sets.
     */
    protected $_resultCache;

    /**
     * @var string  Key to use for result cache entry in the cache driver
     */
    protected $_resultCacheHash;

    /**
     * @var boolean $_expireResultCache  A boolean value that indicates whether or not
     *                                   expire the result cache.
     */
    protected $_expireResultCache = false;
    protected $_resultCacheTTL;

    /**
     * @var Doctrine_Cache_Interface  The cache driver used for caching queries.
     */
    protected $_queryCache;
    protected $_expireQueryCache = false;
    protected $_queryCacheTTL;


    /**
     * @var Doctrine_Connection  The connection used by this query object.
     */
    protected $_conn;

    /**
     * @var bool Whether or not a connection was passed to this query object to use
     */
    protected $_passedConn = false;

    /**
     * @var array $_sqlParts  The SQL query string parts. Filled during the DQL parsing process.
     */
    protected $_sqlParts = array(
            'select'    => array(),
            'distinct'  => false,
            'forUpdate' => false,
            'from'      => array(),
            'set'       => array(),
            'join'      => array(),
            'where'     => array(),
            'groupby'   => array(),
            'having'    => array(),
            'orderby'   => array(),
            'limit'     => false,
            'offset'    => false,
            );

    /**
     * @var array $_dqlParts    an array containing all DQL query parts; @see Doctrine_Query::getDqlPart()
     */
    protected $_dqlParts = array(
                            'from'      => array(),
                            'select'    => array(),
                            'forUpdate' => false,
                            'set'       => array(),
                            'join'      => array(),
                            'where'     => array(),
                            'groupby'   => array(),
                            'having'    => array(),
                            'orderby'   => array(),
                            'limit'     => array(),
                            'offset'    => array(),
                            );


    /**
     * @var array $_queryComponents   Two dimensional array containing the components of this query,
     *                                informations about their relations and other related information.
     *                                The components are constructed during query parsing.
     *
     *      Keys are component aliases and values the following:
     *
     *          table               table object associated with given alias
     *
     *          relation            the relation object owned by the parent
     *
     *          parent              the alias of the parent
     *
     *          agg                 the aggregates of this component
     *
     *          map                 the name of the column / aggregate value this
     *                              component is mapped to a collection
     */
    protected $_queryComponents = array();

	/**
     * Stores the root DQL alias
     *
     * @var string
     */
    protected $_rootAlias = '';
	
    /**
     * @var integer $type                   the query type
     *
     * @see Doctrine_Query::* constants
     */
    protected $_type = self::SELECT;

    /**
     * @var Doctrine_Hydrator   The hydrator object used to hydrate query results.
     */
    protected $_hydrator;

    /**
     * @var Doctrine_Query_Tokenizer  The tokenizer that is used during the query parsing process.
     */
    protected $_tokenizer;

    /**
     * @var Doctrine_Query_Parser  The parser that is used for query parsing.
     */
    protected $_parser;

    /**
     * @var array $_tableAliasSeeds         A simple array keys representing table aliases and values
     *                                      table alias seeds. The seeds are used for generating short table
     *                                      aliases.
     */
    protected $_tableAliasSeeds = array();

    /**
     * @var array $_options                 an array of options
     */
    protected $_options    = array(
        'hydrationMode'      => Doctrine_Core::HYDRATE_RECORD
    );

    /**
     * @var boolean
     */
    protected $_isLimitSubqueryUsed = false;

    /**
     * @var array components used in the DQL statement
     */
    protected $_components;

    /**
     * @var bool Boolean variable for whether or not the preQuery process has been executed
     */
    protected $_preQueried = false;

    /**
     * Constructor.
     *
     * @param Doctrine_Connection  The connection object the query will use.
     * @param Doctrine_Hydrator_Abstract  The hydrator that will be used for generating result sets.
     */
    public function __construct(Doctrine_Connection $connection = null,
            Doctrine_Hydrator_Abstract $hydrator = null)
    {
        if ($connection === null) {
            $connection = Doctrine_Manager::getInstance()->getCurrentConnection();
        } else {
            $this->_passedConn = true;
        }
        if ($hydrator === null) {
            $hydrator = new Doctrine_Hydrator();
        }
        $this->_conn = $connection;
        $this->_hydrator = $hydrator;
        $this->_tokenizer = new Doctrine_Query_Tokenizer();
        $this->_resultCacheTTL = $this->_conn->getAttribute(Doctrine_Core::ATTR_RESULT_CACHE_LIFESPAN);
        $this->_queryCacheTTL = $this->_conn->getAttribute(Doctrine_Core::ATTR_QUERY_CACHE_LIFESPAN);
    }

    /**
     * Set the connection this query object should use
     *
     * @param Doctrine_Connection $connection
     * @return void
     */
    public function setConnection(Doctrine_Connection $connection)
    {
        $this->_passedConn = true;
        $this->_conn = $connection;
    }

    /**
     * setOption
     *
     * @param string $name      option name
     * @param string $value     option value
     * @return Doctrine_Query   this object
     */
    public function setOption($name, $value)
    {
        if ( ! isset($this->_options[$name])) {
            throw new Doctrine_Query_Exception('Unknown option ' . $name);
        }
        $this->_options[$name] = $value;
    }

    /**
     * hasSqlTableAlias
     * whether or not this object has given tableAlias
     *
     * @param string $tableAlias    the table alias to be checked
     * @return boolean              true if this object has given alias, otherwise false
     */
    public function hasSqlTableAlias($sqlTableAlias)
    {
        return (isset($this->_tableAliasMap[$sqlTableAlias]));
    }

    /**
     * getTableAliasMap
     * returns all table aliases
     *
     * @return array        table aliases as an array
     */
    public function getTableAliasMap()
    {
        return $this->_tableAliasMap;
    }

    /**
     * getDql
     * returns the DQL query that is represented by this query object.
     *
     * the query is built from $_dqlParts
     *
     * @return string   the DQL query
     */
    public function getDql()
    {
        $q = '';
        if ($this->_type == self::SELECT) {
            $q .= ( ! empty($this->_dqlParts['select'])) ? 'SELECT ' . implode(', ', $this->_dqlParts['select']) : '';
            $q .= ( ! empty($this->_dqlParts['from'])) ? ' FROM ' . implode(' ', $this->_dqlParts['from']) : '';
        } else if ($this->_type == self::DELETE) {
            $q .= 'DELETE';
            $q .= ( ! empty($this->_dqlParts['from'])) ? ' FROM ' . implode(' ', $this->_dqlParts['from']) : '';
        } else if ($this->_type == self::UPDATE) {
            $q .= 'UPDATE ';
            $q .= ( ! empty($this->_dqlParts['from'])) ? implode(' ', $this->_dqlParts['from']) : '';
            $q .= ( ! empty($this->_dqlParts['set'])) ? ' SET ' . implode(' ', $this->_dqlParts['set']) : '';
        }
        $q .= ( ! empty($this->_dqlParts['where'])) ? ' WHERE ' . implode(' ', $this->_dqlParts['where']) : '';
        $q .= ( ! empty($this->_dqlParts['groupby'])) ? ' GROUP BY ' . implode(', ', $this->_dqlParts['groupby']) : '';
        $q .= ( ! empty($this->_dqlParts['having'])) ? ' HAVING ' . implode(' AND ', $this->_dqlParts['having']) : '';
        $q .= ( ! empty($this->_dqlParts['orderby'])) ? ' ORDER BY ' . implode(', ', $this->_dqlParts['orderby']) : '';
        $q .= ( ! empty($this->_dqlParts['limit'])) ? ' LIMIT ' . implode(' ', $this->_dqlParts['limit']) : '';
        $q .= ( ! empty($this->_dqlParts['offset'])) ? ' OFFSET ' . implode(' ', $this->_dqlParts['offset']) : '';

        return $q;
    }

    /**
     * getSqlQueryPart
     * gets an SQL query part from the SQL query part array
     *
     * @param string $name          the name of the query part to be set
     * @param string $part          query part string
     * @throws Doctrine_Query_Exception   if trying to set unknown query part
     * @return mixed     this object
     */
    public function getSqlQueryPart($part)
    {
        if ( ! isset($this->_sqlParts[$part])) {
            throw new Doctrine_Query_Exception('Unknown SQL query part ' . $part);
        }
        return $this->_sqlParts[$part];
    }

    /**
     * setSqlQueryPart
     * sets an SQL query part in the SQL query part array
     *
     * @param string $name          the name of the query part to be set
     * @param string $part          query part string
     * @throws Doctrine_Query_Exception   if trying to set unknown query part
     * @return Doctrine_Query     this object
     */
    public function setSqlQueryPart($name, $part)
    {
        if ( ! isset($this->_sqlParts[$name])) {
            throw new Doctrine_Query_Exception('Unknown query part ' . $name);
        }

        if ($name !== 'limit' && $name !== 'offset') {
            if (is_array($part)) {
                $this->_sqlParts[$name] = $part;
            } else {
                $this->_sqlParts[$name] = array($part);
            }
        } else {
            $this->_sqlParts[$name] = $part;
        }

        return $this;
    }

    /**
     * addSqlQueryPart
     * adds an SQL query part to the SQL query part array
     *
     * @param string $name          the name of the query part to be added
     * @param string $part          query part string
     * @throws Doctrine_Query_Exception   if trying to add unknown query part
     * @return Doctrine_Query     this object
     */
    public function addSqlQueryPart($name, $part)
    {
        if ( ! isset($this->_sqlParts[$name])) {
            throw new Doctrine_Query_Exception('Unknown query part ' . $name);
        }
        if (is_array($part)) {
            $this->_sqlParts[$name] = array_merge($this->_sqlParts[$name], $part);
        } else {
            $this->_sqlParts[$name][] = $part;
        }
        return $this;
    }

    /**
     * removeSqlQueryPart
     * removes a query part from the query part array
     *
     * @param string $name          the name of the query part to be removed
     * @throws Doctrine_Query_Exception   if trying to remove unknown query part
     * @return Doctrine_Query     this object
     */
    public function removeSqlQueryPart($name)
    {
        if ( ! isset($this->_sqlParts[$name])) {
            throw new Doctrine_Query_Exception('Unknown query part ' . $name);
        }

        if ($name == 'limit' || $name == 'offset' || $name == 'forUpdate') {
            $this->_sqlParts[$name] = false;
        } else {
            $this->_sqlParts[$name] = array();
        }

        return $this;
    }

    /**
     * removeDqlQueryPart
     * removes a dql query part from the dql query part array
     *
     * @param string $name          the name of the query part to be removed
     * @throws Doctrine_Query_Exception   if trying to remove unknown query part
     * @return Doctrine_Query     this object
     */
    public function removeDqlQueryPart($name)
    {
        if ( ! isset($this->_dqlParts[$name])) {
            throw new Doctrine_Query_Exception('Unknown query part ' . $name);
        }

        if ($name == 'limit' || $name == 'offset') {
            $this->_dqlParts[$name] = false;
        } else {
            $this->_dqlParts[$name] = array();
        }

        return $this;
    }

    /**
     * Get raw array of parameters for query and all parts.
     *
     * @return array $params
     */
    public function getParams()
    {
        return $this->_params;
    }

    /**
     * Get flattened array of parameters for query.
     * Used internally and used to pass flat array of params to the database.
     *
     * @param array $params
     * @return void
     */
    public function getFlattenedParams($params = array())
    {
        return array_merge(
            (array) $params, (array) $this->_params['exec'], 
            $this->_params['join'], $this->_params['set'],
            $this->_params['where'], $this->_params['having']
        );
    }

    /**
     * getInternalParams
     *
     * @return array
     */
    public function getInternalParams($params = array())
    {
        return array_merge($params, $this->_execParams);
    }

    /**
     * setParams
     *
     * @param array $params
     */
    public function setParams(array $params = array())
    {
        $this->_params = $params;
    }
    
    /**
     * getCountQueryParams
     * Retrieves the parameters for count query
     *
     * @return array Parameters array
     */
    public function getCountQueryParams($params = array())
    {
        if ( ! is_array($params)) {
            $params = array($params);
        }

        $this->_params['exec'] = $params;

        $params = array_merge($this->_params['join'], $this->_params['where'], $this->_params['having'], $this->_params['exec']);

        $this->fixArrayParameterValues($params);

        return $this->_execParams;
    }

    /**
     * @nodoc
     */
    public function fixArrayParameterValues($params = array())
    {
        $i = 0;
	
        foreach ($params as $param) {
            if (is_array($param)) {
                $c = count($param);

                array_splice($params, $i, 1, $param);
                
                $i += $c;
            } else {
                $i++;
            }
        }
        
        $this->_execParams = $params;
    }

    /**
     * setView
     * sets a database view this query object uses
     * this method should only be called internally by doctrine
     *
     * @param Doctrine_View $view       database view
     * @return void
     */
    public function setView(Doctrine_View $view)
    {
        $this->_view = $view;
    }

    /**
     * getView
     * returns the view associated with this query object (if any)
     *
     * @return Doctrine_View        the view associated with this query object
     */
    public function getView()
    {
        return $this->_view;
    }

    /**
     * limitSubqueryUsed
     *
     * @return boolean
     */
    public function isLimitSubqueryUsed()
    {
        return $this->_isLimitSubqueryUsed;
    }

    /**
     * Returns the inheritance condition for the passed componentAlias
     * If no component alias is specified it defaults to the root component
     *
     * This function is used to append a SQL condition to models which have inheritance mapping
     * The condition is applied to the FROM component in the WHERE, but the condition is applied to
     * JOINS in the ON condition and not the WHERE
     *
     * @return string $str  SQL condition string
     */
    public function getInheritanceCondition($componentAlias)
    {
        $map = $this->_queryComponents[$componentAlias]['table']->inheritanceMap;

        // No inheritance map so lets just return
        if (empty($map)) {
          return;
        }

        $tableAlias = $this->getSqlTableAlias($componentAlias);

        if ($this->_type !== Doctrine_Query::SELECT) {
            $tableAlias = '';
        } else {
            $tableAlias .= '.';
        }

        // Fix for 2015: loop through whole inheritanceMap to add all   
        // keyFields for inheritance (and not only the first) 
        $retVal = ""; 
        $count = 0; 
         
        foreach ($map as $field => $value) { 
            if ($count++ > 0) {
                $retVal .= ' AND ';
            }

            $identifier = $this->_conn->quoteIdentifier($tableAlias . $field); 
            $retVal .= $identifier . ' = ' . $this->_conn->quote($value);
        }

        return $retVal;
    }

    /**
     * getSqlTableAlias
     * some database such as Oracle need the identifier lengths to be < ~30 chars
     * hence Doctrine creates as short identifier aliases as possible
     *
     * this method is used for the creation of short table aliases, its also
     * smart enough to check if an alias already exists for given component (componentAlias)
     *
     * @param string $componentAlias    the alias for the query component to search table alias for
     * @param string $tableName         the table name from which the table alias is being created
     * @return string                   the generated / fetched short alias
     */
    public function getSqlTableAlias($componentAlias, $tableName = null)
    {
        $alias = array_search($componentAlias, $this->_tableAliasMap);

        if ($alias !== false) {
            return $alias;
        }

        if ($tableName === null) {
            throw new Doctrine_Query_Exception("Couldn't get short alias for " . $componentAlias);
        }

        return $this->generateSqlTableAlias($componentAlias, $tableName);
    }

    /**
     * generateNewSqlTableAlias
     * generates a new alias from given table alias
     *
     * @param string $tableAlias    table alias from which to generate the new alias from
     * @return string               the created table alias
     */
    public function generateNewSqlTableAlias($oldAlias)
    {
        if (isset($this->_tableAliasMap[$oldAlias])) {
            // generate a new alias
            $name = substr($oldAlias, 0, 1);
            $i    = ((int) substr($oldAlias, 1));

            // Fix #1530: It was reaching unexistent seeds index
            if ( ! isset($this->_tableAliasSeeds[$name])) {
                $this->_tableAliasSeeds[$name] = 1;
            }

            $newIndex  = ($this->_tableAliasSeeds[$name] + (($i == 0) ? 1 : $i));

            return $name . $newIndex;
        }

        return $oldAlias;
    }

    /**
     * getSqlTableAliasSeed
     * returns the alias seed for given table alias
     *
     * @param string $tableAlias    table alias that identifies the alias seed
     * @return integer              table alias seed
     */
    public function getSqlTableAliasSeed($sqlTableAlias)
    {
        if ( ! isset($this->_tableAliasSeeds[$sqlTableAlias])) {
            return 0;
        }
        return $this->_tableAliasSeeds[$sqlTableAlias];
    }

    /**
     * hasAliasDeclaration
     * whether or not this object has a declaration for given component alias
     *
     * @param string $componentAlias    the component alias the retrieve the declaration from
     * @return boolean
     */
    public function hasAliasDeclaration($componentAlias)
    {
        return isset($this->_queryComponents[$componentAlias]);
    }

    /**
     * getQueryComponent
     * get the declaration for given component alias
     *
     * @param string $componentAlias    the component alias the retrieve the declaration from
     * @return array                    the alias declaration
     */
    public function getQueryComponent($componentAlias)
    {
        if ( ! isset($this->_queryComponents[$componentAlias])) {
            throw new Doctrine_Query_Exception('Unknown component alias ' . $componentAlias);
        }

        return $this->_queryComponents[$componentAlias];
    }

    /**
     * copySubqueryInfo
     * copy aliases from another Hydrate object
     *
     * this method is needed by DQL subqueries which need the aliases
     * of the parent query
     *
     * @param Doctrine_Hydrate $query   the query object from which the
     *                                  aliases are copied from
     * @return Doctrine_Query         this object
     */
    public function copySubqueryInfo(Doctrine_Query_Abstract $query)
    {
        $this->_params =& $query->_params;
        $this->_tableAliasMap =& $query->_tableAliasMap;
        $this->_queryComponents =& $query->_queryComponents;
        $this->_tableAliasSeeds = $query->_tableAliasSeeds;
        return $this;
    }

    /**
     * getRootAlias
     * returns the alias of the root component
     *
     * @return array
     */
    public function getRootAlias()
    {
        if ( ! $this->_queryComponents) {
            $this->getSqlQuery(array(), false);
        }
        
        return $this->_rootAlias;
    }

    /**
     * getRootDeclaration
     * returns the root declaration
     *
     * @return array
     */
    public function getRootDeclaration()
    {
        $map = $this->_queryComponents[$this->_rootAlias];
        return $map;
    }

    /**
     * getRoot
     * returns the root component for this object
     *
     * @return Doctrine_Table       root components table
     */
    public function getRoot()
    {
        $map = $this->_queryComponents[$this->_rootAlias];

        if ( ! isset($map['table'])) {
            throw new Doctrine_Query_Exception('Root component not initialized.');
        }

        return $map['table'];
    }

    /**
     * generateSqlTableAlias
     * generates a table alias from given table name and associates
     * it with given component alias
     *
     * @param string $componentAlias    the component alias to be associated with generated table alias
     * @param string $tableName         the table name from which to generate the table alias
     * @return string                   the generated table alias
     */
    public function generateSqlTableAlias($componentAlias, $tableName)
    {
        preg_match('/([^_|\d])/', $tableName, $matches);
        $char = strtolower($matches[0]);

        $alias = $char;

        if ( ! isset($this->_tableAliasSeeds[$alias])) {
            $this->_tableAliasSeeds[$alias] = 1;
        }

        while (isset($this->_tableAliasMap[$alias])) {
            if ( ! isset($this->_tableAliasSeeds[$alias])) {
                $this->_tableAliasSeeds[$alias] = 1;
            }
            $alias = $char . ++$this->_tableAliasSeeds[$alias];
        }

        $this->_tableAliasMap[$alias] = $componentAlias;

        return $alias;
    }

    /**
     * getComponentAlias
     * get component alias associated with given table alias
     *
     * @param string $sqlTableAlias    the SQL table alias that identifies the component alias
     * @return string               component alias
     */
    public function getComponentAlias($sqlTableAlias)
    {
        $sqlTableAlias = trim($sqlTableAlias, '[]`"');
        if ( ! isset($this->_tableAliasMap[$sqlTableAlias])) {
            throw new Doctrine_Query_Exception('Unknown table alias ' . $sqlTableAlias);
        }
        return $this->_tableAliasMap[$sqlTableAlias];
    }

    /**
     * calculateQueryCacheHash
     * calculate hash key for query cache
     *
     * @return string    the hash
     */
    public function calculateQueryCacheHash()
    {
        $dql = $this->getDql();
        $hash = md5($dql . var_export($this->_pendingJoinConditions, true) . 'DOCTRINE_QUERY_CACHE_SALT');
        return $hash;
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
        $dql = $this->getDql();
        $conn = $this->getConnection();
        $params = $this->getFlattenedParams($params);
        $hash = md5($this->_hydrator->getHydrationMode() . $conn->getName() . $conn->getOption('dsn') . $dql . var_export($this->_pendingJoinConditions, true) . var_export($params, true));
        return $hash;
    }

    /**
     * Get the result cache hash/key. Returns key set with useResultCache()
     * or generates a unique key from the query automatically.
     *
     * @param array $params
     * @return string $hash
     */
    public function getResultCacheHash($params = array())
    {
      if ($this->_resultCacheHash) {
          return $this->_resultCacheHash;
      } else {
          return $this->calculateResultCacheHash($params);
      }
    }

    /**
     * _execute
     *
     * @param array $params
     * @return PDOStatement  The executed PDOStatement.
     */
    protected function _execute($params)
    {
        // Apply boolean conversion in DQL params
        $params = $this->_conn->convertBooleans($params);

        foreach ($this->_params as $k => $v) {
            $this->_params[$k] = $this->_conn->convertBooleans($v);
        }

        $dqlParams = $this->getFlattenedParams($params);

        // Check if we're not using a Doctrine_View
        if ( ! $this->_view) {
            if ($this->_queryCache !== false && ($this->_queryCache || $this->_conn->getAttribute(Doctrine_Core::ATTR_QUERY_CACHE))) {
                $queryCacheDriver = $this->getQueryCacheDriver();
                $hash = $this->calculateQueryCacheHash();
                $cached = $queryCacheDriver->fetch($hash);

                // If we have a cached query...
                if ($cached) {
                    // Rebuild query from cache
                    $query = $this->_constructQueryFromCache($cached);
                    
                    // Assign building/execution specific params
                    $this->_params['exec'] = $params;
            
                    // Initialize prepared parameters array
                    $this->_execParams = $this->getFlattenedParams();
                    
                    // Fix possible array parameter values in SQL params
                    $this->fixArrayParameterValues($this->getInternalParams());
                } else {
                    // Generate SQL or pick already processed one
                    $query = $this->getSqlQuery($params);

                    // Check again because getSqlQuery() above could have flipped the _queryCache flag
                    // if this query contains the limit sub query algorithm we don't need to cache it
                    if ($this->_queryCache !== false && ($this->_queryCache || $this->_conn->getAttribute(Doctrine_Core::ATTR_QUERY_CACHE))) {
                        // Convert query into a serialized form
                        $serializedQuery = $this->getCachedForm($query);

                        // Save cached query
                        $queryCacheDriver->save($hash, $serializedQuery, $this->getQueryCacheLifeSpan());
                    }
                }
            } else {
                $query = $this->getSqlQuery($params);
            }
        } else {
            $query = $this->_view->getSelectSql();
        }
        
        // Get prepared SQL params for execution
        $params = $this->getInternalParams();

        if ($this->isLimitSubqueryUsed() &&
                $this->_conn->getAttribute(Doctrine_Core::ATTR_DRIVER_NAME) !== 'mysql') {
            $params = array_merge((array) $params, (array) $params);
        }

        if ($this->_type !== self::SELECT) {
            return $this->_conn->exec($query, $params);
        }

        $stmt = $this->_conn->execute($query, $params);

        $this->_params['exec'] = array();

        return $stmt;
    }

    /**
     * execute
     * executes the query and populates the data set
     *
     * @param array $params
     * @return Doctrine_Collection            the root collection
     */
    public function execute($params = array(), $hydrationMode = null)
    {
        // Clean any possible processed params
        $this->_execParams = array();

        if (empty($this->_dqlParts['from']) && empty($this->_sqlParts['from'])) {
            throw new Doctrine_Query_Exception('You must have at least one component specified in your from.');
        }

        $dqlParams = $this->getFlattenedParams($params);

        $this->_preQuery($dqlParams);

        if ($hydrationMode !== null) {
            $this->_hydrator->setHydrationMode($hydrationMode);
        }

        $hydrationMode = $this->_hydrator->getHydrationMode();

        if ($this->_resultCache && $this->_type == self::SELECT) {
            $cacheDriver = $this->getResultCacheDriver();
            $hash = $this->getResultCacheHash($params);
            $cached = ($this->_expireResultCache) ? false : $cacheDriver->fetch($hash);

            if ($cached === false) {
                // cache miss
                $stmt = $this->_execute($params);
                $this->_hydrator->setQueryComponents($this->_queryComponents);
                $result = $this->_hydrator->hydrateResultSet($stmt, $this->_tableAliasMap);

                $cached = $this->getCachedForm($result);
                $cacheDriver->save($hash, $cached, $this->getResultCacheLifeSpan());
            } else {
                $result = $this->_constructQueryFromCache($cached);
            }
        } else {
            $stmt = $this->_execute($params);

            if (is_integer($stmt)) {
                $result = $stmt;
            } else {
                $this->_hydrator->setQueryComponents($this->_queryComponents);
                if ($this->_type == self::SELECT && $hydrationMode == Doctrine_Core::HYDRATE_ON_DEMAND) {
                    $hydrationDriver = $this->_hydrator->getHydratorDriver($hydrationMode, $this->_tableAliasMap);
                    $result = new Doctrine_Collection_OnDemand($stmt, $hydrationDriver, $this->_tableAliasMap); 
                } else {
                    $result = $this->_hydrator->hydrateResultSet($stmt, $this->_tableAliasMap);
                }
            }
        }
        if ($this->getConnection()->getAttribute(Doctrine_Core::ATTR_AUTO_FREE_QUERY_OBJECTS)) {
            $this->free();
        }

        return $result;
    }

    /**
     * Blank template method free(). Override to be used to free query object memory
     */
    public function free()
    { 
    }

    /**
     * Get the dql call back for this query
     *
     * @return array $callback
     */
    protected function _getDqlCallback()
    {
        $callback = false;
        if ( ! empty($this->_dqlParts['from'])) {
            switch ($this->_type) {
                case self::DELETE:
                    $callback = array(
                        'callback' => 'preDqlDelete',
                        'const' => Doctrine_Event::RECORD_DQL_DELETE
                    );
                break;
                case self::UPDATE:
                    $callback = array(
                        'callback' => 'preDqlUpdate',
                        'const' => Doctrine_Event::RECORD_DQL_UPDATE
                    );
                break;
                case self::SELECT:
                    $callback = array(
                        'callback' => 'preDqlSelect',
                        'const' => Doctrine_Event::RECORD_DQL_SELECT
                    );
                break;
            }
        }

        return $callback;
    }

    /**
     * Pre query method which invokes the pre*Query() methods on the model instance or any attached
     * record listeners
     *
     * @return void
     */
    protected function _preQuery($params = array())
    {
        if ( ! $this->_preQueried && $this->getConnection()->getAttribute(Doctrine_Core::ATTR_USE_DQL_CALLBACKS)) {
            $this->_preQueried = true;

            $callback = $this->_getDqlCallback();

            // if there is no callback for the query type, then we can return early
            if ( ! $callback) {
                return;
            }

            foreach ($this->_getDqlCallbackComponents($params) as $alias => $component) {
                $table = $component['table'];
                $record = $table->getRecordInstance();

                // Trigger preDql*() callback event
                $params = array('component' => $component, 'alias' => $alias);
                $event = new Doctrine_Event($record, $callback['const'], $this, $params);

                $record->$callback['callback']($event);
                $table->getRecordListener()->$callback['callback']($event);
            }
        }

        // Invoke preQuery() hook on Doctrine_Query for child classes which implement this hook
        $this->preQuery();
    }

    /**
     * Returns an array of components to execute the query callbacks for
     *
     * @param  array $params
     * @return array $components
     */
    protected function _getDqlCallbackComponents($params = array())
    {
        $componentsBefore = array();
        if ($this->isSubquery()) {
            $componentsBefore = $this->getQueryComponents();
        }

        $copy = $this->copy();
        $copy->getSqlQuery($params, false);
        $componentsAfter = $copy->getQueryComponents();

        $this->_rootAlias = $copy->getRootAlias();

        $copy->free();

        if ($componentsBefore !== $componentsAfter) {
            return array_diff($componentsAfter, $componentsBefore);
        } else {
            return $componentsAfter;
        }
    }

    /**
     * Blank hook methods which can be implemented in Doctrine_Query child classes
     *
     * @return void
     */
    public function preQuery()
    {
    }

    /**
     * Constructs the query from the cached form.
     *
     * @param string  The cached query, in a serialized form.
     * @return array  The custom component that was cached together with the essential
     *                query data. This can be either a result set (result caching)
     *                or an SQL query string (query caching).
     */
    protected function _constructQueryFromCache($cached)
    {
        $cached = unserialize($cached);
        $this->_tableAliasMap = $cached[2];
        $customComponent = $cached[0];

        $queryComponents = array();
        $cachedComponents = $cached[1];
        foreach ($cachedComponents as $alias => $components) {
            $e = explode('.', $components['name']);
            if (count($e) === 1) {
                $manager = Doctrine_Manager::getInstance(); 
                if ( ! $this->_passedConn && $manager->hasConnectionForComponent($e[0])) { 
                    $this->_conn = $manager->getConnectionForComponent($e[0]); 
                }
                $queryComponents[$alias]['table'] = $this->_conn->getTable($e[0]);
            } else {
                $queryComponents[$alias]['parent'] = $e[0];
                $queryComponents[$alias]['relation'] = $queryComponents[$e[0]]['table']->getRelation($e[1]);
                $queryComponents[$alias]['table'] = $queryComponents[$alias]['relation']->getTable();
            }
            if (isset($components['agg'])) {
                $queryComponents[$alias]['agg'] = $components['agg'];
            }
            if (isset($components['map'])) {
                $queryComponents[$alias]['map'] = $components['map'];
            }
        }
        $this->_queryComponents = $queryComponents;

        return $customComponent;
    }

    /**
     * getCachedForm
     * returns the cached form of this query for given resultSet
     *
     * @param array $resultSet
     * @return string           serialized string representation of this query
     */
    public function getCachedForm($customComponent = null)
    {
        $componentInfo = array();

        foreach ($this->getQueryComponents() as $alias => $components) {
            if ( ! isset($components['parent'])) {
                $componentInfo[$alias]['name'] = $components['table']->getComponentName();
            } else {
                $componentInfo[$alias]['name'] = $components['parent'] . '.' . $components['relation']->getAlias();
            }
            if (isset($components['agg'])) {
                $componentInfo[$alias]['agg'] = $components['agg'];
            }
            if (isset($components['map'])) {
                $componentInfo[$alias]['map'] = $components['map'];
            }
        }

        if ($customComponent instanceof Doctrine_Collection) {
            foreach ($customComponent as $record) {
                $record->serializeReferences(true);
            }
        }

        return serialize(array($customComponent, $componentInfo, $this->getTableAliasMap()));
    }

    /**
     * Adds fields or aliased functions.
     *
     * This method adds fields or dbms functions to the SELECT query part.
     * <code>
     * $query->addSelect('COUNT(p.id) as num_phonenumbers');
     * </code>
     *
     * @param string $select        Query SELECT part
     * @return Doctrine_Query
     */
    public function addSelect($select)
    {
        return $this->_addDqlQueryPart('select', $select, true);
    }

    /**
     * addSqlTableAlias
     * adds an SQL table alias and associates it a component alias
     *
     * @param string $componentAlias    the alias for the query component associated with given tableAlias
     * @param string $tableAlias        the table alias to be added
     * @return Doctrine_Query_Abstract
     */
    public function addSqlTableAlias($sqlTableAlias, $componentAlias)
    {
        $this->_tableAliasMap[$sqlTableAlias] = $componentAlias;
        return $this;
    }

    /**
     * addFrom
     * adds fields to the FROM part of the query
     *
     * @param string $from        Query FROM part
     * @return Doctrine_Query
     */
    public function addFrom($from)
    {
        return $this->_addDqlQueryPart('from', $from, true);
    }

    /**
     * Alias for @see andWhere().
     * @return Doctrine_Query   this object
     */
    public function addWhere($where, $params = array())
    {
        return $this->andWhere($where, $params);
    }

    /**
     * Adds conditions to the WHERE part of the query.
     * <code>
     * $q->andWhere('u.birthDate > ?', '1975-01-01');
     * </code>
     *
     * @param string $where Query WHERE part
     * @param mixed $params An array of parameters or a simple scalar
     * @return Doctrine_Query
     */
    public function andWhere($where, $params = array())
    {
        if (is_array($params)) {
            $this->_params['where'] = array_merge($this->_params['where'], $params);
        } else {
            $this->_params['where'][] = $params;
        }

        if ($this->_hasDqlQueryPart('where')) {
            $this->_addDqlQueryPart('where', 'AND', true);
        }

        return $this->_addDqlQueryPart('where', $where, true);
    }

    /**
     * Adds conditions to the WHERE part of the query
     * <code>
     * $q->orWhere('u.role = ?', 'admin');
     * </code>
     *
     * @param string $where Query WHERE part
     * @param mixed $params An array of parameters or a simple scalar
     * @return Doctrine_Query
     */
    public function orWhere($where, $params = array())
    {
        if (is_array($params)) {
            $this->_params['where'] = array_merge($this->_params['where'], $params);
        } else {
            $this->_params['where'][] = $params;
        }

        if ($this->_hasDqlQueryPart('where')) {
            $this->_addDqlQueryPart('where', 'OR', true);
        }

        return $this->_addDqlQueryPart('where', $where, true);
    }

    /**
     * Adds IN condition to the query WHERE part. Alias to @see andWhereIn().
     *
     * @param string $expr          the operand of the IN
     * @param mixed $params         an array of parameters or a simple scalar
     * @param boolean $not          whether or not to use NOT in front of IN
     * @return Doctrine_Query
     */
    public function whereIn($expr, $params = array(), $not = false)
    {
        return $this->andWhereIn($expr, $params, $not);
    }

    /**
     * Adds IN condition to the query WHERE part
     * <code>
     * $q->whereIn('u.id', array(10, 23, 44));
     * </code>
     *
     * @param string $expr      The operand of the IN
     * @param mixed $params     An array of parameters or a simple scalar
     * @param boolean $not      Whether or not to use NOT in front of IN. Defaults to false (simple IN clause)
     * @return Doctrine_Query   this object.
     */
    public function andWhereIn($expr, $params = array(), $not = false)
    {
        // if there's no params, return (else we'll get a WHERE IN (), invalid SQL)
        if (isset($params) and (count($params) == 0)) {
            return $this;
        }

        if ($this->_hasDqlQueryPart('where')) {
            $this->_addDqlQueryPart('where', 'AND', true);
        }

        return $this->_addDqlQueryPart('where', $this->_processWhereIn($expr, $params, $not), true);
    }

    /**
     * Adds IN condition to the query WHERE part, appending it with an OR operator.
     * <code>
     * $q->orWhereIn('u.id', array(10, 23))
     *   ->orWhereIn('u.id', 44);
     * // will select all record with id equal to 10, 23 or 44
     * </code>
     *
     * @param string $expr The operand of the IN
     * @param mixed $params An array of parameters or a simple scalar
     * @param boolean $not Whether or not to use NOT in front of IN
     * @return Doctrine_Query
     */
    public function orWhereIn($expr, $params = array(), $not = false)
    {
        // if there's no params, return (else we'll get a WHERE IN (), invalid SQL)
        if (isset($params) and (count($params) == 0)) {
            return $this;
        }

        if ($this->_hasDqlQueryPart('where')) {
            $this->_addDqlQueryPart('where', 'OR', true);
        }

        return $this->_addDqlQueryPart('where', $this->_processWhereIn($expr, $params, $not), true);
    }

    /**
     * @nodoc
     */
    protected function _processWhereIn($expr, $params = array(), $not = false)
    {
        $params = (array) $params;

        // if there's no params, return (else we'll get a WHERE IN (), invalid SQL)
        if (count($params) == 0) {
            throw new Doctrine_Query_Exception('You must pass at least one parameter when using an IN() condition.');
        }

        $a = array();
        foreach ($params as $k => $value) {
            if ($value instanceof Doctrine_Expression) {
                $value = $value->getSql();
                unset($params[$k]);
            } else {
                $value = '?';
            }
            $a[] = $value;
        }

        $this->_params['where'] = array_merge($this->_params['where'], $params);

        return $expr . ($not === true ? ' NOT' : '') . ' IN (' . implode(', ', $a) . ')';
    }

    /**
     * Adds NOT IN condition to the query WHERE part.
     * <code>
     * $q->whereNotIn('u.id', array(10, 20));
     * // will exclude users with id 10 and 20 from the select
     * </code>
     *
     * @param string $expr          the operand of the NOT IN
     * @param mixed $params         an array of parameters or a simple scalar
     * @return Doctrine_Query       this object
     */
    public function whereNotIn($expr, $params = array())
    {
        return $this->whereIn($expr, $params, true);
    }

    /**
     * Adds NOT IN condition to the query WHERE part
     * Alias for @see whereNotIn().
     *
     * @param string $expr The operand of the NOT IN
     * @param mixed $params An array of parameters or a simple scalar
     * @return Doctrine_Query
     */
    public function andWhereNotIn($expr, $params = array())
    {
        return $this->andWhereIn($expr, $params, true);
    }

    /**
     * Adds NOT IN condition to the query WHERE part
     *
     * @param string $expr The operand of the NOT IN
     * @param mixed $params An array of parameters or a simple scalar
     * @return Doctrine_Query
     */
    public function orWhereNotIn($expr, $params = array())
    {
        return $this->orWhereIn($expr, $params, true);
    }

    /**
     * Adds fields to the GROUP BY part of the query.
     * <code>
     * $q->groupBy('u.id');
     * </code>
     *
     * @param string $groupby       Query GROUP BY part
     * @return Doctrine_Query
     */
    public function addGroupBy($groupby)
    {
        return $this->_addDqlQueryPart('groupby', $groupby, true);
    }

    /**
     * Adds conditions to the HAVING part of the query.
     *
     * This methods add HAVING clauses. These clauses are used to narrow the 
     * results by operating on aggregated values.
     * <code>
     * $q->having('num_phonenumbers > ?', 1);
     * </code>
     *
     * @param string $having        Query HAVING part
     * @param mixed $params         an array of parameters or a simple scalar
     * @return Doctrine_Query
     */
    public function addHaving($having, $params = array())
    {
        if (is_array($params)) {
            $this->_params['having'] = array_merge($this->_params['having'], $params);
        } else {
            $this->_params['having'][] = $params;
        }
        return $this->_addDqlQueryPart('having', $having, true);
    }

    /**
     * addOrderBy
     * adds fields to the ORDER BY part of the query
     *
     * @param string $orderby       Query ORDER BY part
     * @return Doctrine_Query
     */
    public function addOrderBy($orderby)
    {
        return $this->_addDqlQueryPart('orderby', $orderby, true);
    }

    /**
     * select
     * sets the SELECT part of the query
     *
     * @param string $select        Query SELECT part
     * @return Doctrine_Query
     */
    public function select($select = null)
    {
        $this->_type = self::SELECT;
        if ($select) {
            return $this->_addDqlQueryPart('select', $select);
        } else {
            return $this;
        }
    }

    /**
     * distinct
     * Makes the query SELECT DISTINCT.
     * <code>
     * $q->distinct();
     * </code>
     *
     * @param bool $flag            Whether or not the SELECT is DISTINCT (default true).
     * @return Doctrine_Query
     */
    public function distinct($flag = true)
    {
        $this->_sqlParts['distinct'] = (bool) $flag;
        return $this;
    }

    /**
     * forUpdate
     * Makes the query SELECT FOR UPDATE.
     *
     * @param bool $flag            Whether or not the SELECT is FOR UPDATE (default true).
     * @return Doctrine_Query
     */
    public function forUpdate($flag = true)
    {
        $this->_sqlParts['forUpdate'] = (bool) $flag;
        return $this;
    }

    /**
     * delete
     * sets the query type to DELETE
     *
     * @return Doctrine_Query
     */
    public function delete($from = null)
    {
        $this->_type = self::DELETE;
        if ($from != null) {
            return $this->_addDqlQueryPart('from', $from);
        }
        return $this;
    }

    /**
     * update
     * sets the UPDATE part of the query
     *
     * @param string $update        Query UPDATE part
     * @return Doctrine_Query
     */
    public function update($from = null)
    {
        $this->_type = self::UPDATE;
        if ($from != null) {
            return $this->_addDqlQueryPart('from', $from);
        }
        return $this;
    }

    /**
     * set
     * sets the SET part of the query
     *
     * @param string $update        Query UPDATE part
     * @return Doctrine_Query
     */
    public function set($key, $value = null, $params = null)
    {
        if (is_array($key)) {
            foreach ($key as $k => $v) {
                $this->set($k, '?', array($v));
            }
            return $this;
        } else {
            if ($params !== null) {
                if (is_array($params)) {
                    $this->_params['set'] = array_merge($this->_params['set'], $params);
                } else {
                    $this->_params['set'][] = $params;
                }
            }

            return $this->_addDqlQueryPart('set', $key . ' = ' . $value, true);
        }
    }

    /**
     * from
     * sets the FROM part of the query
     * <code>
     * $q->from('User u');
     * </code>
     *
     * @param string $from          Query FROM part
     * @return Doctrine_Query
     */
    public function from($from)
    {
        return $this->_addDqlQueryPart('from', $from);
    }

    /**
     * innerJoin
     * appends an INNER JOIN to the FROM part of the query
     *
     * @param string $join         Query INNER JOIN
     * @return Doctrine_Query
     */
    public function innerJoin($join, $params = array())
    {
        if (is_array($params)) {
            $this->_params['join'] = array_merge($this->_params['join'], $params);
        } else {
            $this->_params['join'][] = $params;
        }

        return $this->_addDqlQueryPart('from', 'INNER JOIN ' . $join, true);
    }

    /**
     * leftJoin
     * appends a LEFT JOIN to the FROM part of the query
     *
     * @param string $join         Query LEFT JOIN
     * @return Doctrine_Query
     */
    public function leftJoin($join, $params = array())
    {
        if (is_array($params)) {
            $this->_params['join'] = array_merge($this->_params['join'], $params);
        } else {
            $this->_params['join'][] = $params;
        }

        return $this->_addDqlQueryPart('from', 'LEFT JOIN ' . $join, true);
    }

    /**
     * groupBy
     * sets the GROUP BY part of the query
     *
     * @param string $groupby      Query GROUP BY part
     * @return Doctrine_Query
     */
    public function groupBy($groupby)
    {
        return $this->_addDqlQueryPart('groupby', $groupby);
    }

    /**
     * where
     * sets the WHERE part of the query
     *
     * @param string $join         Query WHERE part
     * @param mixed $params        an array of parameters or a simple scalar
     * @return Doctrine_Query
     */
    public function where($where, $params = array())
    {
        $this->_params['where'] = array();

        if (is_array($params)) {
            $this->_params['where'] = $params;
        } else {
            $this->_params['where'][] = $params;
        }

        return $this->_addDqlQueryPart('where', $where);
    }

    /**
     * having
     * sets the HAVING part of the query
     *
     * @param string $having       Query HAVING part
     * @param mixed $params        an array of parameters or a simple scalar
     * @return Doctrine_Query
     */
    public function having($having, $params = array())
    {
        $this->_params['having'] = array();
        if (is_array($params)) {
            $this->_params['having'] = $params;
        } else {
            $this->_params['having'][] = $params;
        }

        return $this->_addDqlQueryPart('having', $having);
    }

    /**
     * Sets the ORDER BY part of the query.
     * <code>
     * $q->orderBy('u.name');
     * $query->orderBy('u.birthDate DESC');
     * </code>
     *
     * @param string $orderby      Query ORDER BY part
     * @return Doctrine_Query
     */
    public function orderBy($orderby)
    {
        return $this->_addDqlQueryPart('orderby', $orderby);
    }

    /**
     * limit
     * sets the Query query limit
     *
     * @param integer $limit        limit to be used for limiting the query results
     * @return Doctrine_Query
     */
    public function limit($limit)
    {
        return $this->_addDqlQueryPart('limit', $limit);
    }

    /**
     * offset
     * sets the Query query offset
     *
     * @param integer $offset       offset to be used for paginating the query
     * @return Doctrine_Query
     */
    public function offset($offset)
    {
        return $this->_addDqlQueryPart('offset', $offset);
    }

    /**
     * Resets all the sql parts.
     *
     * @return void
     */
    protected function clear()
    {
        $this->_sqlParts = array(
                    'select'    => array(),
                    'distinct'  => false,
                    'forUpdate' => false,
                    'from'      => array(),
                    'set'       => array(),
                    'join'      => array(),
                    'where'     => array(),
                    'groupby'   => array(),
                    'having'    => array(),
                    'orderby'   => array(),
                    'limit'     => false,
                    'offset'    => false,
                    );
    }

    public function setHydrationMode($hydrationMode)
    {
        $this->_hydrator->setHydrationMode($hydrationMode);
        return $this;
    }

    /**
     * Gets the components of this query.
     */
    public function getQueryComponents()
    {
        return $this->_queryComponents;
    }

    /**
     * Return the SQL parts.
     *
     * @return array The parts
     */
    public function getSqlParts()
    {
        return $this->_sqlParts;
    }

    /**
     * getType
     *
     * returns the type of this query object
     * by default the type is Doctrine_Query_Abstract::SELECT but if update() or delete()
     * are being called the type is Doctrine_Query_Abstract::UPDATE and Doctrine_Query_Abstract::DELETE,
     * respectively
     *
     * @see Doctrine_Query_Abstract::SELECT
     * @see Doctrine_Query_Abstract::UPDATE
     * @see Doctrine_Query_Abstract::DELETE
     *
     * @return integer      return the query type
     */
    public function getType()
    {
        return $this->_type;
    }

    /**
     * useResultCache
     *
     * @param Doctrine_Cache_Interface|bool $driver      cache driver
     * @param integer $timeToLive                        how long the cache entry is valid
     * @param string $resultCacheHash                     The key to use for storing the queries result cache entry
     * @return Doctrine_Query         this object
     */
    public function useResultCache($driver = true, $timeToLive = null, $resultCacheHash = null)
    {
        if ($driver !== null && $driver !== true && ! ($driver instanceOf Doctrine_Cache_Interface)) {
            $msg = 'First argument should be instance of Doctrine_Cache_Interface or null.';
            throw new Doctrine_Query_Exception($msg);
        }
        $this->_resultCache = $driver;
        $this->_resultCacheHash = $resultCacheHash;

        if ($timeToLive !== null) {
            $this->setResultCacheLifeSpan($timeToLive);
        }
        return $this;
    }

    /**
     * Set the result cache hash to be used for storing the results in the cache driver
     *
     * @param string $resultCacheHash
     * @return void
     */
    public function setResultCacheHash($resultCacheHash)
    {
        $this->_resultCacheHash = $resultCacheHash;

        return $this;
    }

    /**
     * Clear the result cache entry for this query
     *
     * @return void
     */
    public function clearResultCache()
    {
        $this->getResultCacheDriver()
            ->delete($this->getResultCacheHash());

        return $this;
    }

    /**
     * useQueryCache
     *
     * @param Doctrine_Cache_Interface|bool $driver      cache driver
     * @param integer $timeToLive                        how long the cache entry is valid
     * @return Doctrine_Query         this object
     */
    public function useQueryCache($driver = true, $timeToLive = null)
    {
        if ($driver !== null && $driver !== true && $driver !== false && ! ($driver instanceOf Doctrine_Cache_Interface)) {
            $msg = 'First argument should be instance of Doctrine_Cache_Interface or null.';
            throw new Doctrine_Query_Exception($msg);
        }
        $this->_queryCache = $driver;

        if ($timeToLive !== null) {
            $this->setQueryCacheLifeSpan($timeToLive);
        }
        return $this;
    }

    /**
     * expireCache
     *
     * @param boolean $expire       whether or not to force cache expiration
     * @return Doctrine_Query     this object
     */
    public function expireResultCache($expire = true)
    {
        $this->_expireResultCache = $expire;
        return $this;
    }

    /**
     * expireQueryCache
     *
     * @param boolean $expire       whether or not to force cache expiration
     * @return Doctrine_Query     this object
     */
    public function expireQueryCache($expire = true)
    {
        $this->_expireQueryCache = $expire;
        return $this;
    }

    /**
     * setResultCacheLifeSpan
     *
     * @param integer $timeToLive   how long the cache entry is valid (in seconds)
     * @return Doctrine_Query     this object
     */
    public function setResultCacheLifeSpan($timeToLive)
    {
        if ($timeToLive !== null) {
            $timeToLive = (int) $timeToLive;
        }
        $this->_resultCacheTTL = $timeToLive;

        return $this;
    }

    /**
     * Gets the life span of the result cache in seconds.
     *
     * @return integer
     */
    public function getResultCacheLifeSpan()
    {
        return $this->_resultCacheTTL;
    }

    /**
     * setQueryCacheLifeSpan
     *
     * @param integer $timeToLive   how long the cache entry is valid
     * @return Doctrine_Query     this object
     */
    public function setQueryCacheLifeSpan($timeToLive)
    {
        if ($timeToLive !== null) {
            $timeToLive = (int) $timeToLive;
        }
        $this->_queryCacheTTL = $timeToLive;

        return $this;
    }

    /**
     * Gets the life span of the query cache the Query object is using.
     *
     * @return integer  The life span in seconds.
     */
    public function getQueryCacheLifeSpan()
    {
        return $this->_queryCacheTTL;
    }

    /**
     * getResultCacheDriver
     * returns the cache driver used for caching result sets
     *
     * @return Doctrine_Cache_Interface|boolean|null    cache driver
     */
    public function getResultCacheDriver()
    {
        if ($this->_resultCache instanceof Doctrine_Cache_Interface) {
            return $this->_resultCache;
        } else {
            return $this->_conn->getResultCacheDriver();
        }
    }

    /**
     * getQueryCacheDriver
     * returns the cache driver used for caching queries
     *
     * @return Doctrine_Cache_Interface|boolean|null    cache driver
     */
    public function getQueryCacheDriver()
    {
        if ($this->_queryCache instanceof Doctrine_Cache_Interface) {
            return $this->_queryCache;
        } else {
            return $this->_conn->getQueryCacheDriver();
        }
    }

    /**
     * getConnection
     *
     * @return Doctrine_Connection
     */
    public function getConnection()
    {
        return $this->_conn;
    }

    /**
     * Checks if there's at least one DQL part defined to the internal parts collection.
     *
     * @param string $queryPartName  The name of the query part.
     * @return boolean
     */
    protected function _hasDqlQueryPart($queryPartName)
    {
        return count($this->_dqlParts[$queryPartName]) > 0;
    }

    /**
     * Adds a DQL part to the internal parts collection.
     *
     * This method add the part specified to the array named by $queryPartName.
     * Most part names support multiple parts addition.
     *
     * @see $_dqlParts;
     * @see Doctrine_Query::getDqlPart()
     * @param string $queryPartName  The name of the query part.
     * @param string $queryPart      The actual query part to add.
     * @param boolean $append        Whether to append $queryPart to already existing
     *                               parts under the same $queryPartName. Defaults to FALSE
     *                               (previously added parts with the same name get overridden).
     */
    protected function _addDqlQueryPart($queryPartName, $queryPart, $append = false)
    {
        // We should prevent nullable query parts
        if ($queryPart === null) {
            throw new Doctrine_Query_Exception('Cannot define NULL as part of query when defining \'' . $queryPartName . '\'.');
        }

        if ($append) {
            $this->_dqlParts[$queryPartName][] = $queryPart;
        } else {
            $this->_dqlParts[$queryPartName] = array($queryPart);
        }

        $this->_state = Doctrine_Query::STATE_DIRTY;
        return $this;
    }

    /**
     * _processDqlQueryPart
     * parses given query part
     *
     * @param string $queryPartName     the name of the query part
     * @param array $queryParts         an array containing the query part data
     * @return Doctrine_Query           this object
     * @todo Better description. "parses given query part" ??? Then wheres the difference
     *       between process/parseQueryPart? I suppose this does something different.
     */
    protected function _processDqlQueryPart($queryPartName, $queryParts)
    {
        $this->removeSqlQueryPart($queryPartName);

        if (is_array($queryParts) && ! empty($queryParts)) {
            foreach ($queryParts as $queryPart) {
                $parser = $this->_getParser($queryPartName);
                $sql = $parser->parse($queryPart);
                if (isset($sql)) {
                    if ($queryPartName == 'limit' || $queryPartName == 'offset') {
                        $this->setSqlQueryPart($queryPartName, $sql);
                    } else {
                        $this->addSqlQueryPart($queryPartName, $sql);
                    }
                }
            }
        }
    }

    /**
     * _getParser
     * parser lazy-loader
     *
     * @throws Doctrine_Query_Exception     if unknown parser name given
     * @return Doctrine_Query_Part
     * @todo Doc/Description: What is the parameter for? Which parsers are available?
     */
    protected function _getParser($name)
    {
        if ( ! isset($this->_parsers[$name])) {
            $class = 'Doctrine_Query_' . ucwords(strtolower($name));

            Doctrine_Core::autoload($class);

            if ( ! class_exists($class)) {
                throw new Doctrine_Query_Exception('Unknown parser ' . $name);
            }

            $this->_parsers[$name] = new $class($this, $this->_tokenizer);
        }

        return $this->_parsers[$name];
    }

    /**
     * Gets the SQL query that corresponds to this query object.
     * The returned SQL syntax depends on the connection driver that is used
     * by this query object at the time of this method call.
     *
     * @param array $params
     */
    abstract public function getSqlQuery($params = array());

    /**
     * parseDqlQuery
     * parses a dql query
     *
     * @param string $query         query to be parsed
     * @return Doctrine_Query_Abstract  this object
     */
    abstract public function parseDqlQuery($query);

    /**
     * toString magic call
     * this method is automatically called when Doctrine_Query object is trying to be used as a string
     * So, it it converted into its DQL correspondant
     *
     * @return string DQL string
     */
    public function __toString()
    {
        return $this->getDql();
    }
}