<?php
/*
 *  $Id: Table.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Table   represents a database table
 *                  each Doctrine_Table holds the information of foreignKeys and associations
 *
 *
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @package     Doctrine
 * @subpackage  Table
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @version     $Revision: 7490 $
 * @link        www.doctrine-project.org
 * @since       1.0
 * @method mixed findBy*(mixed $value) magic finders; @see __call()
 * @method mixed findOneBy*(mixed $value) magic finders; @see __call()
 */
class Doctrine_Table extends Doctrine_Configurable implements Countable
{
    /**
     * @var array $data                                 temporary data which is then loaded into Doctrine_Record::$_data
     */
    protected $_data             = array();

    /**
     * @var mixed $identifier   The field names of all fields that are part of the identifier/primary key
     */
    protected $_identifier = array();

    /**
     * @see Doctrine_Identifier constants
     * @var integer $identifierType                     the type of identifier this table uses
     */
    protected $_identifierType;

    /**
     * @var Doctrine_Connection $conn                   Doctrine_Connection object that created this table
     */
    protected $_conn;

    /**
     * @var array $identityMap                          first level cache
     */
    protected $_identityMap        = array();

    /**
     * @var Doctrine_Table_Repository $repository       record repository
     */
    protected $_repository;

    /**
     * @var array $columns                  an array of column definitions,
     *                                      keys are column names and values are column definitions
     *
     *                                      the definition array has atleast the following values:
     *
     *                                      -- type         the column type, eg. 'integer'
     *                                      -- length       the column length, eg. 11
     *
     *                                      additional keys:
     *                                      -- notnull      whether or not the column is marked as notnull
     *                                      -- values       enum values
     *                                      -- notblank     notblank validator + notnull constraint
     *                                      ... many more
     */
    protected $_columns          = array();

    /**
     * Array of unique sets of fields. These values are validated on save
     *
     * @var array $_uniques
     */
    protected $_uniques = array();

    /**
     * @var array $_fieldNames            an array of field names, used to look up field names
     *                                    from column names. Keys are column
     *                                    names and values are field names.
     *                                    Alias for columns are here.
     */
    protected $_fieldNames    = array();

    /**
     *
     * @var array $_columnNames             an array of column names
     *                                      keys are field names and values column names.
     *                                      used to look up column names from field names.
     *                                      this is the reverse lookup map of $_fieldNames.
     */
    protected $_columnNames = array();

    /**
     * @var integer $columnCount            cached column count, Doctrine_Record uses this column count in when
     *                                      determining its state
     */
    protected $columnCount;

    /**
     * @var boolean $hasDefaultValues       whether or not this table has default values
     */
    protected $hasDefaultValues;

    /**
     * @var array $options                  an array containing all options
     *
     *      -- name                         name of the component, for example component name of the GroupTable is 'Group'
     *
     *      -- parents                      the parent classes of this component
     *
     *      -- declaringClass               name of the table definition declaring class (when using inheritance the class
     *                                      that defines the table structure can be any class in the inheritance hierarchy,
     *                                      hence we need reflection to check out which class actually calls setTableDefinition)
     *
     *      -- tableName                    database table name, in most cases this is the same as component name but in some cases
     *                                      where one-table-multi-class inheritance is used this will be the name of the inherited table
     *
     *      -- sequenceName                 Some databases need sequences instead of auto incrementation primary keys,
     *                                      you can set specific sequence for your table by calling setOption('sequenceName', $seqName)
     *                                      where $seqName is the name of the desired sequence
     *
     *      -- enumMap                      enum value arrays
     *
     *      -- inheritanceMap               inheritanceMap is used for inheritance mapping, keys representing columns and values
     *                                      the column values that should correspond to child classes
     *
     *      -- type                         table type (mysql example: INNODB)
     *
     *      -- charset                      character set
     *
     *      -- foreignKeys                  the foreign keys of this table
     *
     *      -- checks                       the check constraints of this table, eg. 'price > dicounted_price'
     *
     *      -- collate                      collate attribute
     *
     *      -- indexes                      the index definitions of this table
     *
     *      -- treeImpl                     the tree implementation of this table (if any)
     *
     *      -- treeOptions                  the tree options
     *
     *      -- queryParts                   the bound query parts
     *
     *      -- versioning
     */
    protected $_options      = array('name'           => null,
                                     'tableName'      => null,
                                     'sequenceName'   => null,
                                     'inheritanceMap' => array(),
                                     'enumMap'        => array(),
                                     'type'           => null,
                                     'charset'        => null,
                                     'collate'        => null,
                                     'treeImpl'       => null,
                                     'treeOptions'    => array(),
                                     'indexes'        => array(),
                                     'parents'        => array(),
                                     'joinedParents'  => array(),
                                     'queryParts'     => array(),
                                     'versioning'     => null,
                                     'subclasses'     => array(),
                                     'orderBy'        => null
                                     );

    /**
     * @var Doctrine_Tree $tree                 tree object associated with this table
     */
    protected $_tree;

    /**
     * @var Doctrine_Relation_Parser $_parser   relation parser object
     */
    protected $_parser;

    /**
     * @see Doctrine_Template
     * @var array $_templates                   an array containing all templates attached to this table
     */
    protected $_templates   = array();

    /**
     * @see Doctrine_Record_Filter
     * @var array $_filters                     an array containing all record filters attached to this table
     */
    protected $_filters     = array();

    /**
     * @see Doctrine_Record_Generator
     * @var array $_generators                  an array containing all generators attached to this table
     */
    protected $_generators     = array();

    /**
     * Generator instance responsible for constructing this table
     *
     * @see Doctrine_Record_Generator
     * @var Doctrine_Record_Generator $generator
     */
    protected $_generator;

    /**
     * @var array $_invokedMethods              method invoker cache
     */
    protected $_invokedMethods = array();

    /**
     * @var Doctrine_Record $record             empty instance of the given model
     */
    protected $record;

    /**
     * the constructor
     *
     * @throws Doctrine_Connection_Exception    if there are no opened connections
     * @param string $name                      the name of the component
     * @param Doctrine_Connection $conn         the connection associated with this table
     * @param boolean $initDefinition           whether to init the in-memory schema
     */
    public function __construct($name, Doctrine_Connection $conn, $initDefinition = false)
    {
        $this->_conn = $conn;
        $this->_options['name'] = $name;
        
        $this->setParent($this->_conn);           
        $this->_conn->addTable($this);
        
        $this->_parser = new Doctrine_Relation_Parser($this);

        if ($charset = $this->getAttribute(Doctrine_Core::ATTR_DEFAULT_TABLE_CHARSET)) {
            $this->_options['charset'] = $charset;
        }
        if ($collate = $this->getAttribute(Doctrine_Core::ATTR_DEFAULT_TABLE_COLLATE)) {
            $this->_options['collate'] = $collate;
        }

        if ($initDefinition) {
            $this->record = $this->initDefinition();

            $this->initIdentifier();

            $this->record->setUp();

            // if tree, set up tree
            if ($this->isTree()) {
                $this->getTree()->setUp();
            }
        } else {
            if ( ! isset($this->_options['tableName'])) {
                $this->setTableName(Doctrine_Inflector::tableize($this->_options['name']));
            }
        }
        
        $this->_filters[]  = new Doctrine_Record_Filter_Standard();
        $this->_repository = new Doctrine_Table_Repository($this);

        $this->construct();
    }
    
    /**
     * Construct template method.
     * 
     * This method provides concrete Table classes with the possibility
     * to hook into the constructor procedure. It is called after the 
     * Doctrine_Table construction process is finished.
     *
     * @return void
     */
    public function construct()
    { }

    /**
     * Initializes the in-memory table definition.
     *
     * @param string $name
     */
    public function initDefinition()
    {
        $name = $this->_options['name'];
        if ( ! class_exists($name) || empty($name)) {
            throw new Doctrine_Exception("Couldn't find class " . $name);
        }
        $record = new $name($this);

        $names = array();

        $class = $name;

        // get parent classes

        do {
            if ($class === 'Doctrine_Record') {
                break;
            }

            $name = $class;
            $names[] = $name;
        } while ($class = get_parent_class($class));

        if ($class === false) {
            throw new Doctrine_Table_Exception('Class "' . $name . '" must be a child class of Doctrine_Record');
        }

        // reverse names
        $names = array_reverse($names);
        // save parents
        array_pop($names);
        $this->_options['parents'] = $names;

        // create database table
        if (method_exists($record, 'setTableDefinition')) {
            $record->setTableDefinition();
            // get the declaring class of setTableDefinition method
            $method = new ReflectionMethod($this->_options['name'], 'setTableDefinition');
            $class = $method->getDeclaringClass();

        } else {
            $class = new ReflectionClass($class);
        }

        $this->_options['joinedParents'] = array();

        foreach (array_reverse($this->_options['parents']) as $parent) {

            if ($parent === $class->getName()) {
                continue;
            }
            $ref = new ReflectionClass($parent);

            if ($ref->isAbstract() || ! $class->isSubClassOf($parent)) {
                continue;
            }
            $parentTable = $this->_conn->getTable($parent);

            $found = false;
            $parentColumns = $parentTable->getColumns();

            foreach ($parentColumns as $columnName => $definition) {
                if ( ! isset($definition['primary']) || $definition['primary'] === false) {
                    if (isset($this->_columns[$columnName])) {
                        $found = true;
                        break;
                    } else {
                        if ( ! isset($parentColumns[$columnName]['owner'])) {
                            $parentColumns[$columnName]['owner'] = $parentTable->getComponentName();
                        }

                        $this->_options['joinedParents'][] = $parentColumns[$columnName]['owner'];
                    }
                } else {
                    unset($parentColumns[$columnName]);
                }
            }

            if ($found) {
                continue;
            }

            foreach ($parentColumns as $columnName => $definition) {
                $fullName = $columnName . ' as ' . $parentTable->getFieldName($columnName);
                $this->setColumn($fullName, $definition['type'], $definition['length'], $definition, true);
            }

            break;
        }

        $this->_options['joinedParents'] = array_values(array_unique($this->_options['joinedParents']));

        $this->_options['declaringClass'] = $class;

        // set the table definition for the given tree implementation
        if ($this->isTree()) {
            $this->getTree()->setTableDefinition();
        }

        $this->columnCount = count($this->_columns);

        if ( ! isset($this->_options['tableName'])) {
            $this->setTableName(Doctrine_Inflector::tableize($class->getName()));
        }

        return $record;
    }

