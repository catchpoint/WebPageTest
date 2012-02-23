<?php
/*
 *  $Id: Connection.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Connection
 *
 * A wrapper layer on top of PDO / Doctrine_Adapter
 *
 * Doctrine_Connection is the heart of any Doctrine based application.
 *
 * 1. Event listeners
 *    An easy to use, pluggable eventlistener architecture. Aspects such as
 *    logging, query profiling and caching can be easily implemented through
 *    the use of these listeners
 *
 * 2. Lazy-connecting
 *    Creating an instance of Doctrine_Connection does not connect
 *    to database. Connecting to database is only invoked when actually needed
 *    (for example when query() is being called)
 *
 * 3. Convenience methods
 *    Doctrine_Connection provides many convenience methods such as fetchAll(), fetchOne() etc.
 *
 * 4. Modular structure
 *    Higher level functionality such as schema importing, exporting, sequence handling etc.
 *    is divided into modules. For a full list of connection modules see
 *    Doctrine_Connection::$_modules
 *
 * @package     Doctrine
 * @subpackage  Connection
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Lukas Smith <smith@pooteeweet.org> (MDB2 library)
 */
abstract class Doctrine_Connection extends Doctrine_Configurable implements Countable, IteratorAggregate, Serializable
{
    /**
     * @var $dbh                                the database handler
     */
    protected $dbh;

    /**
     * @var array $tables                       an array containing all the initialized Doctrine_Table objects
     *                                          keys representing Doctrine_Table component names and values as Doctrine_Table objects
     */
    protected $tables           = array();

    /**
     * $_name
     *
     * Name of the connection
     *
     * @var string $_name
     */
    protected $_name;

    /**
     * The name of this connection driver.
     *
     * @var string $driverName
     */
    protected $driverName;

    /**
     * @var boolean $isConnected                whether or not a connection has been established
     */
    protected $isConnected      = false;

    /**
     * @var array $supported                    an array containing all features this driver supports,
     *                                          keys representing feature names and values as
     *                                          one of the following (true, false, 'emulated')
     */
    protected $supported        = array();

    /**
     * @var array $pendingAttributes            An array of pending attributes. When setting attributes
     *                                          no connection is needed. When connected all the pending
     *                                          attributes are passed to the underlying adapter (usually PDO) instance.
     */
    protected $pendingAttributes  = array();

    /**
     * @var array $modules                      an array containing all modules
     *              transaction                 Doctrine_Transaction driver, handles savepoint and transaction isolation abstraction
     *
     *              expression                  Doctrine_Expression_Driver, handles expression abstraction
     *
     *              dataDict                    Doctrine_DataDict driver, handles datatype abstraction
     *
     *              export                      Doctrine_Export driver, handles db structure modification abstraction (contains
     *                                          methods such as alterTable, createConstraint etc.)
     *              import                      Doctrine_Import driver, handles db schema reading
     *
     *              sequence                    Doctrine_Sequence driver, handles sequential id generation and retrieval
     *
     *              unitOfWork                  Doctrine_Connection_UnitOfWork handles many orm functionalities such as object
     *                                          deletion and saving
     *
     *              formatter                   Doctrine_Formatter handles data formatting, quoting and escaping
     *
     * @see Doctrine_Connection::__get()
     * @see Doctrine_DataDict
     * @see Doctrine_Expression_Driver
     * @see Doctrine_Export
     * @see Doctrine_Transaction
     * @see Doctrine_Sequence
     * @see Doctrine_Connection_UnitOfWork
     * @see Doctrine_Formatter
     */
    private $modules = array('transaction' => false,
                             'expression'  => false,
                             'dataDict'    => false,
                             'export'      => false,
                             'import'      => false,
                             'sequence'    => false,
                             'unitOfWork'  => false,
                             'formatter'   => false,
                             'util'        => false,
                             );

    /**
     * @var array $properties               an array of connection properties
     */
    protected $properties = array('sql_comments'        => array(array('start' => '--', 'end' => "\n", 'escape' => false),
                                                                 array('start' => '/*', 'end' => '*/', 'escape' => false)),
                                  'identifier_quoting'  => array('start' => '"', 'end' => '"','escape' => '"'),
                                  'string_quoting'      => array('start' => "'",
                                                                 'end' => "'",
                                                                 'escape' => false,
                                                                 'escape_pattern' => false),
                                  'wildcards'           => array('%', '_'),
                                  'varchar_max_length'  => 255,
                                  'sql_file_delimiter'  => ";\n",
                                  'max_identifier_length' => 64,
                                  );

    /**
     * @var array $serverInfo
     */
    protected $serverInfo = array();

    protected $options    = array();

    /**
     * @var array $supportedDrivers         an array containing all supported drivers
     */
    private static $supportedDrivers    = array(
                                        'Mysql',
                                        'Pgsql',
                                        'Oracle',
                                        'Mssql',
                                        'Sqlite',
                                        );
    protected $_count = 0;

    /**
     * @var array $_userFkNames                 array of foreign key names that have been used
     */
    protected $_usedNames = array(
            'foreign_keys' => array(),
            'indexes' => array()
        );

