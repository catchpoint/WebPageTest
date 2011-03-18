<?php
/*
 *  $Id: Manager.php 7490 2010-03-29 19:53:27Z jwage $
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
 *
 * Doctrine_Manager is the base component of all doctrine based projects.
 * It opens and keeps track of all connections (database connections).
 *
 * @package     Doctrine
 * @subpackage  Manager
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Manager extends Doctrine_Configurable implements Countable, IteratorAggregate
{
    /**
     * @var array $connections          an array containing all the opened connections
     */
    protected $_connections   = array();

    /**
     * @var array $bound                an array containing all components that have a bound connection
     */
    protected $_bound         = array();

    /**
     * @var integer $index              the incremented index
     */
    protected $_index         = 0;

    /**
     * @var integer $currIndex          the current connection index
     */
    protected $_currIndex     = 0;

    /**
     * @var Doctrine_Query_Registry     the query registry
     */
    protected $_queryRegistry;

    /**
     * @var array                       Array of registered validators
     */
    protected $_validators = array();

    /**
     * @var array                       Array of registered hydrators
     */
    protected $_hydrators = array(
        Doctrine_Core::HYDRATE_ARRAY            => 'Doctrine_Hydrator_ArrayDriver',
        Doctrine_Core::HYDRATE_RECORD           => 'Doctrine_Hydrator_RecordDriver',
        Doctrine_Core::HYDRATE_NONE             => 'Doctrine_Hydrator_NoneDriver',
        Doctrine_Core::HYDRATE_SCALAR           => 'Doctrine_Hydrator_ScalarDriver',
        Doctrine_Core::HYDRATE_SINGLE_SCALAR    => 'Doctrine_Hydrator_SingleScalarDriver',
        Doctrine_Core::HYDRATE_ON_DEMAND        => 'Doctrine_Hydrator_RecordDriver',
        Doctrine_Core::HYDRATE_ARRAY_HIERARCHY  => 'Doctrine_Hydrator_ArrayHierarchyDriver',
        Doctrine_Core::HYDRATE_RECORD_HIERARCHY => 'Doctrine_Hydrator_RecordHierarchyDriver',
    );

    protected $_connectionDrivers = array(
        'db2'      => 'Doctrine_Connection_Db2',
        'mysql'    => 'Doctrine_Connection_Mysql',
        'mysqli'   => 'Doctrine_Connection_Mysql',
        'sqlite'   => 'Doctrine_Connection_Sqlite',
        'pgsql'    => 'Doctrine_Connection_Pgsql',
        'oci'      => 'Doctrine_Connection_Oracle',
        'oci8'     => 'Doctrine_Connection_Oracle',
        'oracle'   => 'Doctrine_Connection_Oracle',
        'mssql'    => 'Doctrine_Connection_Mssql',
        'dblib'    => 'Doctrine_Connection_Mssql',
        'odbc'     => 'Doctrine_Connection_Mssql', 
        'mock'     => 'Doctrine_Connection_Mock'
    );

    protected $_extensions = array();

    /**
     * @var boolean                     Whether or not the validators from disk have been loaded
     */
    protected $_loadedValidatorsFromDisk = false;

    protected static $_instance;

    private $_initialized = false;

    /**
     * constructor
     *
     * this is private constructor (use getInstance to get an instance of this class)
     */
    private function __construct()
    {
        $null = new Doctrine_Null;
        Doctrine_Locator_Injectable::initNullObject($null);
        Doctrine_Record_Iterator::initNullObject($null);
    }

    /**
     * Sets default attributes values.
     *
     * This method sets default values for all null attributes of this 
     * instance. It is idempotent and can only be called one time. Subsequent 
     * calls does not alter the attribute values.
     *
     * @return boolean      true if inizialization was executed
     */
    public function setDefaultAttributes()
    {
        if ( ! $this->_initialized) {
            $this->_initialized = true;
            $attributes = array(
                        Doctrine_Core::ATTR_CACHE                        => null,
                        Doctrine_Core::ATTR_RESULT_CACHE                 => null,
                        Doctrine_Core::ATTR_QUERY_CACHE                  => null,
                        Doctrine_Core::ATTR_LOAD_REFERENCES              => true,
                        Doctrine_Core::ATTR_LISTENER                     => new Doctrine_EventListener(),
                        Doctrine_Core::ATTR_RECORD_LISTENER              => new Doctrine_Record_Listener(),
                        Doctrine_Core::ATTR_THROW_EXCEPTIONS             => true,
                        Doctrine_Core::ATTR_VALIDATE                     => Doctrine_Core::VALIDATE_NONE,
                        Doctrine_Core::ATTR_QUERY_LIMIT                  => Doctrine_Core::LIMIT_RECORDS,
                        Doctrine_Core::ATTR_IDXNAME_FORMAT               => "%s_idx",
                        Doctrine_Core::ATTR_SEQNAME_FORMAT               => "%s_seq",
                        Doctrine_Core::ATTR_TBLNAME_FORMAT               => "%s",
                        Doctrine_Core::ATTR_FKNAME_FORMAT                => "%s",
                        Doctrine_Core::ATTR_QUOTE_IDENTIFIER             => false,
                        Doctrine_Core::ATTR_SEQCOL_NAME                  => 'id',
                        Doctrine_Core::ATTR_PORTABILITY                  => Doctrine_Core::PORTABILITY_NONE,
                        Doctrine_Core::ATTR_EXPORT                       => Doctrine_Core::EXPORT_ALL,
                        Doctrine_Core::ATTR_DECIMAL_PLACES               => 2,
                        Doctrine_Core::ATTR_DEFAULT_PARAM_NAMESPACE      => 'doctrine',
                        Doctrine_Core::ATTR_AUTOLOAD_TABLE_CLASSES       => false,
                        Doctrine_Core::ATTR_USE_DQL_CALLBACKS            => false,
                        Doctrine_Core::ATTR_AUTO_ACCESSOR_OVERRIDE       => false,
                        Doctrine_Core::ATTR_AUTO_FREE_QUERY_OBJECTS      => false,
                        Doctrine_Core::ATTR_DEFAULT_IDENTIFIER_OPTIONS   => array(),
                        Doctrine_Core::ATTR_DEFAULT_COLUMN_OPTIONS       => array(),
                        Doctrine_Core::ATTR_HYDRATE_OVERWRITE            => true,
                        Doctrine_Core::ATTR_QUERY_CLASS                  => 'Doctrine_Query',
                        Doctrine_Core::ATTR_COLLECTION_CLASS             => 'Doctrine_Collection',
                        Doctrine_Core::ATTR_TABLE_CLASS                  => 'Doctrine_Table',
                        Doctrine_Core::ATTR_CASCADE_SAVES                => true,
                        Doctrine_Core::ATTR_TABLE_CLASS_FORMAT           => '%sTable'
                        ); 
            foreach ($attributes as $attribute => $value) {
                $old = $this->getAttribute($attribute);
                if ($old === null) {
                    $this->setAttribute($attribute,$value);
                }
            }
            return true;
        }
        return false;
    }

    /**
     * Returns an instance of this class
     * (this class uses the singleton pattern)
     *
     * @return Doctrine_Manager
     */
    public static function getInstance()
    {
        if ( ! isset(self::$_instance)) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    /**
     * Reset the internal static instance
     *
     * @return void
     */
    public static function resetInstance()
    {
        if (self::$_instance) {
            self::$_instance->reset();
            self::$_instance = null;
        }
    }

    /**
     * Reset this instance of the manager
     *
     * @return void
     */
    public function reset()
    {
        foreach ($this->_connections as $conn) {
            $conn->close();
        }
        $this->_connections = array();
        $this->_queryRegistry = null;
        $this->_extensions = array();
        $this->_bound = array();
        $this->_validators = array();
        $this->_loadedValidatorsFromDisk = false;
        $this->_index = 0;
        $this->_currIndex = 0;
        $this->_initialized = false;
    }

    /**
     * Lazy-initializes the query registry object and returns it
     *
     * @return Doctrine_Query_Registry
     */
    public function getQueryRegistry()
    {
      	if ( ! isset($this->_queryRegistry)) {
      	   $this->_queryRegistry = new Doctrine_Query_Registry();
      	}
        return $this->_queryRegistry;
    }

    /**
     * Sets the query registry
     *
     * @return Doctrine_Manager     this object
     */
    public function setQueryRegistry(Doctrine_Query_Registry $registry)
    {
        $this->_queryRegistry = $registry;
        
        return $this;
    }

    /**
     * Open a new connection. If the adapter parameter is set this method acts as
     * a short cut for Doctrine_Manager::getInstance()->openConnection($adapter, $name);
     *
     * if the adapter paramater is not set this method acts as
     * a short cut for Doctrine_Manager::getInstance()->getCurrentConnection()
     *
     * @param PDO|Doctrine_Adapter_Interface $adapter   database driver
     * @param string $name                              name of the connection, if empty numeric key is used
     * @throws Doctrine_Manager_Exception               if trying to bind a connection with an existing name
     * @return Doctrine_Connection
     */
    public static function connection($adapter = null, $name = null)
    {
        if ($adapter == null) {
            return Doctrine_Manager::getInstance()->getCurrentConnection();
        } else {
            return Doctrine_Manager::getInstance()->openConnection($adapter, $name);
        }
    }

    /**
     * Opens a new connection and saves it to Doctrine_Manager->connections
     *
     * @param PDO|Doctrine_Adapter_Interface $adapter   database driver
     * @param string $name                              name of the connection, if empty numeric key is used
     * @throws Doctrine_Manager_Exception               if trying to bind a connection with an existing name
     * @throws Doctrine_Manager_Exception               if trying to open connection for unknown driver
     * @return Doctrine_Connection
     */
    public function openConnection($adapter, $name = null, $setCurrent = true)
    {
        if (is_object($adapter)) {
            if ( ! ($adapter instanceof PDO) && ! in_array('Doctrine_Adapter_Interface', class_implements($adapter))) {
                throw new Doctrine_Manager_Exception("First argument should be an instance of PDO or implement Doctrine_Adapter_Interface");
            }

            $driverName = $adapter->getAttribute(Doctrine_Core::ATTR_DRIVER_NAME);
        } else if (is_array($adapter)) {
            if ( ! isset($adapter[0])) {
                throw new Doctrine_Manager_Exception('Empty data source name given.');
            }
            $e = explode(':', $adapter[0]);

            if ($e[0] == 'uri') {
                $e[0] = 'odbc';
            }

            $parts['dsn']    = $adapter[0];
            $parts['scheme'] = $e[0];
            $parts['user']   = (isset($adapter[1])) ? $adapter[1] : null;
            $parts['pass']   = (isset($adapter[2])) ? $adapter[2] : null;
            $driverName = $e[0];
            $adapter = $parts;
        } else {
            $parts = $this->parseDsn($adapter);
            $driverName = $parts['scheme'];
            $adapter = $parts;
        }

        // Decode adapter information
        if (is_array($adapter)) {
            foreach ($adapter as $key => $value) {
                $adapter[$key]  = $value ? urldecode($value):null;
            }
        }

        // initialize the default attributes
        $this->setDefaultAttributes();

        if ($name !== null) {
            $name = (string) $name;
            if (isset($this->_connections[$name])) {
                if ($setCurrent) {
                    $this->_currIndex = $name;
                }
                return $this->_connections[$name];
            }
        } else {
            $name = $this->_index;
            $this->_index++;
        }

        if ( ! isset($this->_connectionDrivers[$driverName])) {
            throw new Doctrine_Manager_Exception('Unknown driver ' . $driverName);
        }

        $className = $this->_connectionDrivers[$driverName];
        $conn = new $className($this, $adapter);
        $conn->setName($name);

        $this->_connections[$name] = $conn;

        if ($setCurrent) {
            $this->_currIndex = $name;
        }
        return $this->_connections[$name];
    }
    
    /**
     * Parse a pdo style dsn in to an array of parts
     *
     * @param array $dsn An array of dsn information
     * @return array The array parsed
     * @todo package:dbal
     */
    public function parsePdoDsn($dsn)
    {
        $parts = array();

        $names = array('dsn', 'scheme', 'host', 'port', 'user', 'pass', 'path', 'query', 'fragment', 'unix_socket');

        foreach ($names as $name) {
            if ( ! isset($parts[$name])) {
                $parts[$name] = null;
            }
        }

        $e = explode(':', $dsn);
        $parts['scheme'] = $e[0];
        $parts['dsn'] = $dsn;

        $e = explode(';', $e[1]);
        foreach ($e as $string) {
            if ($string) {
                $e2 = explode('=', $string);

                if (isset($e2[0]) && isset($e2[1])) {
                    if (count($e2) > 2)
                    {
                        $key = $e2[0];
                        unset($e2[0]);
                        $value = implode('=', $e2);
                    } else {
                        list($key, $value) = $e2;
                    }
                    $parts[$key] = $value;
                }
            }
        }

        return $parts;
    }

    /**
     * Build the blank dsn parts array used with parseDsn()
     *
     * @see parseDsn()
     * @param string $dsn 
     * @return array $parts
     */
    protected function _buildDsnPartsArray($dsn)
    {
        // fix sqlite dsn so that it will parse correctly
        $dsn = str_replace("////", "/", $dsn);
        $dsn = str_replace("\\", "/", $dsn);
        $dsn = preg_replace("/\/\/\/(.*):\//", "//$1:/", $dsn);

        // silence any warnings
        $parts = @parse_url($dsn);

        $names = array('dsn', 'scheme', 'host', 'port', 'user', 'pass', 'path', 'query', 'fragment', 'unix_socket');

        foreach ($names as $name) {
            if ( ! isset($parts[$name])) {
                $parts[$name] = null;
            }
        }

        if (count($parts) == 0 || ! isset($parts['scheme'])) {
            throw new Doctrine_Manager_Exception('Could not parse dsn');
        }

        return $parts;
    }

    /**
     * Parse a Doctrine style dsn string in to an array of parts
     *
     * @param string $dsn
     * @return array Parsed contents of DSN
     * @todo package:dbal
     */
    public function parseDsn($dsn)
    {
        $parts = $this->_buildDsnPartsArray($dsn);

        switch ($parts['scheme']) {
            case 'sqlite':
            case 'sqlite2':
            case 'sqlite3':
                if (isset($parts['host']) && $parts['host'] == ':memory') {
                    $parts['database'] = ':memory:';
                    $parts['dsn']      = 'sqlite::memory:';
                } else {
                    //fix windows dsn we have to add host: to path and set host to null
                    if (isset($parts['host'])) {
                        $parts['path'] = $parts['host'] . ":" . $parts["path"];
                        $parts['host'] = null;
                    }
                    $parts['database'] = $parts['path'];
                    $parts['dsn'] = $parts['scheme'] . ':' . $parts['path'];
                }

                break;

            case 'mssql':
            case 'dblib':
                if ( ! isset($parts['path']) || $parts['path'] == '/') {
                    throw new Doctrine_Manager_Exception('No database available in data source name');
                }
                if (isset($parts['path'])) {
                    $parts['database'] = substr($parts['path'], 1);
                }
                if ( ! isset($parts['host'])) {
                    throw new Doctrine_Manager_Exception('No hostname set in data source name');
                }

                $parts['dsn'] = $parts['scheme'] . ':host='
                              . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port']:null) . ';dbname='
                              . $parts['database'];

                break;

            case 'mysql':
            case 'oci8':
            case 'oci':
            case 'pgsql':
            case 'odbc':
            case 'mock':
            case 'oracle':
                if ( ! isset($parts['path']) || $parts['path'] == '/') {
                    throw new Doctrine_Manager_Exception('No database available in data source name');
                }
                if (isset($parts['path'])) {
                    $parts['database'] = substr($parts['path'], 1);
                }
                if ( ! isset($parts['host'])) {
                    throw new Doctrine_Manager_Exception('No hostname set in data source name');
                }

                $parts['dsn'] = $parts['scheme'] . ':host='
                              . $parts['host'] . (isset($parts['port']) ? ';port=' . $parts['port']:null) . ';dbname='
                              . $parts['database'];

                break;
            default:
                $parts['dsn'] = $dsn;
        }

        return $parts;
    }

    /**
     * Get the connection instance for the passed name
     *
     * @param string $name                  name of the connection, if empty numeric key is used
     * @return Doctrine_Connection
     * @throws Doctrine_Manager_Exception   if trying to get a non-existent connection
     */
    public function getConnection($name)
    {
        if ( ! isset($this->_connections[$name])) {
            throw new Doctrine_Manager_Exception('Unknown connection: ' . $name);
        }

        return $this->_connections[$name];
    }

    /**
     * Get the name of the passed connection instance
     *
     * @param Doctrine_Connection $conn     connection object to be searched for
     * @return string                       the name of the connection
     */
    public function getConnectionName(Doctrine_Connection $conn)
    {
        return array_search($conn, $this->_connections, true);
    }

    /**
     * Binds given component to given connection
     * this means that when ever the given component uses a connection
     * it will be using the bound connection instead of the current connection
     *
     * @param string $componentName
     * @param string $connectionName
     * @return boolean
     */
    public function bindComponent($componentName, $connectionName)
    {
        $this->_bound[$componentName] = $connectionName;
    }

    /**
     * Get the connection instance for the specified component
     *
     * @param string $componentName
     * @return Doctrine_Connection
     */
    public function getConnectionForComponent($componentName)
    {
        Doctrine_Core::modelsAutoload($componentName);

        if (isset($this->_bound[$componentName])) {
            return $this->getConnection($this->_bound[$componentName]);
        }

        return $this->getCurrentConnection();
    }

    /**
     * Check if a component is bound to a connection
     *
     * @param string $componentName
     * @return boolean
     */
    public function hasConnectionForComponent($componentName = null)
    {
        return isset($this->_bound[$componentName]);
    }

    /**
     * Closes the specified connection
     *
     * @param Doctrine_Connection $connection
     * @return void
     */
    public function closeConnection(Doctrine_Connection $connection)
    {
        $connection->close();

        $key = array_search($connection, $this->_connections, true);

        if ($key !== false) {
            unset($this->_connections[$key]);

            if ($key === $this->_currIndex) {
                $key = key($this->_connections);
                $this->_currIndex = ($key !== null) ? $key : 0;
            }
        }

        unset($connection);
    }

    /**
     * Returns all opened connections
     *
     * @return array
     */
    public function getConnections()
    {
        return $this->_connections;
    }

    /**
     * Sets the current connection to $key
     *
     * @param mixed $key                        the connection key
     * @throws InvalidKeyException
     * @return void
     */
    public function setCurrentConnection($key)
    {
        $key = (string) $key;
        if ( ! isset($this->_connections[$key])) {
            throw new Doctrine_Manager_Exception("Connection key '$key' does not exist.");
        }
        $this->_currIndex = $key;
    }

    /**
     * Whether or not the manager contains specified connection
     *
     * @param mixed $key                        the connection key
     * @return boolean
     */
    public function contains($key)
    {
        return isset($this->_connections[$key]);
    }

    /**
     * Returns the number of opened connections
     *
     * @return integer
     */
    public function count()
    {
        return count($this->_connections);
    }

    /**
     * Returns an ArrayIterator that iterates through all connections
     *
     * @return ArrayIterator
     */
    public function getIterator()
    {
        return new ArrayIterator($this->_connections);
    }

    /**
     * Get the current connection instance
     *
     * @throws Doctrine_Connection_Exception       if there are no open connections
     * @return Doctrine_Connection
     */
    public function getCurrentConnection()
    {
        $i = $this->_currIndex;
        if ( ! isset($this->_connections[$i])) {
            throw new Doctrine_Connection_Exception('There is no open connection');
        }
        return $this->_connections[$i];
    }

    /**
     * Creates databases for all existing connections
     *
     * @param string $specifiedConnections Array of connections you wish to create the database for
     * @return void
     * @todo package:dbal
     */
    public function createDatabases($specifiedConnections = array())
    {
        if ( ! is_array($specifiedConnections)) {
            $specifiedConnections = (array) $specifiedConnections;
        }

        foreach ($this as $name => $connection) {
            if ( ! empty($specifiedConnections) && ! in_array($name, $specifiedConnections)) {
                continue;
            }

            $connection->createDatabase();
        }
    }

    /**
     * Drops databases for all existing connections
     *
     * @param string $specifiedConnections Array of connections you wish to drop the database for
     * @return void
     * @todo package:dbal
     */
    public function dropDatabases($specifiedConnections = array())
    {
        if ( ! is_array($specifiedConnections)) {
            $specifiedConnections = (array) $specifiedConnections;
        }

        foreach ($this as $name => $connection) {
            if ( ! empty($specifiedConnections) && ! in_array($name, $specifiedConnections)) {
                continue;
            }

            $connection->dropDatabase();
        }
    }

    /**
     * Returns a string representation of this object
     *
     * @return string
     */
    public function __toString()
    {
        $r[] = "<pre>";
        $r[] = "Doctrine_Manager";
        $r[] = "Connections : ".count($this->_connections);
        $r[] = "</pre>";
        return implode("\n",$r);
    }

    /**
     * Get available doctrine validators
     *
     * @return array $validators
     */
    public function getValidators()
    {
        if ( ! $this->_loadedValidatorsFromDisk) {
            $this->_loadedValidatorsFromDisk = true;

            $validators = array();

            $dir = Doctrine_Core::getPath() . DIRECTORY_SEPARATOR . 'Doctrine' . DIRECTORY_SEPARATOR . 'Validator';

            $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir), RecursiveIteratorIterator::LEAVES_ONLY);
            foreach ($files as $file) {
                $e = explode('.', $file->getFileName());

                if (end($e) == 'php') {
                    $name = strtolower($e[0]);

                    $validators[] = $name;
                }
            }

            $this->registerValidators($validators);
        }

        return $this->_validators;
    }

    /**
     * Register validators so that Doctrine is aware of them
     *
     * @param  mixed $validators Name of validator or array of validators
     * @return void
     */
    public function registerValidators($validators)
    {
        $validators = (array) $validators;
        foreach ($validators as $validator) {
            if ( ! in_array($validator, $this->_validators)) {
                $this->_validators[] = $validator;
            }
        }
    }

    /**
     * Register a new driver for hydration
     *
     * @return void
     */
    public function registerHydrator($name, $class)
    {
        $this->_hydrators[$name] = $class;
    }

    /**
     * Get all registered hydrators
     *
     * @return array $hydrators
     */
    public function getHydrators()
    {
        return $this->_hydrators;
    }

    /**
     * Register a custom connection driver
     *
     * @return void
     */
    public function registerConnectionDriver($name, $class)
    {
        $this->_connectionDrivers[$name] = $class;
    }

    /**
     * Get all the available connection drivers
     *
     * @return array $connectionDrivers
     */
    public function getConnectionDrivers()
    {
        return $this->_connectionsDrivers;
    }

    /**
     * Register a Doctrine extension for extensionsAutoload() method
     *
     * @param string $name 
     * @param string $path 
     * @return void
     */
    public function registerExtension($name, $path = null)
    {
        if (is_null($path)) {
            $path = Doctrine_Core::getExtensionsPath() . '/' . $name . '/lib';
        }
        $this->_extensions[$name] = $path;
    }

    /**
     * Get all registered Doctrine extensions
     *
     * @return $extensions
     */
    public function getExtensions()
    {
        return $this->_extensions;
    }
}