    /**
     * Initializes the primary key.
     *
     * Called in the construction process, builds the identifier definition
     * copying in the schema the list of the fields which constitutes 
     * the primary key.
     *
     * @return void
     */
    public function initIdentifier()
    {
        switch (count($this->_identifier)) {
            case 0:
                if ( ! empty($this->_options['joinedParents'])) {
                    $root = current($this->_options['joinedParents']);

                    $table = $this->_conn->getTable($root);

                    $this->_identifier = $table->getIdentifier();

                    $this->_identifierType = ($table->getIdentifierType() !== Doctrine_Core::IDENTIFIER_AUTOINC)
                                            ? $table->getIdentifierType() : Doctrine_Core::IDENTIFIER_NATURAL;

                    // add all inherited primary keys
                    foreach ((array) $this->_identifier as $id) {
                        $definition = $table->getDefinitionOf($id);

                        // inherited primary keys shouldn't contain autoinc
                        // and sequence definitions
                        unset($definition['autoincrement']);
                        unset($definition['sequence']);

                        // add the inherited primary key column
                        $fullName = $id . ' as ' . $table->getFieldName($id);
                        $this->setColumn($fullName, $definition['type'], $definition['length'],
                                $definition, true);
                    }
                } else {
                    $identifierOptions = $this->getAttribute(Doctrine_Core::ATTR_DEFAULT_IDENTIFIER_OPTIONS);
                    $name = (isset($identifierOptions['name']) && $identifierOptions['name']) ? $identifierOptions['name']:'id';
                    $name = sprintf($name, $this->getTableName());

                    $definition = array('type' => (isset($identifierOptions['type']) && $identifierOptions['type']) ? $identifierOptions['type']:'integer',
                                        'length' => (isset($identifierOptions['length']) && $identifierOptions['length']) ? $identifierOptions['length']:8,
                                        'autoincrement' => isset($identifierOptions['autoincrement']) ? $identifierOptions['autoincrement']:true,
                                        'primary' => isset($identifierOptions['primary']) ? $identifierOptions['primary']:true);

                    unset($identifierOptions['name'], $identifierOptions['type'], $identifierOptions['length']);
                    foreach ($identifierOptions as $key => $value) {
                        if ( ! isset($definition[$key]) || ! $definition[$key]) {
                            $definition[$key] = $value;
                        }
                    }

                    $this->setColumn($name, $definition['type'], $definition['length'], $definition, true);
                    $this->_identifier = $name;
                    $this->_identifierType = Doctrine_Core::IDENTIFIER_AUTOINC;
                }
                $this->columnCount++;
                break;
            case 1:
                foreach ($this->_identifier as $pk) {
                    $e = $this->getDefinitionOf($pk);

                    $found = false;

                    foreach ($e as $option => $value) {
                        if ($found) {
                            break;
                        }

                        $e2 = explode(':', $option);

                        switch (strtolower($e2[0])) {
                            case 'autoincrement':
                            case 'autoinc':
                                if ($value !== false) {
                                    $this->_identifierType = Doctrine_Core::IDENTIFIER_AUTOINC;
                                    $found = true;
                                }
                                break;
                            case 'seq':
                            case 'sequence':
                                $this->_identifierType = Doctrine_Core::IDENTIFIER_SEQUENCE;
                                $found = true;

                                if (is_string($value)) {
                                    $this->_options['sequenceName'] = $value;
                                } else {
                                    if (($sequence = $this->getAttribute(Doctrine_Core::ATTR_DEFAULT_SEQUENCE)) !== null) {
                                        $this->_options['sequenceName'] = $sequence;
                                    } else {
                                        $this->_options['sequenceName'] = $this->_conn->formatter->getSequenceName($this->_options['tableName']);
                                    }
                                }
                                break;
                        }
                    }
                    if ( ! isset($this->_identifierType)) {
                        $this->_identifierType = Doctrine_Core::IDENTIFIER_NATURAL;
                    }
                }

                $this->_identifier = $pk;

                break;
            default:
                $this->_identifierType = Doctrine_Core::IDENTIFIER_COMPOSITE;
        }
    }

    /**
     * Gets the owner of a column.
     *
     * The owner of a column is the name of the component in a hierarchy that
     * defines the column.
     *
     * @param string $columnName   the column name
     * @return string              the name of the owning/defining component
     */
    public function getColumnOwner($columnName)
    {
        if (isset($this->_columns[$columnName]['owner'])) {
            return $this->_columns[$columnName]['owner'];
        } else {
            return $this->getComponentName();
        }
    }

    /**
     * Gets the record instance for this table.
     * 
     * The Doctrine_Table instance always holds at least one
     * instance of a model so that it can be reused for several things, 
     * but primarily it is first used to instantiate all the internal
     * in memory schema definition.
     *
     * @return Doctrine_Record  Empty instance of the record
     */
    public function getRecordInstance()
    {
        if ( ! $this->record) {
            $this->record = new $this->_options['name'];
        }
        return $this->record;
    }

    /**
     * Checks whether a column is inherited from a component further up in the hierarchy.
     *
     * @param $columnName  The column name
     * @return boolean     TRUE if column is inherited, FALSE otherwise.
     */
    public function isInheritedColumn($columnName)
    {
        return (isset($this->_columns[$columnName]['owner']));
    }

    /**
     * Checks whether a field is in the primary key.
     * 
     * Checks if $fieldName is part of the table identifier, which defines
     * the one-column or multi-column primary key.
     *
     * @param string $fieldName  The field name
     * @return boolean           TRUE if the field is part of the table identifier/primary key field(s),
     */
    public function isIdentifier($fieldName)
    {
        return ($fieldName === $this->getIdentifier() ||
                in_array($fieldName, (array) $this->getIdentifier()));
    }

    /**
     * Checks whether a field identifier is of type autoincrement.
     *
     * This method checks if the primary key is a AUTOINCREMENT column or
     * if the table uses a natural key.
     *
     * @return boolean TRUE  if the identifier is autoincrement
     *                 FALSE otherwise
     */
    public function isIdentifierAutoincrement()
    {
        return $this->getIdentifierType() === Doctrine_Core::IDENTIFIER_AUTOINC;
    }

    /**
     * Checks whether a field identifier is a composite key.
     *
     * @return boolean TRUE  if the identifier is a composite key,
     *                 FALSE otherwise
     */
    public function isIdentifierComposite()
    {
        return $this->getIdentifierType() === Doctrine_Core::IDENTIFIER_COMPOSITE;
    }

    /**
     * getMethodOwner
     *
     * @param string $method
     * @return void
     */
    public function getMethodOwner($method)
    {
        return (isset($this->_invokedMethods[$method])) ?
                      $this->_invokedMethods[$method] : false;
    }

    /**
     * setMethodOwner
     *
     * @param string $method
     * @param string $class
     */
    public function setMethodOwner($method, $class)
    {
        $this->_invokedMethods[$method] = $class;
    }

    /**
     * Exports this table to database based on the schema definition.
     *
     * This method create a physical table in the database, using the 
     * definition that comes from the component Doctrine_Record instance.
     *
     * @throws Doctrine_Connection_Exception    if some error other than Doctrine_Core::ERR_ALREADY_EXISTS
     *                                          occurred during the create table operation
     * @return boolean                          whether or not the export operation was successful
     *                                          false if table already existed in the database
     */
    public function export()
    {
        $this->_conn->export->exportTable($this);
    }