    /**
     * the constructor
     *
     * @param Doctrine_Manager $manager                 the manager object
     * @param PDO|Doctrine_Adapter_Interface $adapter   database driver
     */
    public function __construct(Doctrine_Manager $manager, $adapter, $user = null, $pass = null)
    {
        if (is_object($adapter)) {
            if ( ! ($adapter instanceof PDO) && ! in_array('Doctrine_Adapter_Interface', class_implements($adapter))) {
                throw new Doctrine_Connection_Exception('First argument should be an instance of PDO or implement Doctrine_Adapter_Interface');
            }
            $this->dbh = $adapter;

            $this->isConnected = true;

        } else if (is_array($adapter)) {
            $this->pendingAttributes[Doctrine_Core::ATTR_DRIVER_NAME] = $adapter['scheme'];

            $this->options['dsn']      = $adapter['dsn'];
            $this->options['username'] = $adapter['user'];
            $this->options['password'] = $adapter['pass'];

            $this->options['other'] = array();
            if (isset($adapter['other'])) {
                $this->options['other'] = array(Doctrine_Core::ATTR_PERSISTENT => $adapter['persistent']);
            }

        }

        $this->setParent($manager);

        $this->setAttribute(Doctrine_Core::ATTR_CASE, Doctrine_Core::CASE_NATURAL);
        $this->setAttribute(Doctrine_Core::ATTR_ERRMODE, Doctrine_Core::ERRMODE_EXCEPTION);

        $this->getAttribute(Doctrine_Core::ATTR_LISTENER)->onOpen($this);
    }

    /**
     * Check wherther the connection to the database has been made yet
     *
     * @return boolean
     */
    public function isConnected()
    {
        return $this->isConnected;
    }

    /**
     * getOptions
     *
     * Get array of all options
     *
     * @return void
     */
    public function getOptions()
    {
      return $this->options;
    }

    /**
     * getOption
     *
     * Retrieves option
     *
     * @param string $option
     * @return void
     */
    public function getOption($option)
    {
        if (isset($this->options[$option])) {
            return $this->options[$option];
        }
    }

    /**
     * setOption
     *
     * Set option value
     *
     * @param string $option
     * @return void
     */
    public function setOption($option, $value)
    {
      return $this->options[$option] = $value;
    }

    /**
     * getAttribute
     * retrieves a database connection attribute
     *
     * @param integer $attribute
     * @return mixed
     */
    public function getAttribute($attribute)
    {
        if ($attribute >= 100 && $attribute < 1000) {
            if ( ! isset($this->attributes[$attribute])) {
                return parent::getAttribute($attribute);
            }
            return $this->attributes[$attribute];
        }

        if ($this->isConnected) {
            try {
                return $this->dbh->getAttribute($attribute);
            } catch (Exception $e) {
                throw new Doctrine_Connection_Exception('Attribute ' . $attribute . ' not found.');
            }
        } else {
            if ( ! isset($this->pendingAttributes[$attribute])) {
                $this->connect();
                $this->getAttribute($attribute);
            }

            return $this->pendingAttributes[$attribute];
        }
    }

    /**
     * returns an array of available PDO drivers
     */
    public static function getAvailableDrivers()
    {
        return PDO::getAvailableDrivers();
    }

    /**
     * Returns an array of supported drivers by Doctrine
     *
     * @return array $supportedDrivers
     */
    public static function getSupportedDrivers()
    {
        return self::$supportedDrivers;
    }

    /**
     * setAttribute
     * sets an attribute
     *
     * @todo why check for >= 100? has this any special meaning when creating
     * attributes?
     *
     * @param integer $attribute
     * @param mixed $value
     * @return boolean
     */
    public function setAttribute($attribute, $value)
    {
        if ($attribute >= 100 && $attribute < 1000) {
            parent::setAttribute($attribute, $value);
        } else {
            if ($this->isConnected) {
                $this->dbh->setAttribute($attribute, $value);
            } else {
                $this->pendingAttributes[$attribute] = $value;
            }
        }

        return $this;
    }

    /**
     * getName
     * returns the name of this driver
     *
     * @return string           the name of this driver
     */
    public function getName()
    {
        return $this->_name;
    }

    /**
     * setName
     *
     * Sets the name of the connection
     *
     * @param string $name
     * @return void
     */
    public function setName($name)
    {
        $this->_name = $name;
    }

    /**
     * getDriverName
     *
     * Gets the name of the instance driver
     *
     * @return void
     */
    public function getDriverName()
    {
        return $this->driverName;
    }

    /**
     * __get
     * lazy loads given module and returns it
     *
     * @see Doctrine_DataDict
     * @see Doctrine_Expression_Driver
     * @see Doctrine_Export
     * @see Doctrine_Transaction
     * @see Doctrine_Connection::$modules       all availible modules
     * @param string $name                      the name of the module to get
     * @throws Doctrine_Connection_Exception    if trying to get an unknown module
     * @return Doctrine_Connection_Module       connection module
     */
    public function __get($name)
    {
        if (isset($this->properties[$name])) {
            return $this->properties[$name];
        }

        if ( ! isset($this->modules[$name])) {
            throw new Doctrine_Connection_Exception('Unknown module / property ' . $name);
        }
        if ($this->modules[$name] === false) {
            switch ($name) {
                case 'unitOfWork':
                    $this->modules[$name] = new Doctrine_Connection_UnitOfWork($this);
                    break;
                case 'formatter':
                    $this->modules[$name] = new Doctrine_Formatter($this);
                    break;
                default:
                    $class = 'Doctrine_' . ucwords($name) . '_' . $this->getDriverName();
                    $this->modules[$name] = new $class($this);
                }
        }

        return $this->modules[$name];
    }

    /**
     * returns the manager that created this connection
     *
     * @return Doctrine_Manager
     */
    public function getManager()
    {
        return $this->getParent();
    }

    /**
     * returns the database handler of which this connection uses
     *
     * @return PDO              the database handler
     */
    public function getDbh()
    {
        $this->connect();

        return $this->dbh;
    }