    /**
     * Returns an exportable representation of this object.
     * 
     * This method produces a array representation of the table schema, where
     * keys are tableName, columns (@see $_columns) and options. 
     * The options subarray contains 'primary' and 'foreignKeys'.
     *
     * @param boolean $parseForeignKeys     whether to include foreign keys definition in the options 
     * @return array 
     */
    public function getExportableFormat($parseForeignKeys = true)
    {
        $columns = array();
        $primary = array();

        foreach ($this->getColumns() as $name => $definition) {

            if (isset($definition['owner'])) {
                continue;
            }

            switch ($definition['type']) {
                case 'boolean':
                    if (isset($definition['default'])) {
                        $definition['default'] = $this->getConnection()->convertBooleans($definition['default']);
                    }
                    break;
            }
            $columns[$name] = $definition;

            if (isset($definition['primary']) && $definition['primary']) {
                $primary[] = $name;
            }
        }

        $options['foreignKeys'] = isset($this->_options['foreignKeys']) ?
                $this->_options['foreignKeys'] : array();

        if ($parseForeignKeys && $this->getAttribute(Doctrine_Core::ATTR_EXPORT) & Doctrine_Core::EXPORT_CONSTRAINTS) {

            $constraints = array();

            $emptyIntegrity = array('onUpdate' => null,
                                    'onDelete' => null);

            foreach ($this->getRelations() as $name => $relation) {
                $fk = $relation->toArray();
                $fk['foreignTable'] = $relation->getTable()->getTableName();

                // do not touch tables that have EXPORT_NONE attribute
                if ($relation->getTable()->getAttribute(Doctrine_Core::ATTR_EXPORT) === Doctrine_Core::EXPORT_NONE) {
                    continue;
                }
                
                if ($relation->getTable() === $this && in_array($relation->getLocal(), $primary)) {
                    if ($relation->hasConstraint()) {
                        throw new Doctrine_Table_Exception("Badly constructed integrity constraints. Cannot define constraint of different fields in the same table.");
                    }
                    continue;
                }

                $integrity = array('onUpdate' => $fk['onUpdate'],
                                   'onDelete' => $fk['onDelete']);

                $fkName = $relation->getForeignKeyName();

                if ($relation instanceof Doctrine_Relation_LocalKey) {
                    $def = array('name'         => $fkName,
                                 'local'        => $relation->getLocalColumnName(),
                                 'foreign'      => $relation->getForeignColumnName(),
                                 'foreignTable' => $relation->getTable()->getTableName());

                    if ($integrity !== $emptyIntegrity) {
                        $def = array_merge($def, $integrity);
                    }
                    if (($key = $this->_checkForeignKeyExists($def, $options['foreignKeys'])) === false) {
                        $options['foreignKeys'][$fkName] = $def;
                    } else {
                        unset($def['name']);
                        $options['foreignKeys'][$key] = array_merge($options['foreignKeys'][$key], $def);
                    }
                }
            }
        }

        $options['primary'] = $primary;

        return array('tableName' => $this->getOption('tableName'),
                     'columns'   => $columns,
                     'options'   => array_merge($this->getOptions(), $options));
    }

    /**
     * Check if a foreign definition already exists in the fks array for a 
     * foreign table, local and foreign key
     *
     * @param  array $def          Foreign key definition to check for
     * @param  array $foreignKeys  Array of existing foreign key definitions to check in
     * @return boolean $result     Whether or not the foreign key was found
     */
    protected function _checkForeignKeyExists($def, $foreignKeys)
    {
        foreach ($foreignKeys as $key => $foreignKey) {
            if ($def['local'] == $foreignKey['local'] && $def['foreign'] == $foreignKey['foreign'] && $def['foreignTable'] == $foreignKey['foreignTable']) {
                return $key;
            }
        }
        return false;
    }

    /**
     * Retrieves the relation parser associated with this table.
     *
     * @return Doctrine_Relation_Parser     relation parser object
     */
    public function getRelationParser()
    {
        return $this->_parser;
    }

    /**
     * Magic method for accessing to object properties.
     * 
     * This method is an alias for getOption.
     * <code>
     * foreach ($table->indexes as $name => $definition) {
     *     // ...
     * }
     * </code>
     *
     * @param string $option
     * @return mixed
     */
    public function __get($option)
    {
        if (isset($this->_options[$option])) {
            return $this->_options[$option];
        }
        return null;
    }

    /**
     * Magic method for testing object properties existence.
     * 
     * This method tests if an option exists.
     * <code>
     * if (isset($table->tableName)) {
     *     // ...
     * }
     * </code>
     *
     * @param string $option
     */
    public function __isset($option)
    {
        return isset($this->_options[$option]);
    }

    /**
     * Retrieves all options of this table and the associated values.
     *
     * @return array    all options and their values
     */
    public function getOptions()
    {
        return $this->_options;
    }

    /**
     * Sets all the options.
     *
     * This method sets options of the table that are specified in the argument.
     * It has no effect on other options.
     *
     * @param array $options    keys are option names
     * @return void
     */
    public function setOptions($options)
    {
        foreach ($options as $key => $value) {
            $this->setOption($key, $value);
        }
    }

    /**
     * Adds a foreignKey to the table in-memory definition.
     * 
     * This method adds a foreign key to the schema definition.
     * It does not add the key to the physical table in the db; @see export().
     *
     * @param array $definition     definition of the foreign key
     * @return void
     */
    public function addForeignKey(array $definition)
    {
        $this->_options['foreignKeys'][] = $definition;
    }

    /**
     * Adds a check constraint to the table in-memory definition.
     * 
     * This method adds a CHECK constraint to the schema definition.
     * It does not add the constraint to the physical table in the 
     * db; @see export().
     *
     * @param $definition
     * @param mixed $name   if string used as name for the constraint.
     *                      Otherwise it is indexed numerically.
     * @return void
     */
    public function addCheckConstraint($definition, $name)
    {
        if (is_string($name)) {
            $this->_options['checks'][$name] = $definition;
        } else {
            $this->_options['checks'][] = $definition;
        }

        return $this;
    }

    /**
     * Adds an index to this table in-memory definition.
     *
     * This method adds an INDEX to the schema definition.
     * It does not add the index to the physical table in the db; @see export().
     *
     * @param string $index         index name
     * @param array $definition     keys are type, fields
     * @return void
     */
    public function addIndex($index, array $definition)
    {
        if (isset($definition['fields'])) {
	        foreach ((array) $definition['fields'] as $key => $field) {
		        if (is_numeric($key)) {
                    $definition['fields'][$key] = $this->getColumnName($field);
                } else {
                    $columnName = $this->getColumnName($key);

                    unset($definition['fields'][$key]);

                    $definition['fields'][$columnName] = $field;
                }
            }
        }

        $this->_options['indexes'][$index] = $definition;
    }

    /**
     * Retrieves an index definition.
     *
     * This method returns a given index definition: @see addIndex().
     *
     * @param string $index         index name; @see addIndex()
     * @return array|boolean        array on success, FALSE on failure
     */
    public function getIndex($index)
    {
        if (isset($this->_options['indexes'][$index])) {
            return $this->_options['indexes'][$index];
        }

        return false;
    }

    /**
     * Defines a n-uple of fields that must be unique for every record. 
     *
     * This method Will automatically add UNIQUE index definition 
     * and validate the values on save. The UNIQUE index is not created in the
     * database until you use @see export().
     *
     * @param array $fields     values are fieldnames
     * @param array $options    array of options for unique validator
     * @param bool $createUniqueIndex  Whether or not to create a unique index in the database
     * @return void
     */
    public function unique($fields, $options = array(), $createdUniqueIndex = true)
    {
        if ($createdUniqueIndex) {
            $name = implode('_', $fields) . '_unqidx';
            $definition = array('type' => 'unique', 'fields' => $fields);
            $this->addIndex($name, $definition);
        }

        $this->_uniques[] = array($fields, $options);
    }

    /**
     * Adds a relation to the table.
     *
     * This method defines a relation on this table, that will be present on
     * every record belonging to this component.
     *
     * @param array $args       first value is a string, name of related component;
     *                          second value is array, options for the relation.
     *                          @see Doctrine_Relation::_$definition
     * @param integer $type     Doctrine_Relation::ONE or Doctrine_Relation::MANY
     * @return void
     * @todo Name proposal: addRelation
     */
    public function bind($args, $type)
    {
        $options = ( ! isset($args[1])) ? array() : $args[1];
        $options['type'] = $type;

        $this->_parser->bind($args[0], $options);
    }

    /**
     * Binds One-to-One aggregate relation
     *
     * @param string $componentName     the name of the related component
     * @param string $options           relation options
     * @see Doctrine_Relation::_$definition
     * @return Doctrine_Record          this object
     */
    public function hasOne()
    {
        $this->bind(func_get_args(), Doctrine_Relation::ONE);
    }

    /**
     * Binds One-to-Many / Many-to-Many aggregate relation
     *
     * @param string $componentName     the name of the related component
     * @param string $options           relation options
     * @see Doctrine_Relation::_$definition
     * @return Doctrine_Record          this object
     */
    public function hasMany()
    {
        $this->bind(func_get_args(), Doctrine_Relation::MANY);
    }

    /**
     * Tests if a relation exists.
     * 
     * This method queries the table definition to find out if a relation 
     * is defined for this component. Alias defined with foreignAlias are not
     * recognized as there's only one Doctrine_Relation object on the owning 
     * side.
     *
     * @param string $alias      the relation alias to search for.
     * @return boolean           true if the relation exists. Otherwise false.
     */
    public function hasRelation($alias)
    {
        return $this->_parser->hasRelation($alias);
    }

    /**
     * Retrieves a relation object for this component.
     *
     * @param string $alias      relation alias; @see hasRelation()
     * @return Doctrine_Relation
     */
    public function getRelation($alias, $recursive = true)
    {
        return $this->_parser->getRelation($alias, $recursive);
    }

    /**
     * Retrieves all relation objects defined on this table.
     *
     * @return array
     */
    public function getRelations()
    {
        return $this->_parser->getRelations();
    }

    /**
     * Creates a query on this table.
     *
     * This method returns a new Doctrine_Query object and adds the component 
     * name of this table as the query 'from' part.
     * <code>
     * $table = Doctrine_Core::getTable('User');
     * $table->createQuery('myuser')
     *       ->where('myuser.Phonenumber = ?', '5551234');
     * </code>
     *
     * @param string $alias     name for component aliasing
     * @return Doctrine_Query
     */
    public function createQuery($alias = '')
    {
        if ( ! empty($alias)) {
            $alias = ' ' . trim($alias);
        }

        $class = $this->getAttribute(Doctrine_Core::ATTR_QUERY_CLASS);

        return Doctrine_Query::create(null, $class)
            ->from($this->getComponentName() . $alias);
    }

    /**
     * Gets the internal record repository.
     *
     * @return Doctrine_Table_Repository
     */
    public function getRepository()
    {
        return $this->_repository;
    }

    /**
     * Sets an option for the table.
     *
     * This method sets an option and returns this object in order to
     * allow flexible method chaining.
     *
     * @see Doctrine_Table::$_options   for available options
     * @param string $name              the name of the option to set
     * @param mixed $value              the value of the option
     * @return Doctrine_Table           this object
     */
    public function setOption($name, $value)
    {
        switch ($name) {
            case 'name':
            case 'tableName':
                break;
            case 'enumMap':
            case 'inheritanceMap':
            case 'index':
            case 'treeOptions':
                if ( ! is_array($value)) {
                throw new Doctrine_Table_Exception($name . ' should be an array.');
                }
                break;
        }
        $this->_options[$name] = $value;
    }

    /**
     * Returns the value of a given option.
     *
     * @see Doctrine_Table::$_options   for available options
     * @param string $name  the name of the option
     * @return mixed        the value of given option
     */
    public function getOption($name)
    {
        if (isset($this->_options[$name])) {
            return $this->_options[$name];
        }
        return null;
    }


    /**
     * Get the table orderby statement
     *
     * @param string $alias        The alias to use
     * @param boolean $columnNames Whether or not to use column names instead of field names
     * @return string $orderByStatement
     */
    public function getOrderByStatement($alias = null, $columnNames = false)
    {
        if (isset($this->_options['orderBy'])) {
            return $this->processOrderBy($alias, $this->_options['orderBy']);
        }
    }

    /**
     * Process an order by statement to be prefixed with the passed alias and
     * field names converted to column names if the 3rd argument is true.
     *
     * @param string $alias        The alias to prefix columns with
     * @param string $orderBy      The order by to process
     * @param string $columnNames  Whether or not to convert field names to column names
     * @return string $orderBy
     */
    public function processOrderBy($alias, $orderBy, $columnNames = false)
    {
        if ( ! $alias) {
           $alias = $this->getComponentName();
        }
   
        $e1 = explode(',', $orderBy);
        $e1 = array_map('trim', $e1);
        foreach ($e1 as $k => $v) {
            $e2 = explode(' ', $v);
            if ($columnNames) {
                $e2[0] = $this->getColumnName($e2[0]);
            }
            if ($this->hasField($this->getFieldName($e2[0]))) {
                $e1[$k] = $alias . '.' . $e2[0];
            } else {
                $e1[$k] = $e2[0];
            }
            if (isset($e2[1])) {
                $e1[$k] .=  ' ' . $e2[1];
            }
        }

        return implode(', ', $e1);
    }

    /**
     * Returns a column name for a column alias.
     *
     * If the actual name for the alias cannot be found
     * this method returns the given alias.
     *
     * @param string $alias         column alias
     * @return string               column name
     */
    public function getColumnName($fieldName)
    {
        // FIX ME: This is being used in places where an array is passed, but it should not be an array
        // For example in places where Doctrine should support composite foreign/primary keys
        $fieldName = is_array($fieldName) ? $fieldName[0]:$fieldName;

        if (isset($this->_columnNames[$fieldName])) {
            return $this->_columnNames[$fieldName];
        }

        return strtolower($fieldName);
    }

    /**
     * Retrieves a column definition from this table schema.
     *
     * @param string $columnName
     * @return array              column definition; @see $_columns
     */
    public function getColumnDefinition($columnName)
    {
        if ( ! isset($this->_columns[$columnName])) {
            return false;
        }
        return $this->_columns[$columnName];
    }

    /**
     * Returns a column alias for a column name.
     *
     * If no alias can be found the column name is returned.
     *
     * @param string $columnName    column name
     * @return string               column alias
     */
    public function getFieldName($columnName)
    {
        if (isset($this->_fieldNames[$columnName])) {
            return $this->_fieldNames[$columnName];
        }
        return $columnName;
    }

    /**
     * Customize the array of options for a column or multiple columns. First
     * argument can be a single field/column name or an array of them. The second
     * argument is an array of options.
     *
     *     [php]
     *     public function setTableDefinition()
     *     {
     *         parent::setTableDefinition();
     *         $this->setColumnOptions('username', array(
     *             'unique' => true
     *         ));
     *     }
     *
     * @param string $columnName 
     * @param array $validators 
     * @return void
     */
    public function setColumnOptions($columnName, array $options)
    {
        if (is_array($columnName)) {
            foreach ($columnName as $name) {
                $this->setColumnOptions($name, $options);
            }
        } else {
            foreach ($options as $option => $value) {
                $this->setColumnOption($columnName, $option, $value);
            }
        }
    }

    /**
     * Set an individual column option
     *
     * @param string $columnName 
     * @param string $option 
     * @param string $value 
     * @return void
     */
    public function setColumnOption($columnName, $option, $value)
    {
        if ($option == 'primary') {
            if (isset($this->_identifier)) {
                $this->_identifier = (array) $this->_identifier;
            }

            if ($value &&  ! in_array($columnName, $this->_identifier)) {
                $this->_identifier[] = $columnName;
            } else if (!$value && in_array($columnName, $this->_identifier)) {
                $key = array_search($columnName, $this->_identifier);
                unset($this->_identifier[$key]);
            }
        }

        $columnName = $this->getColumnName($columnName);
        $this->_columns[$columnName][$option] = $value;
    }

    /**
     * Set multiple column definitions at once
     *
     * @param array $definitions 
     * @return void
     */
    public function setColumns(array $definitions)
    {
        foreach ($definitions as $name => $options) {
            $this->setColumn($name, $options['type'], $options['length'], $options);
        }
    }

    /**
     * Adds a column to the schema. 
     *
     * This method does not alter the database table; @see export();
     *
     * @see $_columns;
     * @param string $name      column physical name
     * @param string $type      type of data
     * @param integer $length   maximum length
     * @param mixed $options
     * @param boolean $prepend  Whether to prepend or append the new column to the column list.
     *                          By default the column gets appended.
     * @throws Doctrine_Table_Exception     if trying use wrongly typed parameter
     * @return void
     */
    public function setColumn($name, $type = null, $length = null, $options = array(), $prepend = false)
    {
        if (is_string($options)) {
            $options = explode('|', $options);
        }

        foreach ($options as $k => $option) {
            if (is_numeric($k)) {
                if ( ! empty($option)) {
                    $options[$option] = true;
                }
                unset($options[$k]);
            }
        }

        // extract column name & field name
        if (stripos($name, ' as '))
        {
            if (strpos($name, ' as ')) {
                $parts = explode(' as ', $name);
            } else {
                $parts = explode(' AS ', $name);
            }

            if (count($parts) > 1) {
                $fieldName = $parts[1];
            } else {
                $fieldName = $parts[0];
            }

            $name = strtolower($parts[0]);
        } else {
            $fieldName = $name;
            $name = strtolower($name);
        }

        $name = trim($name);
        $fieldName = trim($fieldName);

        if ($prepend) {
            $this->_columnNames = array_merge(array($fieldName => $name), $this->_columnNames);
            $this->_fieldNames = array_merge(array($name => $fieldName), $this->_fieldNames);
        } else {
            $this->_columnNames[$fieldName] = $name;
            $this->_fieldNames[$name] = $fieldName;
        }

        $defaultOptions = $this->getAttribute(Doctrine_Core::ATTR_DEFAULT_COLUMN_OPTIONS);

        if (isset($defaultOptions['length']) && $defaultOptions['length'] && $length == null) {
            $length = $defaultOptions['length'];
        }

        if ($length == null) {
            switch ($type) {
                case 'integer':
                    $length = 8;
                break;
                case 'decimal':
                    $length = 18;
                break;
                case 'string':
                case 'clob':
                case 'float':
                case 'integer':
                case 'array':
                case 'object':
                case 'blob':
                case 'gzip':
                    //$length = 2147483647;
                    
                    //All the DataDict driver classes have work-arounds to deal
                    //with unset lengths.
                    $length = null;
                break;
                case 'boolean':
                    $length = 1;
                case 'date':
                    // YYYY-MM-DD ISO 8601
                    $length = 10;
                case 'time':
                    // HH:NN:SS+00:00 ISO 8601
                    $length = 14;
                case 'timestamp':
                    // YYYY-MM-DDTHH:MM:SS+00:00 ISO 8601
                    $length = 25;
            }
        }

        $options['type'] = $type;
        $options['length'] = $length;

        foreach ($defaultOptions as $key => $value) {
            if ( ! array_key_exists($key, $options) || is_null($options[$key])) {
                $options[$key] = $value;
            }
        }

        if ($prepend) {
            $this->_columns = array_merge(array($name => $options), $this->_columns);
        } else {
            $this->_columns[$name] = $options;
        }

        if (isset($options['primary']) && $options['primary']) {
            if (isset($this->_identifier)) {
                $this->_identifier = (array) $this->_identifier;
            }
            if ( ! in_array($fieldName, $this->_identifier)) {
                $this->_identifier[] = $fieldName;
            }
        }
        if (isset($options['default'])) {
            $this->hasDefaultValues = true;
        }
    }

    /**
     * Finds out whether this table has default values for columns.
     *
     * @return boolean
     */
    public function hasDefaultValues()
    {
        return $this->hasDefaultValues;
    }