    /**
     * connect
     * connects into database
     *
     * @return boolean
     */
    public function connect()
    {
        if ($this->isConnected) {
            return false;
        }

        $event = new Doctrine_Event($this, Doctrine_Event::CONN_CONNECT);

        $this->getListener()->preConnect($event);

        $e     = explode(':', $this->options['dsn']);
        $found = false;

        if (extension_loaded('pdo')) {
            if (in_array($e[0], self::getAvailableDrivers())) {
                try {
                    $this->dbh = new PDO($this->options['dsn'], $this->options['username'],
                                     (!$this->options['password'] ? '':$this->options['password']), $this->options['other']);

                    $this->dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                } catch (PDOException $e) {
                    throw new Doctrine_Connection_Exception('PDO Connection Error: ' . $e->getMessage());
                }
                $found = true;
            }
        }

        if ( ! $found) {
            $class = 'Doctrine_Adapter_' . ucwords($e[0]);

            if (class_exists($class)) {
                $this->dbh = new $class($this->options['dsn'], $this->options['username'], $this->options['password'], $this->options);
            } else {
                throw new Doctrine_Connection_Exception("Couldn't locate driver named " . $e[0]);
            }
        }

        // attach the pending attributes to adapter
        foreach($this->pendingAttributes as $attr => $value) {
            // some drivers don't support setting this so we just skip it
            if ($attr == Doctrine_Core::ATTR_DRIVER_NAME) {
                continue;
            }
            $this->dbh->setAttribute($attr, $value);
        }

        $this->isConnected = true;

        $this->getListener()->postConnect($event);
        return true;
    }

    public function incrementQueryCount()
    {
        $this->_count++;
    }

    /**
     * converts given driver name
     *
     * @param
     */
    public function driverName($name)
    {
    }

    /**
     * supports
     *
     * @param string $feature   the name of the feature
     * @return boolean          whether or not this drivers supports given feature
     */
    public function supports($feature)
    {
        return (isset($this->supported[$feature])
                  && ($this->supported[$feature] === 'emulated'
                   || $this->supported[$feature]));
    }

    /**
     * Execute a SQL REPLACE query. A REPLACE query is identical to a INSERT
     * query, except that if there is already a row in the table with the same
     * key field values, the REPLACE query just updates its values instead of
     * inserting a new row.
     *
     * The REPLACE type of query does not make part of the SQL standards. Since
     * practically only MySQL and SQLIte implement it natively, this type of
     * query isemulated through this method for other DBMS using standard types
     * of queries inside a transaction to assure the atomicity of the operation.
     *
     * @param                   string  name of the table on which the REPLACE query will
     *                          be executed.
     *
     * @param   array           an associative array that describes the fields and the
     *                          values that will be inserted or updated in the specified table. The
     *                          indexes of the array are the names of all the fields of the table.
     *
     *                          The values of the array are values to be assigned to the specified field.
     *
     * @param array $keys       an array containing all key fields (primary key fields
     *                          or unique index fields) for this table
     *
     *                          the uniqueness of a row will be determined according to
     *                          the provided key fields
     *
     *                          this method will fail if no key fields are specified
     *
     * @throws Doctrine_Connection_Exception        if this driver doesn't support replace
     * @throws Doctrine_Connection_Exception        if some of the key values was null
     * @throws Doctrine_Connection_Exception        if there were no key fields
     * @throws PDOException                         if something fails at PDO level
     * @ return integer                              number of rows affected
     */
    public function replace(Doctrine_Table $table, array $fields, array $keys)
    {
        if (empty($keys)) {
            throw new Doctrine_Connection_Exception('Not specified which fields are keys');
        }
        $identifier = (array) $table->getIdentifier();
        $condition = array();

        foreach ($fields as $fieldName => $value) {
            if (in_array($fieldName, $keys)) {
                if ($value !== null) {
                    $condition[] = $table->getColumnName($fieldName) . ' = ?';
                    $conditionValues[] = $value;
                }
            }
        }

        $affectedRows = 0;
        if ( ! empty($condition) && ! empty($conditionValues)) {
            $query = 'DELETE FROM ' . $this->quoteIdentifier($table->getTableName())
                    . ' WHERE ' . implode(' AND ', $condition);

            $affectedRows = $this->exec($query, $conditionValues);
        }

        $this->insert($table, $fields);

        $affectedRows++;

        return $affectedRows;
    }

    /**
     * deletes table row(s) matching the specified identifier
     *
     * @throws Doctrine_Connection_Exception    if something went wrong at the database level
     * @param string $table         The table to delete data from
     * @param array $identifier     An associateve array containing identifier column-value pairs.
     * @return integer              The number of affected rows
     */
    public function delete(Doctrine_Table $table, array $identifier)
    {
        $tmp = array();

        foreach (array_keys($identifier) as $id) {
            $tmp[] = $this->quoteIdentifier($table->getColumnName($id)) . ' = ?';
        }

        $query = 'DELETE FROM '
               . $this->quoteIdentifier($table->getTableName())
               . ' WHERE ' . implode(' AND ', $tmp);

        return $this->exec($query, array_values($identifier));
    }