    /**
     * Retrieves the default value (if any) for a given column.
     *
     * @param string $fieldName     column name
     * @return mixed                default value as set in definition
     */
    public function getDefaultValueOf($fieldName)
    {
        $columnName = $this->getColumnName($fieldName);
        if ( ! isset($this->_columns[$columnName])) {
            throw new Doctrine_Table_Exception("Couldn't get default value. Column ".$columnName." doesn't exist.");
        }
        if (isset($this->_columns[$columnName]['default'])) {
            return $this->_columns[$columnName]['default'];
        } else {
            return null;
        }
    }

    /**
     * Returns the definition of the identifier key.
     * @return string    can be array if a multi-column primary key is used.
     */
    public function getIdentifier()
    {
        return $this->_identifier;
    }

    /**
     * Retrieves the type of primary key.
     * 
     * This method finds out if the primary key is multifield.
     * @see Doctrine_Identifier constants
     * @return integer
     */
    public function getIdentifierType()
    {
        return $this->_identifierType;
    }

    /**
     * Finds out whether the table definition contains a given column.
     * @param string $columnName
     * @return boolean
     */
    public function hasColumn($columnName)
    {
        return isset($this->_columns[strtolower($columnName)]);
    }

    /**
     * Finds out whether the table definition has a given field.
     * 
     * This method returns true if @see hasColumn() returns true or if an alias
     * named $fieldName exists.
     * @param string $fieldName
     * @return boolean
     */
    public function hasField($fieldName)
    {
        return isset($this->_columnNames[$fieldName]);
    }

    /**
     * Sets the default connection for this table.
     *
     * This method assign the connection which this table will use
     * to create queries.
     *
     * @params Doctrine_Connection      a connection object
     * @return Doctrine_Table           this object; fluent interface
     */
    public function setConnection(Doctrine_Connection $conn)
    {
        $this->_conn = $conn;

        $this->setParent($this->_conn);

        return $this;
    }

    /**
     * Returns the connection associated with this table (if any).
     *
     * @return Doctrine_Connection|null     the connection object
     */
    public function getConnection()
    {
        return $this->_conn;
    }

    /**
     * Creates a new record.
     *
     * This method create a new instance of the model defined by this table.
     * The class of this record is the subclass of Doctrine_Record defined by 
     * this component. The record is not created in the database until you
     * call @save().
     *
     * @param $array             an array where keys are field names and
     *                           values representing field values. Can contain
     *                           also related components;
     *                           @see Doctrine_Record::fromArray()
     * @return Doctrine_Record   the created record object
     */
    public function create(array $array = array())
    {
        $record = new $this->_options['name']($this, true);
        $record->fromArray($array);

        return $record;
    }
    
    /**
     * Adds a named query in the query registry.
     * 
     * This methods register a query object with a name to use in the future.
     * @see createNamedQuery()
     * @param $queryKey                       query key name to use for storage
     * @param string|Doctrine_Query $query    DQL string or object
     * @return void
	 */
	public function addNamedQuery($queryKey, $query)
    {
        $registry = Doctrine_Manager::getInstance()->getQueryRegistry();
        $registry->add($this->getComponentName() . '/' . $queryKey, $query);
    }
    
    /**
     * Creates a named query from one in the query registry.
     *
     * This method clones a new query object from a previously registered one.
     *
     * @see addNamedQuery()
     * @param string $queryKey  query key name
     * @return Doctrine_Query
	 */
	public function createNamedQuery($queryKey)
    {
        $queryRegistry = Doctrine_Manager::getInstance()->getQueryRegistry();

        if (strpos($queryKey, '/') !== false) {
            $e = explode('/', $queryKey);
            
            return $queryRegistry->get($e[1], $e[0]);
        }

        return $queryRegistry->get($queryKey, $this->getComponentName());
    }

    /**
     * Finds a record by its identifier.
     *
     * <code>
     * $table->find(11);
     * $table->find(11, Doctrine_Core::HYDRATE_RECORD);
     * $table->find('namedQueryForYearArchive', array(2009), Doctrine_Core::HYDRATE_ARRAY);
     * </code>
     *
     * @param mixed $name         Database Row ID or Query Name defined previously as a NamedQuery
     * @param mixed $params       This argument is the hydration mode (Doctrine_Core::HYDRATE_ARRAY or 
     *                            Doctrine_Core::HYDRATE_RECORD) if first param is a Database Row ID. 
     *                            Otherwise this argument expect an array of query params.
     * @param int $hydrationMode  Optional Doctrine_Core::HYDRATE_ARRAY or Doctrine_Core::HYDRATE_RECORD if 
     *                            first argument is a NamedQuery
     * @return mixed              Doctrine_Collection, array, Doctrine_Record or false if no result
     */
    public function find()
    {
        $num_args = func_num_args();

        // Named Query or IDs
        $name = func_get_arg(0);
        
        if (is_null($name)) { 
            return false;
        }

        $ns = $this->getComponentName();
        $m = $name;
        
        // Check for possible cross-access
        if ( ! is_array($name) && strpos($name, '/') !== false) {
            list($ns, $m) = explode('/', $name);
        }

        // Define query to be used
        if (
            ! is_array($name) && 
            Doctrine_Manager::getInstance()->getQueryRegistry()->has($m, $ns)
        ) {
            // We're dealing with a named query
            $q = $this->createNamedQuery($name);

            // Parameters construction
            $params = ($num_args >= 2) ? func_get_arg(1) : array();

            // Hydration mode
            $hydrationMode = ($num_args == 3) ? func_get_arg(2) : null;

            // Executing query
            $res = $q->execute($params, $hydrationMode);
        } else {
            // We're passing a single ID or an array of IDs
            $q = $this->createQuery('dctrn_find')
                ->where('dctrn_find.' . implode(' = ? AND dctrn_find.', (array) $this->getIdentifier()) . ' = ?')
                ->limit(1);
                
            // Parameters construction
            $params = is_array($name) ? array_values($name) : array($name);

            // Hydration mode
            $hydrationMode = ($num_args == 2) ? func_get_arg(1) : null;
            
            // Executing query
            $res = $q->fetchOne($params, $hydrationMode);
        }

        $q->free();
        
        return $res;
    }

    /**
     * Retrieves all the records stored in this table.
     *
     * @param int $hydrationMode        Doctrine_Core::HYDRATE_ARRAY or Doctrine_Core::HYDRATE_RECORD
     * @return Doctrine_Collection|array
     */
    public function findAll($hydrationMode = null)
    {
        return $this->createQuery('dctrn_find')
            ->execute(array(), $hydrationMode);
    }

    /**
     * Finds records in this table with a given SQL where clause.
     *
     * @param string $dql               DQL WHERE clause to use
     * @param array $params             query parameters (a la PDO)
     * @param int $hydrationMode        Doctrine_Core::HYDRATE_ARRAY or Doctrine_Core::HYDRATE_RECORD
     * @return Doctrine_Collection|array
     *
     * @todo This actually takes DQL, not SQL, but it requires column names
     *       instead of field names. This should be fixed to use raw SQL instead.
     */
    public function findBySql($dql, $params = array(), $hydrationMode = null)
    {
        return $this->createQuery('dctrn_find')
            ->where($dql)->execute($params, $hydrationMode);
    }

    /**
     * Finds records in this table with a given DQL where clause.
     *
     * @param string $dql               DQL WHERE clause
     * @param array $params             preparated statement parameters
     * @param int $hydrationMode        Doctrine_Core::HYDRATE_ARRAY or Doctrine_Core::HYDRATE_RECORD
     * @return Doctrine_Collection|array
     */
    public function findByDql($dql, $params = array(), $hydrationMode = null)
    {
        $parser = $this->createQuery();
        $query = 'FROM ' . $this->getComponentName() . ' dctrn_find WHERE ' . $dql;

        return $parser->query($query, $params, $hydrationMode);
    }

    /**
     * Find records basing on a field.
     *
     * @param string $column            field for the WHERE clause
     * @param string $value             prepared statement parameter
     * @param int $hydrationMode        Doctrine_Core::HYDRATE_ARRAY or Doctrine_Core::HYDRATE_RECORD
     * @return Doctrine_Collection|array
     */
    public function findBy($fieldName, $value, $hydrationMode = null)
    {
        return $this->createQuery('dctrn_find')
            ->where($this->buildFindByWhere($fieldName), (array) $value)
            ->execute(array(), $hydrationMode);
    }

    /**
     * Finds the first record that satisfy the clause.
     *
     * @param string $column            field for the WHERE clause
     * @param string $value             prepared statement parameter
     * @param int $hydrationMode        Doctrine_Core::HYDRATE_ARRAY or Doctrine_Core::HYDRATE_RECORD
     * @return Doctrine_Record
     */
    public function findOneBy($fieldName, $value, $hydrationMode = null)
    {
        return $this->createQuery('dctrn_find')
            ->where($this->buildFindByWhere($fieldName), (array) $value)
            ->limit(1)
            ->fetchOne(array(), $hydrationMode);
    }

    /**
     * Finds result of a named query.
     * 
     * This method fetches data using the provided $queryKey to choose a named
     * query in the query registry.
     *
     * @param string $queryKey      the query key
     * @param array $params         prepared statement params (if any)
     * @param int $hydrationMode    Doctrine_Core::HYDRATE_ARRAY or Doctrine_Core::HYDRATE_RECORD
     * @throws Doctrine_Query_Registry if no query for given queryKey is found
     * @return Doctrine_Collection|array
     */
    public function execute($queryKey, $params = array(), $hydrationMode = Doctrine_Core::HYDRATE_RECORD)
    {
        return $this->createNamedQuery($queryKey)->execute($params, $hydrationMode);
    }

    /**
     * Fetches one record with a named query.
     *
     * This method uses the provided $queryKey to clone and execute
     * the associated named query in the query registry.
     *
     * @param string $queryKey      the query key
     * @param array $params         prepared statement params (if any)
     * @param int $hydrationMode    Doctrine_Core::HYDRATE_ARRAY or Doctrine_Core::HYDRATE_RECORD
     * @throws Doctrine_Query_Registry if no query for given queryKey is found
     * @return Doctrine_Record|array
     */
    public function executeOne($queryKey, $params = array(), $hydrationMode = Doctrine_Core::HYDRATE_RECORD)
    {
        return $this->createNamedQuery($queryKey)->fetchOne($params, $hydrationMode);
    }

    /**
     * Clears the first level cache (identityMap).
     *
     * This method ensures that records are reloaded from the db.
     *
     * @return void
     * @todo what about a more descriptive name? clearIdentityMap?
     */
    public function clear()
    {
        $this->_identityMap = array();
    }

    /**
     * Adds a record to the first level cache (identity map).
     *
     * This method is used internally to cache records, ensuring that only one 
     * object that represents a sql record exists in all scopes.
     *
     * @param Doctrine_Record $record       record to be added
     * @return boolean                      true if record was not present in the map
     * @todo Better name? registerRecord?
     */
    public function addRecord(Doctrine_Record $record)
    {
        $id = implode(' ', $record->identifier());

        if (isset($this->_identityMap[$id])) {
            return false;
        }

        $this->_identityMap[$id] = $record;

        return true;
    }

    /**
     * Removes a record from the identity map.
     *
     * This method deletes from the cache the given record; can be used to 
     * force reloading of an object from database.
     *
     * @param Doctrine_Record $record   record to remove from cache
     * @return boolean                  true if the record was found and removed,
     *                                  false if the record wasn't found.
     */
    public function removeRecord(Doctrine_Record $record)
    {
        $id = implode(' ', $record->identifier());

        if (isset($this->_identityMap[$id])) {
            unset($this->_identityMap[$id]);
            return true;
        }

        return false;
    }

    /**
     * Returns a new record.
     *
     * This method checks if a internal record exists in identityMap, if does 
     * not exist it creates a new one.
     *
     * @return Doctrine_Record
     */
    public function getRecord()
    {
        if ( ! empty($this->_data)) {
            $identifierFieldNames = $this->getIdentifier();

            if ( ! is_array($identifierFieldNames)) {
                $identifierFieldNames = array($identifierFieldNames);
            }

            $found = false;
            foreach ($identifierFieldNames as $fieldName) {
                if ( ! isset($this->_data[$fieldName])) {
                    // primary key column not found return new record
                    $found = true;
                    break;
                }
                $id[] = $this->_data[$fieldName];
            }

            if ($found) {
                $recordName = $this->getComponentName();
                $record = new $recordName($this, true);
                $this->_data = array();
                return $record;
            }
            
            $id = implode(' ', $id);

            if (isset($this->_identityMap[$id])) {
                $record = $this->_identityMap[$id];
                if ($record->getTable()->getAttribute(Doctrine_Core::ATTR_HYDRATE_OVERWRITE)) {
                    $record->hydrate($this->_data);
                    if ($record->state() == Doctrine_Record::STATE_PROXY) {
                        if (!$record->isInProxyState()) {
                            $record->state(Doctrine_Record::STATE_CLEAN);
                        }
                    }
                } else {
                    $record->hydrate($this->_data, false);
                }
            } else {
                $recordName = $this->getComponentName();
                $record = new $recordName($this);
                $this->_identityMap[$id] = $record;
            }
            $this->_data = array();
        } else {
            $recordName = $this->getComponentName();
            $record = new $recordName($this, true);
        }

        return $record;
    }

    /**
     * Get the classname to return. Most often this is just the options['name'].
     *
     * Check the subclasses option and the inheritanceMap for each subclass to see
     * if all the maps in a subclass is met. If this is the case return that
     * subclass name. If no subclasses match or if there are no subclasses defined
     * return the name of the class for this tables record.
     *
     * @todo this function could use reflection to check the first time it runs
     * if the subclassing option is not set.
     *
     * @return string The name of the class to create
     * @deprecated
     */
    public function getClassnameToReturn()
    {
        if ( ! isset($this->_options['subclasses'])) {
            return $this->_options['name'];
        }
        foreach ($this->_options['subclasses'] as $subclass) {
            $table = $this->_conn->getTable($subclass);
            $inheritanceMap = $table->getOption('inheritanceMap');
            $nomatch = false;
            foreach ($inheritanceMap as $key => $value) {
                if ( ! isset($this->_data[$key]) || $this->_data[$key] != $value) {
                    $nomatch = true;
                    break;
                }
            }
            if ( ! $nomatch) {
                return $table->getComponentName();
            }
        }
        return $this->_options['name'];
    }

    /**
     * @param $id                       database row id
     * @throws Doctrine_Find_Exception
     * @return Doctrine_Record
     */
    final public function getProxy($id = null)
    {
        if ($id !== null) {
            $identifierColumnNames = $this->getIdentifierColumnNames();
            $query = 'SELECT ' . implode(', ', (array) $identifierColumnNames)
                . ' FROM ' . $this->getTableName()
                . ' WHERE ' . implode(' = ? && ', (array) $identifierColumnNames) . ' = ?';
            $query = $this->applyInheritance($query);

            $params = array_merge(array($id), array_values($this->_options['inheritanceMap']));

            $this->_data = $this->_conn->execute($query, $params)->fetch(PDO::FETCH_ASSOC);

            if ($this->_data === false)
                return false;
        }
        return $this->getRecord();
    }

    /**
     * applyInheritance
     * @param $where                    query where part to be modified
     * @return string                   query where part with column aggregation inheritance added
     */
    final public function applyInheritance($where)
    {
        if ( ! empty($this->_options['inheritanceMap'])) {
            $a = array();
            foreach ($this->_options['inheritanceMap'] as $field => $value) {
                $a[] = $this->getColumnName($field) . ' = ?';
            }
            $i = implode(' AND ', $a);
            $where .= ' AND ' . $i;
        }
        return $where;
    }

    /**
     * Implements Countable interface.
     *
     * @return integer number of records in the table
     */
    public function count()
    {
        return $this->createQuery()->count();
    }

    /**
     * @return Doctrine_Query  a Doctrine_Query object
     */
    public function getQueryObject()
    {
        $graph = $this->createQuery();
        $graph->load($this->getComponentName());
        return $graph;
    }

    /**
     * Retrieves the enum values for a given field.
     *
     * @param string $fieldName
     * @return array
     */
    public function getEnumValues($fieldName)
    {
        $columnName = $this->getColumnName($fieldName);
        if (isset($this->_columns[$columnName]['values'])) {
            return $this->_columns[$columnName]['values'];
        } else {
            return array();
        }
    }

    /**
     * Retrieves an enum value.
     *
     * This method finds a enum string value. If ATTR_USE_NATIVE_ENUM is set
     * on the connection, index and value are the same thing.
     *
     * @param string $fieldName 
     * @param integer $index        numeric index of the enum
     * @return mixed
     */
    public function enumValue($fieldName, $index)
    {
        if ($index instanceof Doctrine_Null) {
            return $index;
        }

        $columnName = $this->getColumnName($fieldName);
        if ( ! $this->_conn->getAttribute(Doctrine_Core::ATTR_USE_NATIVE_ENUM)
            && isset($this->_columns[$columnName]['values'][$index])
        ) {
            return $this->_columns[$columnName]['values'][$index];
        }

        return $index;
    }

    /**
     * Retrieves an enum index.
     * @see enumValue()
     *
     * @param string $fieldName
     * @param mixed $value          value of the enum considered
     * @return integer              can be string if native enums are used.
     */
    public function enumIndex($fieldName, $value)
    {
        $values = $this->getEnumValues($fieldName);

        $index = array_search($value, $values);
        if ($index === false || !$this->_conn->getAttribute(Doctrine_Core::ATTR_USE_NATIVE_ENUM)) {
            return $index;
        }
        return $value;
    }