    /**
     * Updates table row(s) with specified data.
     *
     * @throws Doctrine_Connection_Exception    if something went wrong at the database level
     * @param Doctrine_Table $table     The table to insert data into
     * @param array $values             An associative array containing column-value pairs.
     *                                  Values can be strings or Doctrine_Expression instances.
     * @return integer                  the number of affected rows. Boolean false if empty value array was given,
     */
    public function update(Doctrine_Table $table, array $fields, array $identifier)
    {
        if (empty($fields)) {
            return false;
        }

        $set = array();
        foreach ($fields as $fieldName => $value) {
            if ($value instanceof Doctrine_Expression) {
                $set[] = $this->quoteIdentifier($table->getColumnName($fieldName)) . ' = ' . $value->getSql();
                unset($fields[$fieldName]);
            } else {
                $set[] = $this->quoteIdentifier($table->getColumnName($fieldName)) . ' = ?';
            }
        }

        $params = array_merge(array_values($fields), array_values($identifier));

        $sql  = 'UPDATE ' . $this->quoteIdentifier($table->getTableName())
              . ' SET ' . implode(', ', $set)
              . ' WHERE ' . implode(' = ? AND ', $this->quoteMultipleIdentifier($table->getIdentifierColumnNames()))
              . ' = ?';

        return $this->exec($sql, $params);
    }

    /**
     * Inserts a table row with specified data.
     *
     * @param Doctrine_Table $table     The table to insert data into.
     * @param array $values             An associative array containing column-value pairs.
     *                                  Values can be strings or Doctrine_Expression instances.
     * @return integer                  the number of affected rows. Boolean false if empty value array was given,
     */
    public function insert(Doctrine_Table $table, array $fields)
    {
        $tableName = $table->getTableName();

        // column names are specified as array keys
        $cols = array();
        // the query VALUES will contain either expresions (eg 'NOW()') or ?
        $a = array();
        foreach ($fields as $fieldName => $value) {
            $cols[] = $this->quoteIdentifier($table->getColumnName($fieldName));
            if ($value instanceof Doctrine_Expression) {
                $a[] = $value->getSql();
                unset($fields[$fieldName]);
            } else {
                $a[] = '?';
            }
        }

        // build the statement
        $query = 'INSERT INTO ' . $this->quoteIdentifier($tableName)
                . ' (' . implode(', ', $cols) . ')'
                . ' VALUES (' . implode(', ', $a) . ')';

        return $this->exec($query, array_values($fields));
    }

    /**
     * Quote a string so it can be safely used as a table or column name
     *
     * Delimiting style depends on which database driver is being used.
     *
     * NOTE: just because you CAN use delimited identifiers doesn't mean
     * you SHOULD use them.  In general, they end up causing way more
     * problems than they solve.
     *
     * Portability is broken by using the following characters inside
     * delimited identifiers:
     *   + backtick (<kbd>`</kbd>) -- due to MySQL
     *   + double quote (<kbd>"</kbd>) -- due to Oracle
     *   + brackets (<kbd>[</kbd> or <kbd>]</kbd>) -- due to Access
     *
     * Delimited identifiers are known to generally work correctly under
     * the following drivers:
     *   + mssql
     *   + mysql
     *   + mysqli
     *   + oci8
     *   + pgsql
     *   + sqlite
     *
     * InterBase doesn't seem to be able to use delimited identifiers
     * via PHP 4.  They work fine under PHP 5.
     *
     * @param string $str           identifier name to be quoted
     * @param bool $checkOption     check the 'quote_identifier' option
     *
     * @return string               quoted identifier string
     */
    public function quoteIdentifier($str, $checkOption = true)
    {
        // quick fix for the identifiers that contain a dot
        if (strpos($str, '.')) {
            $e = explode('.', $str);

            return $this->formatter->quoteIdentifier($e[0], $checkOption) . '.'
                 . $this->formatter->quoteIdentifier($e[1], $checkOption);
        }
        return $this->formatter->quoteIdentifier($str, $checkOption);
    }

    /**
     * quoteMultipleIdentifier
     * Quotes multiple identifier strings
     *
     * @param array $arr           identifiers array to be quoted
     * @param bool $checkOption     check the 'quote_identifier' option
     *
     * @return string               quoted identifier string
     */
    public function quoteMultipleIdentifier($arr, $checkOption = true)
    {
        foreach ($arr as $k => $v) {
            $arr[$k] = $this->quoteIdentifier($v, $checkOption);
        }

        return $arr;
    }

    /**
     * convertBooleans
     * some drivers need the boolean values to be converted into integers
     * when using DQL API
     *
     * This method takes care of that conversion
     *
     * @param array $item
     * @return void
     */
    public function convertBooleans($item)
    {
        return $this->formatter->convertBooleans($item);
    }

    /**
     * quote
     * quotes given input parameter
     *
     * @param mixed $input      parameter to be quoted
     * @param string $type
     * @return string
     */
    public function quote($input, $type = null)
    {
        return $this->formatter->quote($input, $type);
    }

    /**
     * Set the date/time format for the current connection
     *
     * @param string    time format
     *
     * @return void
     */
    public function setDateFormat($format = null)
    {
    }

    /**
     * fetchAll
     *
     * @param string $statement         sql query to be executed
     * @param array $params             prepared statement params
     * @return array
     */
    public function fetchAll($statement, array $params = array())
    {
        return $this->execute($statement, $params)->fetchAll(Doctrine_Core::FETCH_ASSOC);
    }

    /**
     * fetchOne
     *
     * @param string $statement         sql query to be executed
     * @param array $params             prepared statement params
     * @param int $colnum               0-indexed column number to retrieve
     * @return mixed
     */
    public function fetchOne($statement, array $params = array(), $colnum = 0)
    {
        return $this->execute($statement, $params)->fetchColumn($colnum);
    }

    /**
     * fetchRow
     *
     * @param string $statement         sql query to be executed
     * @param array $params             prepared statement params
     * @return array
     */
    public function fetchRow($statement, array $params = array())
    {
        return $this->execute($statement, $params)->fetch(Doctrine_Core::FETCH_ASSOC);
    }