    /**
     * Validates a given field using table ATTR_VALIDATE rules.
     * @see Doctrine_Core::ATTR_VALIDATE
     *
     * @param string $fieldName
     * @param string $value
     * @param Doctrine_Record $record   record to consider; if it does not exists, it is created
     * @return Doctrine_Validator_ErrorStack $errorStack
     */
    public function validateField($fieldName, $value, Doctrine_Record $record = null)
    {
        if ($record instanceof Doctrine_Record) {
            $errorStack = $record->getErrorStack();
        } else {
            $record  = $this->create();
            $errorStack = new Doctrine_Validator_ErrorStack($this->getOption('name'));
        }

        if ($value === self::$_null) {
            $value = null;
        } else if ($value instanceof Doctrine_Record && $value->exists()) {
            $value = $value->getIncremented();
        } else if ($value instanceof Doctrine_Record && ! $value->exists()) {
            foreach($this->getRelations() as $relation) {
                if ($fieldName == $relation->getLocalFieldName() && (get_class($value) == $relation->getClass() || is_subclass_of($value, $relation->getClass()))) {
                    return $errorStack;
                }
            }
        }

        $dataType = $this->getTypeOf($fieldName);

        // Validate field type, if type validation is enabled
        if ($this->getAttribute(Doctrine_Core::ATTR_VALIDATE) & Doctrine_Core::VALIDATE_TYPES) {
            if ( ! Doctrine_Validator::isValidType($value, $dataType)) {
                $errorStack->add($fieldName, 'type');
            }
            if ($dataType == 'enum') {
                $enumIndex = $this->enumIndex($fieldName, $value);
                if ($enumIndex === false && $value !== null) {
                    $errorStack->add($fieldName, 'enum');
                }
            }
            if ($dataType == 'set') {
                $values = $this->_columns[$fieldName]['values'];
                // Convert string to array
                if (is_string($value)) {
                    $value = explode(',', $value);
                    $value = array_map('trim', $value);
                    $record->set($fieldName, $value);
                }
                // Make sure each set value is valid
                foreach ($value as $k => $v) {
                    if ( ! in_array($v, $values)) {
                        $errorStack->add($fieldName, 'set');
                    }
                }
            }
        }

        // Validate field length, if length validation is enabled
        if ($this->getAttribute(Doctrine_Core::ATTR_VALIDATE) & Doctrine_Core::VALIDATE_LENGTHS) {
            if ( ! Doctrine_Validator::validateLength($value, $dataType, $this->getFieldLength($fieldName))) {
                $errorStack->add($fieldName, 'length');
            }
        }

        // Run all custom validators
        foreach ($this->getFieldValidators($fieldName) as $validatorName => $args) {
            if ( ! is_string($validatorName)) {
                $validatorName = $args;
                $args = array();
            }

            $validator = Doctrine_Validator::getValidator($validatorName);
            $validator->invoker = $record;
            $validator->field = $fieldName;
            $validator->args = $args;
            if ( ! $validator->validate($value)) {
                $errorStack->add($fieldName, $validator);
            }
        }

        return $errorStack;
    }

    /**
     * Validates all the unique indexes.
     *
     * This methods validates 'unique' sets of fields for the given Doctrine_Record instance.
     * Pushes error to the record error stack if they are generated.
     *
     * @param Doctrine_Record $record
     */
    public function validateUniques(Doctrine_Record $record)
    {
        $errorStack = $record->getErrorStack();
        $validator = Doctrine_Validator::getValidator('unique');
        $validator->invoker = $record;

        foreach ($this->_uniques as $unique)
        {
            list($fields, $options) = $unique;
            $validator->args = $options;
            $validator->field = $fields;
            $values = array();
            foreach ($fields as $field) {
                $values[] = $record->$field;
            }
            if ( ! $validator->validate($values)) {
                foreach ($fields as $field) {
                    $errorStack->add($field, $validator);
                }
            }
        }
    }

    /**
     * @return integer      the number of columns in this table
     */
    public function getColumnCount()
    {
        return $this->columnCount;
    }

    /**
     * Retrieves all columns of the table.
     *
     * @see $_columns;
     * @return array    keys are column names and values are definition
     */
    public function getColumns()
    {
        return $this->_columns;
    }

    /**
     * Removes a field name from the table schema information.
     *
     * @param string $fieldName
     * @return boolean      true if the field is found and removed.
     *                      False otherwise.
     */
    public function removeColumn($fieldName)
    {
        if ( ! $this->hasField($fieldName)) {
          return false;
        }

        $columnName = $this->getColumnName($fieldName);
        unset($this->_columnNames[$fieldName], $this->_fieldNames[$columnName], $this->_columns[$columnName]);
        $this->columnCount = count($this->_columns);
        return true;
    }

    /**
     * Returns an array containing all the column names.
     *
     * @return array numeric array
     */
    public function getColumnNames(array $fieldNames = null)
    {
        if ($fieldNames === null) {
            return array_keys($this->_columns);
        } else {
           $columnNames = array();
           foreach ($fieldNames as $fieldName) {
               $columnNames[] = $this->getColumnName($fieldName);
           }
           return $columnNames;
        }
    }

    /**
     * Returns an array with all the identifier column names.
     *
     * @return array numeric array
     */
    public function getIdentifierColumnNames()
    {
        return $this->getColumnNames((array) $this->getIdentifier());
    }

    /**
     * Gets the array of unique fields sets.
     * @see $_uniques;
     *
     * @return array numeric array
     */
    public function getUniques()
    {
        return $this->_uniques;
    }

    /**
     * Returns an array containing all the field names.
     *
     * @return array numeric array
     */
    public function getFieldNames()
    {
        return array_values($this->_fieldNames);
    }

    /**
     * Retrieves the definition of a field.
     * 
     * This method retrieves the definition of the column, basing of $fieldName
     * which can be a column name or a field name (alias).
     *
     * @param string $fieldName
     * @return array        false on failure
     */
    public function getDefinitionOf($fieldName)
    {
        $columnName = $this->getColumnName($fieldName);
        return $this->getColumnDefinition($columnName);
    }

    /**
     * Retrieves the type of a field.
     *
     * @param string $fieldName
     * @return string        false on failure
     */
    public function getTypeOf($fieldName)
    {
        return $this->getTypeOfColumn($this->getColumnName($fieldName));
    }

    /**
     * Retrieves the type of a column.
     *
     * @param string $columnName
     * @return string        false if column is not found
     */
    public function getTypeOfColumn($columnName)
    {
        return isset($this->_columns[$columnName]) ? $this->_columns[$columnName]['type'] : false;
    }

    /**
     * Doctrine uses this function internally.
     * Users are strongly discouraged to use this function.
     *
     * @access private
     * @param array $data               internal data
     * @return void
     */
    public function setData(array $data)
    {
        $this->_data = $data;
    }

    /**
     * Returns internal data.
     *
     * This method is used by Doctrine_Record instances
     * when retrieving data from database.
     *
     * @return array
     */
    public function getData()
    {
        return $this->_data;
    }

    /**
     * Performs special data preparation.
     *
     * This method returns a representation of a field data, depending on
     * the type of the given column.
     *
     * 1. It unserializes array and object typed columns
     * 2. Uncompresses gzip typed columns
     * 3. Gets the appropriate enum values for enum typed columns
     * 4. Initializes special null object pointer for null values (for fast column existence checking purposes)
     *
     * example:
     * <code type='php'>
     * $field = 'name';
     * $value = null;
     * $table->prepareValue($field, $value); // Doctrine_Null
     * </code>
     *
     * @throws Doctrine_Table_Exception     if unserialization of array/object typed column fails or
     * @throws Doctrine_Table_Exception     if uncompression of gzip typed column fails         *
     * @param string $field     the name of the field
     * @param string $value     field value
     * @param string $typeHint  Type hint used to pass in the type of the value to prepare
     *                          if it is already known. This enables the method to skip
     *                          the type determination. Used i.e. during hydration.
     * @return mixed            prepared value
     */
    public function prepareValue($fieldName, $value, $typeHint = null)
    {
        if ($value === self::$_null) {
            return self::$_null;
        } else if ($value === null) {
            return null;
        } else {
            $type = is_null($typeHint) ? $this->getTypeOf($fieldName) : $typeHint;

            switch ($type) {
                case 'integer':
                case 'string';
                    // don't do any casting here PHP INT_MAX is smaller than what the databases support
                break;
                case 'enum':
                    return $this->enumValue($fieldName, $value);
                break;
                case 'set':
                    return explode(',', $value);
                break;
                case 'boolean':
                    return (boolean) $value;
                break;
                case 'array':
                case 'object':
                    if (is_string($value)) {
                        $value = empty($value) ? null:unserialize($value);

                        if ($value === false) {
                            throw new Doctrine_Table_Exception('Unserialization of ' . $fieldName . ' failed.');
                        }
                        return $value;
                    }
                break;
                case 'gzip':
                    $value = gzuncompress($value);

                    if ($value === false) {
                        throw new Doctrine_Table_Exception('Uncompressing of ' . $fieldName . ' failed.');
                    }
                    return $value;
                break;
            }
        }
        return $value;
    }

    /**
     * Gets associated tree.
     * This method returns the associated Tree object (if any exists). 
     * Normally implemented by NestedSet behavior.
     *
     * @return Doctrine_Tree false if not a tree
     */
    public function getTree()
    {
        if (isset($this->_options['treeImpl'])) {
            if ( ! $this->_tree) {
                $options = isset($this->_options['treeOptions']) ? $this->_options['treeOptions'] : array();
                $this->_tree = Doctrine_Tree::factory($this,
                    $this->_options['treeImpl'],
                    $options
                );
            }
            return $this->_tree;
        }
        return false;
    }

    /**
     * Gets the subclass of Doctrine_Record that belongs to this table.
     *
     * @return string
     */
    public function getComponentName()
    {
        return $this->_options['name'];
    }

    /**
     * Gets the table name in the db.
     *
     * @return string
     */
    public function getTableName()
    {
        return $this->_options['tableName'];
    }

    /**
     * sets the table name in the schema definition.
     *
     * @param string $tableName
     * @return void
     */
    public function setTableName($tableName)
    {
        $this->setOption('tableName', $this->_conn->formatter->getTableName($tableName));
    }

    /**
     * Determines if table acts as tree.
     *
     * @return boolean  if tree return true, otherwise returns false
     */
    public function isTree()
    {
        return ( ! is_null($this->_options['treeImpl'])) ? true : false;
    }
    
    /**
     * Retrieves all templates (behaviors) attached to this table.
     *
     * @return array     an array containing all templates
     */
    public function getTemplates()
    {
        return $this->_templates;
    }

    /**
     * Retrieves a particular template by class name.
     *
     * This method retrieves a behavior/template object attached to the table.
     * For Doctrine_Template_* classes, the base name can be used.
     *
     * @param string $template              name of the behavior
     * @throws Doctrine_Table_Exception     if the given template is 
     *                                      not set on this table
     * @return Doctrine_Template
     */
    public function getTemplate($template)
    {
        if (isset($this->_templates['Doctrine_Template_' . $template])) {
            return $this->_templates['Doctrine_Template_' . $template];
        } else if (isset($this->_templates[$template])) {
            return $this->_templates[$template];
        }

        throw new Doctrine_Table_Exception('Template ' . $template . ' not loaded');
    }