    /**
     * fetchArray
     *
     * @param string $statement         sql query to be executed
     * @param array $params             prepared statement params
     * @return array
     */
    public function fetchArray($statement, array $params = array())
    {
        return $this->execute($statement, $params)->fetch(Doctrine_Core::FETCH_NUM);
    }

    /**
     * fetchColumn
     *
     * @param string $statement         sql query to be executed
     * @param array $params             prepared statement params
     * @param int $colnum               0-indexed column number to retrieve
     * @return array
     */
    public function fetchColumn($statement, array $params = array(), $colnum = 0)
    {
        return $this->execute($statement, $params)->fetchAll(Doctrine_Core::FETCH_COLUMN, $colnum);
    }

    /**
     * fetchAssoc
     *
     * @param string $statement         sql query to be executed
     * @param array $params             prepared statement params
     * @return array
     */
    public function fetchAssoc($statement, array $params = array())
    {
        return $this->execute($statement, $params)->fetchAll(Doctrine_Core::FETCH_ASSOC);
    }

    /**
     * fetchBoth
     *
     * @param string $statement         sql query to be executed
     * @param array $params             prepared statement params
     * @return array
     */
    public function fetchBoth($statement, array $params = array())
    {
        return $this->execute($statement, $params)->fetchAll(Doctrine_Core::FETCH_BOTH);
    }

    /**
     * query
     * queries the database using Doctrine Query Language
     * returns a collection of Doctrine_Record objects
     *
     * <code>
     * $users = $conn->query('SELECT u.* FROM User u');
     *
     * $users = $conn->query('SELECT u.* FROM User u WHERE u.name LIKE ?', array('someone'));
     * </code>
     *
     * @param string $query             DQL query
     * @param array $params             query parameters
     * @param int $hydrationMode        Doctrine_Core::HYDRATE_ARRAY or Doctrine_Core::HYDRATE_RECORD
     * @see Doctrine_Query
     * @return Doctrine_Collection      Collection of Doctrine_Record objects
     */
    public function query($query, array $params = array(), $hydrationMode = null)
    {
        $parser = Doctrine_Query::create($this);
        $res = $parser->query($query, $params, $hydrationMode);
        $parser->free();

        return $res;
    }

    /**
     * prepare
     *
     * @param string $statement
     */
    public function prepare($statement)
    {
        $this->connect();

        try {
            $event = new Doctrine_Event($this, Doctrine_Event::CONN_PREPARE, $statement);

            $this->getAttribute(Doctrine_Core::ATTR_LISTENER)->prePrepare($event);

            $stmt = false;

            if ( ! $event->skipOperation) {
                $stmt = $this->dbh->prepare($statement);
            }

            $this->getAttribute(Doctrine_Core::ATTR_LISTENER)->postPrepare($event);

            return new Doctrine_Connection_Statement($this, $stmt);
        } catch(Doctrine_Adapter_Exception $e) {
        } catch(PDOException $e) { }

        $this->rethrowException($e, $this, $statement);
    }

    /**
     * query
     * queries the database using Doctrine Query Language and returns
     * the first record found
     *
     * <code>
     * $user = $conn->queryOne('SELECT u.* FROM User u WHERE u.id = ?', array(1));
     *
     * $user = $conn->queryOne('SELECT u.* FROM User u WHERE u.name LIKE ? AND u.password = ?',
     *         array('someone', 'password')
     *         );
     * </code>
     *
     * @param string $query             DQL query
     * @param array $params             query parameters
     * @see Doctrine_Query
     * @return Doctrine_Record|false    Doctrine_Record object on success,
     *                                  boolean false on failure
     */
    public function queryOne($query, array $params = array())
    {
        $parser = Doctrine_Query::create();

        $coll = $parser->query($query, $params);
        if ( ! $coll->contains(0)) {
            return false;
        }
        return $coll[0];
    }

    /**
     * queries the database with limit and offset
     * added to the query and returns a Doctrine_Connection_Statement object
     *
     * @param string $query
     * @param integer $limit
     * @param integer $offset
     * @return Doctrine_Connection_Statement
     */
    public function select($query, $limit = 0, $offset = 0)
    {
        if ($limit > 0 || $offset > 0) {
            $query = $this->modifyLimitQuery($query, $limit, $offset);
        }
        return $this->execute($query);
    }

    /**
     * standaloneQuery
     *
     * @param string $query     sql query
     * @param array $params     query parameters
     *
     * @return PDOStatement|Doctrine_Adapter_Statement
     */
    public function standaloneQuery($query, $params = array())
    {
        return $this->execute($query, $params);
    }

    /**
     * execute
     * @param string $query     sql query
     * @param array $params     query parameters
     *
     * @return PDOStatement|Doctrine_Adapter_Statement
     */
    public function execute($query, array $params = array())
    {
        $this->connect();

        try {
            if ( ! empty($params)) {
                $stmt = $this->prepare($query);
                $stmt->execute($params);

                return $stmt;
            } else {
                $event = new Doctrine_Event($this, Doctrine_Event::CONN_QUERY, $query, $params);

                $this->getAttribute(Doctrine_Core::ATTR_LISTENER)->preQuery($event);

                if ( ! $event->skipOperation) {
                    $stmt = $this->dbh->query($query);
                    $this->_count++;
                }
                $this->getAttribute(Doctrine_Core::ATTR_LISTENER)->postQuery($event);

                return $stmt;
            }
        } catch (Doctrine_Adapter_Exception $e) {
        } catch (PDOException $e) { }

        $this->rethrowException($e, $this, $query);
    }

    /**
     * exec
     * @param string $query     sql query
     * @param array $params     query parameters
     *
     * @return integer
     */
    public function exec($query, array $params = array())
    {
        $this->connect();

        try {
            if ( ! empty($params)) {
                $stmt = $this->prepare($query);
                $stmt->execute($params);

                return $stmt->rowCount();
            } else {
                $event = new Doctrine_Event($this, Doctrine_Event::CONN_EXEC, $query, $params);

                $this->getAttribute(Doctrine_Core::ATTR_LISTENER)->preExec($event);
                if ( ! $event->skipOperation) {
                    $count = $this->dbh->exec($query);

                    $this->_count++;
                }
                $this->getAttribute(Doctrine_Core::ATTR_LISTENER)->postExec($event);

                return $count;
            }
        } catch (Doctrine_Adapter_Exception $e) {
        } catch (PDOException $e) { }

        $this->rethrowException($e, $this, $query);
    }

    /**
     * rethrowException
     *
     * @throws Doctrine_Connection_Exception
     */
    public function rethrowException(Exception $e, $invoker, $query = null)
    {
        $event = new Doctrine_Event($this, Doctrine_Event::CONN_ERROR);

        $this->getListener()->preError($event);

        $name = 'Doctrine_Connection_' . $this->driverName . '_Exception';

        $message = $e->getMessage();
        if ($query) {
            $message .= sprintf('. Failing Query: "%s"', $query);
        }

        $exc  = new $name($message, (int) $e->getCode());
        if ( ! isset($e->errorInfo) || ! is_array($e->errorInfo)) {
            $e->errorInfo = array(null, null, null, null);
        }
        $exc->processErrorInfo($e->errorInfo);

         if ($this->getAttribute(Doctrine_Core::ATTR_THROW_EXCEPTIONS)) {
            throw $exc;
        }

        $this->getListener()->postError($event);
    }

    /**
     * hasTable
     * whether or not this connection has table $name initialized
     *
     * @param mixed $name
     * @return boolean
     */
    public function hasTable($name)
    {
        return isset($this->tables[$name]);
    }

    /**
     * returns a table object for given component name
     *
     * @param string $name              component name
     * @return Doctrine_Table
     */
    public function getTable($name)
    {
        if (isset($this->tables[$name])) {
            return $this->tables[$name];
        }

        $class = sprintf($this->getAttribute(Doctrine_Core::ATTR_TABLE_CLASS_FORMAT), $name);

        if (class_exists($class, $this->getAttribute(Doctrine_Core::ATTR_AUTOLOAD_TABLE_CLASSES)) &&
                in_array('Doctrine_Table', class_parents($class))) {
            $table = new $class($name, $this, true);
        } else {
            $tableClass = $this->getAttribute(Doctrine_Core::ATTR_TABLE_CLASS);
            $table = new $tableClass($name, $this, true);
        }

        return $table;
    }

    /**
     * returns an array of all initialized tables
     *
     * @return array
     */
    public function getTables()
    {
        return $this->tables;
    }

    /**
     * returns an iterator that iterators through all
     * initialized table objects
     *
     * <code>
     * foreach ($conn as $index => $table) {
     *      print $table;  // get a string representation of each table object
     * }
     * </code>
     *
     * @return ArrayIterator        SPL ArrayIterator object
     */
    public function getIterator()
    {
        return new ArrayIterator($this->tables);
    }

    /**
     * returns the count of initialized table objects
     *
     * @return integer
     */
    public function count()
    {
        return $this->_count;
    }

    /**
     * addTable
     * adds a Doctrine_Table object into connection registry
     *
     * @param $table                a Doctrine_Table object to be added into registry
     * @return boolean
     */
    public function addTable(Doctrine_Table $table)
    {
        $name = $table->getComponentName();

        if (isset($this->tables[$name])) {
            return false;
        }
        $this->tables[$name] = $table;
        return true;
    }

    /**
     * create
     * creates a record
     *
     * create                       creates a record
     * @param string $name          component name
     * @return Doctrine_Record      Doctrine_Record object
     */
    public function create($name)
    {
        return $this->getTable($name)->create();
    }

    /**
     * Creates a new Doctrine_Query object that operates on this connection.
     *
     * @return Doctrine_Query
     */
    public function createQuery()
    {
        return Doctrine_Query::create();
    }