    /**
     * Checks if the table has a given template.
     *
     * @param string $template  name of template; @see getTemplate()
     * @return boolean
     */
    public function hasTemplate($template)
    {
        return isset($this->_templates[$template]) || isset($this->_templates['Doctrine_Template_' . $template]);
    }

    /**
     * Adds a template to this table.
     *
     * @param string $template          template name
     * @param Doctrine_Template $impl   behavior to attach
     * @return Doctrine_Table
     */
    public function addTemplate($template, Doctrine_Template $impl)
    {
        $this->_templates[$template] = $impl;

        return $this;
    }

    /**
     * Gets all the generators for this table.
     *
     * @return array $generators
     */
    public function getGenerators()
    {
        return $this->_generators;
    }

    /**
     * Gets generator instance for a passed name.
     *
     * @param string $generator
     * @return Doctrine_Record_Generator $generator
     */
    public function getGenerator($generator)
    {
        if ( ! isset($this->_generators[$generator])) {
            throw new Doctrine_Table_Exception('Generator ' . $generator . ' not loaded');
        }

        return $this->_generators[$generator];
    }

    /**
     * Checks if a generator name exists.
     *
     * @param string $generator
     * @return void
     */
    public function hasGenerator($generator)
    {
        return isset($this->_generators[$generator]);
    }

    /**
     * Adds a generate to the table instance.
     *
     * @param Doctrine_Record_Generator $generator
     * @param string $name
     * @return Doctrine_Table
     */
    public function addGenerator(Doctrine_Record_Generator $generator, $name = null)
    {
        if ($name === null) {
            $this->_generators[] = $generator;
        } else {
            $this->_generators[$name] = $generator;
        }
        return $this;
    }

    /**
     * Set the generator responsible for creating this table
     *
     * @param Doctrine_Record_Generator $generator
     * @return void
     */
    public function setGenerator(Doctrine_Record_Generator $generator)
    {
        $this->_generator = $generator;
    }

    /**
     * Check whether this table was created by a record generator or not
     *
     * @return boolean
     */
    public function isGenerator()
    {
        return isset($this->_generator) ? true : false;
    }

    /**
     * Get the parent generator responsible for this table instance
     *
     * @return Doctrine_Record_Generator
     */
    public function getParentGenerator()
    {
        return $this->_generator;
    }

    /**
     * Binds query parts to this component.
     * @see bindQueryPart()
     *
     * @param array $queryParts         an array of pre-bound query parts
     * @return Doctrine_Table           this object
     */
    public function bindQueryParts(array $queryParts)
    {
        $this->_options['queryParts'] = $queryParts;

        return $this;
    }

    /**
     * Adds default query parts to the selects executed on this table.
     * 
     * This method binds given value to given query part.
     * Every query created by this table will have this part set by default.
     *
     * @param string $queryPart
     * @param mixed $value
     * @return Doctrine_Record          this object
     */
    public function bindQueryPart($queryPart, $value)
    {
        $this->_options['queryParts'][$queryPart] = $value;

        return $this;
    }

    /**
     * Gets the names of all validators being applied on a field.
     *
     * @param string $fieldName
     * @return array                names of validators
     */
    public function getFieldValidators($fieldName)
    {
        $validators = array();
        $columnName = $this->getColumnName($fieldName);
        // this loop is a dirty workaround to get the validators filtered out of
        // the options, since everything is squeezed together currently
        foreach ($this->_columns[$columnName] as $name => $args) {
             if (empty($name)
                    || $name == 'primary'
                    || $name == 'protected'
                    || $name == 'autoincrement'
                    || $name == 'default'
                    || $name == 'values'
                    || $name == 'sequence'
                    || $name == 'zerofill'
                    || $name == 'owner'
                    || $name == 'scale'
                    || $name == 'type'
                    || $name == 'length'
                    || $name == 'fixed'
                    || $name == 'comment'
                    || $name == 'extra') {
                continue;
            }
            if ($name == 'notnull' && isset($this->_columns[$columnName]['autoincrement'])
                    && $this->_columns[$columnName]['autoincrement'] === true) {
                continue;
            }
            // skip it if it's explicitly set to FALSE (i.e. notnull => false)
            if ($args === false) {
                continue;
            }
            $validators[$name] = $args;
        }

        return $validators;
    }

    /**
     * Gets the maximum length of a field.
     * For integer fields, length is bytes occupied.
     * For decimal fields, it is the total number of cyphers
     *
     * @param string $fieldName
     * @return integer
     */
    public function getFieldLength($fieldName)
    {
        return $this->_columns[$this->getColumnName($fieldName)]['length'];
    }

    /**
     * Retrieves a bound query part.
     * @see bindQueryPart()
     *
     * @param string $queryPart     field interested
     * @return string               value of the bind
     */
    public function getBoundQueryPart($queryPart)
    {
        if ( ! isset($this->_options['queryParts'][$queryPart])) {
            return null;
        }

        return $this->_options['queryParts'][$queryPart];
    }

    /**
     * unshiftFilter
     *
     * @param  Doctrine_Record_Filter $filter
     * @return Doctrine_Table                           this object (provides a fluent interface)
     */
    public function unshiftFilter(Doctrine_Record_Filter $filter)
    {
        $filter->setTable($this);

        $filter->init();

        array_unshift($this->_filters, $filter);

        return $this;
    }

    /**
     * getFilters
     *
     * @return array $filters
     */
    public function getFilters()
    {
        return $this->_filters;
    }

    /**
     * Generates a string representation of this object.
     *
     * This method is useful for debugging purposes, or it can be overriden in
     * Doctrine_Record to provide a value when Record is casted to (string).
     *
     * @return string
     */
    public function __toString()
    {
        return Doctrine_Lib::getTableAsString($this);
    }

    public function buildFindByWhere($fieldName)
    {
        $ands = array();
        $e = explode('And', $fieldName);
        foreach ($e as $k => $v) {
            $and = '';
            $e2 = explode('Or', $v);
            $ors = array();
            foreach ($e2 as $k2 => $v2) {
                if ($v2 = $this->_resolveFindByFieldName($v2)) {
                    $ors[] = 'dctrn_find.' . $v2 . ' = ?';
                } else {
                    throw new Doctrine_Table_Exception('Invalid field name to find by: ' . $v2);
                }
            }
            $and .= implode(' OR ', $ors);
            $and = count($ors) > 1 ? '(' . $and . ')':$and;
            $ands[] = $and;
        }
        $where = implode(' AND ', $ands);
        return $where;
    }

    /**
     * Resolves the passed find by field name inflecting the parameter. 
     *
     * This method resolves the appropriate field name
     * regardless of whether the user passes a column name, field name, or a Doctrine_Inflector::classified()
     * version of their column name. It will be inflected with Doctrine_Inflector::tableize() 
     * to get the column or field name.
     *
     * @param string $name 
     * @return string $fieldName
     */
    protected function _resolveFindByFieldName($name)
    {
        $fieldName = Doctrine_Inflector::tableize($name);
        if ($this->hasColumn($name) || $this->hasField($name)) {
            return $this->getFieldName($this->getColumnName($name));
        } else if ($this->hasColumn($fieldName) || $this->hasField($fieldName)) {
            return $this->getFieldName($this->getColumnName($fieldName));
        } else {
            return false;
        }
    }

    /**
     * Adds support for magic finders.
     * 
     * This method add support for calling methods not defined in code, such as:
     * findByColumnName, findByRelationAlias
     * findById, findByContactId, etc.
     *
     * @return the result of the finder
     */
    public function __call($method, $arguments)
    {
        $lcMethod = strtolower($method);

        if (substr($lcMethod, 0, 6) == 'findby') {
            $by = substr($method, 6, strlen($method));
            $method = 'findBy';
        } else if (substr($lcMethod, 0, 9) == 'findoneby') {
            $by = substr($method, 9, strlen($method));
            $method = 'findOneBy';
        }

        if (isset($by)) {
            if ( ! isset($arguments[0])) {
                throw new Doctrine_Table_Exception('You must specify the value to ' . $method);
            }

            $fieldName = $this->_resolveFindByFieldName($by);
            $count = count(explode('Or', $by)) + (count(explode('And', $by)) - 1);
            if (count($arguments) > $count)
            {
                $hydrationMode = end($arguments);
                unset($arguments[count($arguments) - 1]);
            } else {
                $hydrationMode = null;
            }
            if ($this->hasField($fieldName)) {
                return $this->$method($fieldName, $arguments[0], $hydrationMode);
            } else if ($this->hasRelation($by)) {
                $relation = $this->getRelation($by);

                if ($relation['type'] === Doctrine_Relation::MANY) {
                    throw new Doctrine_Table_Exception('Cannot findBy many relationship.');
                }

                return $this->$method($relation['local'], $arguments[0], $hydrationMode);
            } else {
                return $this->$method($by, $arguments, $hydrationMode);
            }
        }

        // Forward the method on to the record instance and see if it has anything or one of its behaviors
        try {
            return call_user_func_array(array($this->getRecordInstance(), $method . 'TableProxy'), $arguments);
        } catch (Doctrine_Record_UnknownPropertyException $e) {}

        throw new Doctrine_Table_Exception(sprintf('Unknown method %s::%s', get_class($this), $method));
    }
}