    /**
     * flush
     * saves all the records from all tables
     * this operation is isolated using a transaction
     *
     * @throws PDOException         if something went wrong at database level
     * @return void
     */
    public function flush()
    {
        try {
            $this->beginInternalTransaction();
            $this->unitOfWork->saveAll();
            $this->commit();
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * clear
     * clears all repositories
     *
     * @return void
     */
    public function clear()
    {
        foreach ($this->tables as $k => $table) {
            $table->getRepository()->evictAll();
            $table->clear();
        }
    }

    /**
     * evictTables
     * evicts all tables
     *
     * @return void
     */
    public function evictTables()
    {
        $this->tables = array();
        $this->exported = array();
    }

    /**
     * close
     * closes the connection
     *
     * @return void
     */
    public function close()
    {
        $event = new Doctrine_Event($this, Doctrine_Event::CONN_CLOSE);

        $this->getAttribute(Doctrine_Core::ATTR_LISTENER)->preClose($event);

        $this->clear();

        unset($this->dbh);
        $this->isConnected = false;

        $this->getAttribute(Doctrine_Core::ATTR_LISTENER)->postClose($event);
    }

    /**
     * get the current transaction nesting level
     *
     * @return integer
     */
    public function getTransactionLevel()
    {
        return $this->transaction->getTransactionLevel();
    }

    /**
     * errorCode
     * Fetch the SQLSTATE associated with the last operation on the database handle
     *
     * @return integer
     */
    public function errorCode()
    {
        $this->connect();

        return $this->dbh->errorCode();
    }

    /**
     * errorInfo
     * Fetch extended error information associated with the last operation on the database handle
     *
     * @return array
     */
    public function errorInfo()
    {
        $this->connect();

        return $this->dbh->errorInfo();
    }

    /**
     * getResultCacheDriver
     *
     * @return Doctrine_Cache_Interface
     */
    public function getResultCacheDriver()
    {
        if ( ! $this->getAttribute(Doctrine_Core::ATTR_RESULT_CACHE)) {
            throw new Doctrine_Exception('Result Cache driver not initialized.');
        }

        return $this->getAttribute(Doctrine_Core::ATTR_RESULT_CACHE);
    }

    /**
     * getQueryCacheDriver
     *
     * @return Doctrine_Cache_Interface
     */
    public function getQueryCacheDriver()
    {
        if ( ! $this->getAttribute(Doctrine_Core::ATTR_QUERY_CACHE)) {
            throw new Doctrine_Exception('Query Cache driver not initialized.');
        }

        return $this->getAttribute(Doctrine_Core::ATTR_QUERY_CACHE);
    }

    /**
     * lastInsertId
     *
     * Returns the ID of the last inserted row, or the last value from a sequence object,
     * depending on the underlying driver.
     *
     * Note: This method may not return a meaningful or consistent result across different drivers,
     * because the underlying database may not even support the notion of auto-increment fields or sequences.
     *
     * @param string $table     name of the table into which a new row was inserted
     * @param string $field     name of the field into which a new row was inserted
     */
    public function lastInsertId($table = null, $field = null)
    {
        return $this->sequence->lastInsertId($table, $field);
    }

    /**
     * beginTransaction
     * Start a transaction or set a savepoint.
     *
     * if trying to set a savepoint and there is no active transaction
     * a new transaction is being started
     *
     * Listeners: onPreTransactionBegin, onTransactionBegin
     *
     * @param string $savepoint                 name of a savepoint to set
     * @throws Doctrine_Transaction_Exception   if the transaction fails at database level
     * @return integer                          current transaction nesting level
     */
    public function beginTransaction($savepoint = null)
    {
        return $this->transaction->beginTransaction($savepoint);
    }

    public function beginInternalTransaction($savepoint = null)
    {
        return $this->transaction->beginInternalTransaction($savepoint);
    }

    /**
     * commit
     * Commit the database changes done during a transaction that is in
     * progress or release a savepoint. This function may only be called when
     * auto-committing is disabled, otherwise it will fail.
     *
     * Listeners: onPreTransactionCommit, onTransactionCommit
     *
     * @param string $savepoint                 name of a savepoint to release
     * @throws Doctrine_Transaction_Exception   if the transaction fails at PDO level
     * @throws Doctrine_Validator_Exception     if the transaction fails due to record validations
     * @return boolean                          false if commit couldn't be performed, true otherwise
     */
    public function commit($savepoint = null)
    {
        return $this->transaction->commit($savepoint);
    }

    /**
     * rollback
     * Cancel any database changes done during a transaction or since a specific
     * savepoint that is in progress. This function may only be called when
     * auto-committing is disabled, otherwise it will fail. Therefore, a new
     * transaction is implicitly started after canceling the pending changes.
     *
     * this method can be listened with onPreTransactionRollback and onTransactionRollback
     * eventlistener methods
     *
     * @param string $savepoint                 name of a savepoint to rollback to
     * @throws Doctrine_Transaction_Exception   if the rollback operation fails at database level
     * @return boolean                          false if rollback couldn't be performed, true otherwise
     */
    public function rollback($savepoint = null)
    {
        return $this->transaction->rollback($savepoint);
    }

    /**
     * createDatabase
     *
     * Issue create database command for this instance of Doctrine_Connection
     *
     * @return string       Doctrine_Exception catched in case of failure
     */
    public function createDatabase()
    {
        if ( ! $dsn = $this->getOption('dsn')) {
            throw new Doctrine_Connection_Exception('You must create your Doctrine_Connection by using a valid Doctrine style dsn in order to use the create/drop database functionality');
        }

        // Parse pdo dsn so we are aware of the connection information parts
        $info = $this->getManager()->parsePdoDsn($dsn);

        // Get the temporary connection to issue the create database command
        $tmpConnection = $this->getTmpConnection($info);

        // Catch any exceptions and delay the throwing of it so we can close
        // the tmp connection
        try {
            $tmpConnection->export->createDatabase($info['dbname']);
        } catch (Exception $e) {}

        // Close the temporary connection used to issue the drop database command
        $this->getManager()->closeConnection($tmpConnection);

        if (isset($e)) {
            throw $e;
        }
    }

    /**
     * dropDatabase
     *
     * Issue drop database command for this instance of Doctrine_Connection
     *
     * @return string       success string. Doctrine_Exception if operation failed
     */
    public function dropDatabase()
    {
        if ( ! $dsn = $this->getOption('dsn')) {
            throw new Doctrine_Connection_Exception('You must create your Doctrine_Connection by using a valid Doctrine style dsn in order to use the create/drop database functionality');
        }

        // Parse pdo dsn so we are aware of the connection information parts
        $info = $this->getManager()->parsePdoDsn($dsn);

        // Get the temporary connection to issue the drop database command
        $tmpConnection = $this->getTmpConnection($info);

        // Catch any exceptions and delay the throwing of it so we can close
        // the tmp connection
        try {
            $tmpConnection->export->dropDatabase($info['dbname']);
        } catch (Exception $e) {}

        // Close the temporary connection used to issue the drop database command
        $this->getManager()->closeConnection($tmpConnection);


        if (isset($e)) {
            throw $e;
        }
    }

    /**
     * getTmpConnection
     *
     * Create a temporary connection to the database with the user credentials.
     * This is so the user can make a connection to a db server. Some dbms allow
     * connections with no database, but some do not. In that case we have a table
     * which is always guaranteed to exist. Mysql: 'mysql', PostgreSQL: 'postgres', etc.
     * This value is set in the Doctrine_Export_{DRIVER} classes if required
     *
     * @param string $info
     * @return void
     */
    public function getTmpConnection($info)
    {
        $pdoDsn = $info['scheme'] . ':';

        if ($info['unix_socket']) {
            $pdoDsn .= 'unix_socket=' . $info['unix_socket'] . ';';
        }

        $pdoDsn .= 'host=' . $info['host'];

        if ($info['port']) {
            $pdoDsn .= ';port=' . $info['port'];
        }

        if (isset($this->export->tmpConnectionDatabase) && $this->export->tmpConnectionDatabase) {
            $pdoDsn .= ';dbname=' . $this->export->tmpConnectionDatabase;
        }

        $username = $this->getOption('username');
        $password = $this->getOption('password');

        $conn = $this->getManager()->openConnection(array($pdoDsn, $username, $password), 'doctrine_tmp_connection', false);
        $conn->setOption('username', $username);
        $conn->setOption('password', $password);

        return $conn;
    }

    /**
     * modifyLimitQuery
     *
     * Some dbms require specific functionality for this. Check the other connection adapters for examples
     *
     * @return string
     */
    public function modifyLimitQuery($query, $limit = false, $offset = false, $isManip = false)
    {
        return $query;
    }

    /**
     * Creates dbms specific LIMIT/OFFSET SQL for the subqueries that are used in the
     * context of the limit-subquery algorithm.
     *
     * @return string
     */
    public function modifyLimitSubquery(Doctrine_Table $rootTable, $query, $limit = false,
            $offset = false, $isManip = false)
    {
        return $this->modifyLimitQuery($query, $limit, $offset, $isManip);
    }

    /**
     * returns a string representation of this object
     * @return string
     */
    public function __toString()
    {
        return Doctrine_Lib::getConnectionAsString($this);
    }

    /**
     * Serialize. Remove database connection(pdo) since it cannot be serialized
     *
     * @return string $serialized
     */
    public function serialize()
    {
        $vars = get_object_vars($this);
        $vars['dbh'] = null;
        $vars['isConnected'] = false;
        return serialize($vars);
    }

    /**
     * Unserialize. Recreate connection from serialized content
     *
     * @param string $serialized
     * @return void
     */
    public function unserialize($serialized)
    {
        $array = unserialize($serialized);

        foreach ($array as $name => $values) {
            $this->$name = $values;
        }
    }

    /**
     * Get/generate a unique foreign key name for a relationship
     *
     * @param  Doctrine_Relation $relation  Relation object to generate the foreign key name for
     * @return string $fkName
     */
    public function generateUniqueRelationForeignKeyName(Doctrine_Relation $relation)
    {
        $parts = array(
            $relation['localTable']->getTableName(),
            $relation->getLocalColumnName(),
            $relation['table']->getTableName(),
            $relation->getForeignColumnName(),
        );
        $key = implode('_', array_merge($parts, array($relation['onDelete']), array($relation['onUpdate'])));
        $format = $this->getAttribute(Doctrine_Core::ATTR_FKNAME_FORMAT);

        return $this->_generateUniqueName('foreign_keys', $parts, $key, $format, $this->getAttribute(Doctrine_Core::ATTR_MAX_IDENTIFIER_LENGTH));
    }

    /**
     * Get/generate unique index name for a table name and set of fields
     *
     * @param string $tableName     The name of the table the index exists
     * @param string $fields        The fields that makes up the index
     * @return string $indexName    The name of the generated index
     */
    public function generateUniqueIndexName($tableName, $fields)
    {
        $fields = (array) $fields;
        $parts = array($tableName);
        $parts = array_merge($parts, $fields);
        $key = implode('_', $parts);
        $format = $this->getAttribute(Doctrine_Core::ATTR_IDXNAME_FORMAT);

        return $this->_generateUniqueName('indexes', $parts, $key, $format, $this->getAttribute(Doctrine_Core::ATTR_MAX_IDENTIFIER_LENGTH));
    }

    protected function _generateUniqueName($type, $parts, $key, $format = '%s', $maxLength = null)
    {
        if (isset($this->_usedNames[$type][$key])) {
            return $this->_usedNames[$type][$key];
        }
        if ($maxLength === null) {
          $maxLength = $this->properties['max_identifier_length'];
        }

        $generated = implode('_', $parts);

        // If the final length is greater than 64 we need to create an abbreviated fk name
        if (strlen(sprintf($format, $generated)) > $maxLength) {
            $generated = '';

            foreach ($parts as $part) {
                $generated .= $part[0];
            }

            $name = $generated;
        } else {
            $name = $generated;
        }

        while (in_array($name, $this->_usedNames[$type])) {
            $e = explode('_', $name);
            $end = end($e);

            if (is_numeric($end)) {
                unset($e[count($e) - 1]);
                $fkName = implode('_', $e);
                $name = $fkName . '_' . ++$end;
            } else {
                $name .= '_1';
            }
        }

        $this->_usedNames[$type][$key] = $name;

        return $name;
    }
}