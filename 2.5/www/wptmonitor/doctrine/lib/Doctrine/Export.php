<?php
/*
 *  $Id: Export.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Export
 *
 * @package     Doctrine
 * @subpackage  Export
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Lukas Smith <smith@pooteeweet.org> (PEAR MDB2 library)
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 */
class Doctrine_Export extends Doctrine_Connection_Module
{
    protected $valid_default_values = array(
        'text'      => '',
        'boolean'   => true,
        'integer'   => 0,
        'decimal'   => 0.0,
        'float'     => 0.0,
        'timestamp' => '1970-01-01 00:00:00',
        'time'      => '00:00:00',
        'date'      => '1970-01-01',
        'clob'      => '',
        'blob'      => '',
        'string'    => ''
    );

    /**
     * drop an existing database
     * (this method is implemented by the drivers)
     *
     * @param string $name name of the database that should be dropped
     * @return void
     */
    public function dropDatabase($database)
    {
        foreach ((array) $this->dropDatabaseSql($database) as $query) {
            $this->conn->execute($query);
        }
    }

    /**
     * drop an existing database
     * (this method is implemented by the drivers)
     *
     * @param string $name name of the database that should be dropped
     * @return void
     */
    public function dropDatabaseSql($database)
    {
        throw new Doctrine_Export_Exception('Drop database not supported by this driver.');
    }

    /**
     * dropTableSql
     * drop an existing table
     *
     * @param string $table           name of table that should be dropped from the database
     * @return string
     */
    public function dropTableSql($table)
    {
        return 'DROP TABLE ' . $this->conn->quoteIdentifier($table);
    }

    /**
     * dropTable
     * drop an existing table
     *
     * @param string $table           name of table that should be dropped from the database
     * @return void
     */
    public function dropTable($table)
    {
        $this->conn->execute($this->dropTableSql($table));
    }

    /**
     * drop existing index
     *
     * @param string    $table        name of table that should be used in method
     * @param string    $name         name of the index to be dropped
     * @return void
     */
    public function dropIndex($table, $name)
    {
        return $this->conn->exec($this->dropIndexSql($table, $name));
    }

    /**
     * dropIndexSql
     *
     * @param string    $table        name of table that should be used in method
     * @param string    $name         name of the index to be dropped
     * @return string                 SQL that is used for dropping an index
     */
    public function dropIndexSql($table, $name)
    {
        $name = $this->conn->quoteIdentifier($this->conn->formatter->getIndexName($name));
        
        return 'DROP INDEX ' . $name;
    }

    /**
     * drop existing constraint
     *
     * @param string    $table        name of table that should be used in method
     * @param string    $name         name of the constraint to be dropped
     * @param string    $primary      hint if the constraint is primary
     * @return void
     */
    public function dropConstraint($table, $name, $primary = false)
    {
        $table = $this->conn->quoteIdentifier($table);
        $name  = $this->conn->quoteIdentifier($name);
        
        return $this->conn->exec('ALTER TABLE ' . $table . ' DROP CONSTRAINT ' . $name);
    }

    /**
     * drop existing foreign key
     *
     * @param string    $table        name of table that should be used in method
     * @param string    $name         name of the foreign key to be dropped
     * @return void
     */
    public function dropForeignKey($table, $name)
    {
        return $this->dropConstraint($table, $name);
    }

    /**
     * dropSequenceSql
     * drop existing sequence
     * (this method is implemented by the drivers)
     *
     * @throws Doctrine_Connection_Exception     if something fails at database level
     * @param string $sequenceName      name of the sequence to be dropped
     * @return void
     */
    public function dropSequence($sequenceName)
    {
        $this->conn->exec($this->dropSequenceSql($sequenceName));
    }

    /**
     * dropSequenceSql
     * drop existing sequence
     *
     * @throws Doctrine_Connection_Exception     if something fails at database level
     * @param string $sequenceName name of the sequence to be dropped
     * @return void
     */
    public function dropSequenceSql($sequenceName)
    {
        throw new Doctrine_Export_Exception('Drop sequence not supported by this driver.');
    }

    /**
     * create a new database
     * (this method is implemented by the drivers)
     *
     * @param string $name name of the database that should be created
     * @return void
     */
    public function createDatabase($database)
    {
        $this->conn->execute($this->createDatabaseSql($database));
    }

    /**
     * create a new database
     * (this method is implemented by the drivers)
     *
     * @param string $name name of the database that should be created
     * @return string
     */
    public function createDatabaseSql($database)
    {
        throw new Doctrine_Export_Exception('Create database not supported by this driver.');
    }

    /**
     * create a new table
     *
     * @param string $name   Name of the database that should be created
     * @param array $fields  Associative array that contains the definition of each field of the new table
     *                       The indexes of the array entries are the names of the fields of the table an
     *                       the array entry values are associative arrays like those that are meant to be
     *                       passed with the field definitions to get[Type]Declaration() functions.
     *                          array(
     *                              'id' => array(
     *                                  'type' => 'integer',
     *                                  'unsigned' => 1
     *                                  'notnull' => 1
     *                                  'default' => 0
     *                              ),
     *                              'name' => array(
     *                                  'type' => 'text',
     *                                  'length' => 12
     *                              ),
     *                              'password' => array(
     *                                  'type' => 'text',
     *                                  'length' => 12
     *                              )
     *                          );
     * @param array $options  An associative array of table options:
     *
     * @return string
     */
    public function createTableSql($name, array $fields, array $options = array())
    {
        if ( ! $name) {
            throw new Doctrine_Export_Exception('no valid table name specified');
        }

        if (empty($fields)) {
            throw new Doctrine_Export_Exception('no fields specified for table ' . $name);
        }

        $queryFields = $this->getFieldDeclarationList($fields);


        if (isset($options['primary']) && ! empty($options['primary'])) {
            $primaryKeys = array_map(array($this->conn, 'quoteIdentifier'), array_values($options['primary']));
            $queryFields .= ', PRIMARY KEY(' . implode(', ', $primaryKeys) . ')';
        }

        if (isset($options['indexes']) && ! empty($options['indexes'])) {
            foreach($options['indexes'] as $index => $definition) {
                $indexDeclaration = $this->getIndexDeclaration($index, $definition);
                // append only created index declarations
                if ( ! is_null($indexDeclaration)) {
                    $queryFields .= ', '.$indexDeclaration;
                } 
            }
        }

        $query = 'CREATE TABLE ' . $this->conn->quoteIdentifier($name, true) . ' (' . $queryFields;
        
        $check = $this->getCheckDeclaration($fields);

        if ( ! empty($check)) {
            $query .= ', ' . $check;
        }

        $query .= ')';

        $sql[] = $query;

        if (isset($options['foreignKeys'])) {

            foreach ((array) $options['foreignKeys'] as $k => $definition) {
                if (is_array($definition)) {
                    $sql[] = $this->createForeignKeySql($name, $definition);
                }
            }
        }
        return $sql;
    }

    /**
     * create a new table
     *
     * @param string $name   Name of the database that should be created
     * @param array $fields  Associative array that contains the definition of each field of the new table
     * @param array $options  An associative array of table options:
     * @see Doctrine_Export::createTableSql()
     *
     * @return void
     */
    public function createTable($name, array $fields, array $options = array())
    {
        // Build array of the primary keys if any of the individual field definitions
        // specify primary => true
        $count = 0;
        foreach ($fields as $fieldName => $field) {
            if (isset($field['primary']) && $field['primary']) {
                if ($count == 0) {
                    $options['primary'] = array();
                }
                $count++;
                $options['primary'][] = $fieldName;
            }
        }

        $sql = (array) $this->createTableSql($name, $fields, $options);

        foreach ($sql as $query) {
            $this->conn->execute($query);
        }
    }

    /**
     * create sequence
     *
     * @throws Doctrine_Connection_Exception     if something fails at database level
     * @param string    $seqName        name of the sequence to be created
     * @param string    $start          start value of the sequence; default is 1
     * @param array     $options  An associative array of table options:
     *                          array(
     *                              'comment' => 'Foo',
     *                              'charset' => 'utf8',
     *                              'collate' => 'utf8_unicode_ci',
     *                          );
     * @return void
     */
    public function createSequence($seqName, $start = 1, array $options = array())
    {
        return $this->conn->execute($this->createSequenceSql($seqName, $start = 1, $options));
    }

    /**
     * return RDBMS specific create sequence statement
     * (this method is implemented by the drivers)
     *
     * @throws Doctrine_Connection_Exception     if something fails at database level
     * @param string    $seqName        name of the sequence to be created
     * @param string    $start          start value of the sequence; default is 1
     * @param array     $options  An associative array of table options:
     *                          array(
     *                              'comment' => 'Foo',
     *                              'charset' => 'utf8',
     *                              'collate' => 'utf8_unicode_ci',
     *                          );
     * @return string
     */
    public function createSequenceSql($seqName, $start = 1, array $options = array())
    {
        throw new Doctrine_Export_Exception('Create sequence not supported by this driver.');
    }

    /**
     * create a constraint on a table
     *
     * @param string    $table         name of the table on which the constraint is to be created
     * @param string    $name          name of the constraint to be created
     * @param array     $definition    associative array that defines properties of the constraint to be created.
     *                                 Currently, only one property named FIELDS is supported. This property
     *                                 is also an associative with the names of the constraint fields as array
     *                                 constraints. Each entry of this array is set to another type of associative
     *                                 array that specifies properties of the constraint that are specific to
     *                                 each field.
     *
     *                                 Example
     *                                    array(
     *                                        'fields' => array(
     *                                            'user_name' => array(),
     *                                            'last_login' => array()
     *                                        )
     *                                    )
     * @return void
     */
    public function createConstraint($table, $name, $definition)
    {
        $sql = $this->createConstraintSql($table, $name, $definition);
        
        return $this->conn->exec($sql);
    }

    /**
     * create a constraint on a table
     *
     * @param string    $table         name of the table on which the constraint is to be created
     * @param string    $name          name of the constraint to be created
     * @param array     $definition    associative array that defines properties of the constraint to be created.
     *                                 Currently, only one property named FIELDS is supported. This property
     *                                 is also an associative with the names of the constraint fields as array
     *                                 constraints. Each entry of this array is set to another type of associative
     *                                 array that specifies properties of the constraint that are specific to
     *                                 each field.
     *
     *                                 Example
     *                                    array(
     *                                        'fields' => array(
     *                                            'user_name' => array(),
     *                                            'last_login' => array()
     *                                        )
     *                                    )
     * @return void
     */
    public function createConstraintSql($table, $name, $definition)
    {
        $table = $this->conn->quoteIdentifier($table);
        $name  = $this->conn->quoteIdentifier($this->conn->formatter->getIndexName($name));
        $query = 'ALTER TABLE ' . $table . ' ADD CONSTRAINT ' . $name;

        if (isset($definition['primary']) && $definition['primary']) {
            $query .= ' PRIMARY KEY';
        } elseif (isset($definition['unique']) && $definition['unique']) {
            $query .= ' UNIQUE';
        }

        $fields = array();
        foreach (array_keys($definition['fields']) as $field) {
            $fields[] = $this->conn->quoteIdentifier($field, true);
        }
        $query .= ' ('. implode(', ', $fields) . ')';

        return $query;
    }

    /**
     * Get the stucture of a field into an array
     *
     * @param string    $table         name of the table on which the index is to be created
     * @param string    $name          name of the index to be created
     * @param array     $definition    associative array that defines properties of the index to be created.
     *                                 Currently, only one property named FIELDS is supported. This property
     *                                 is also an associative with the names of the index fields as array
     *                                 indexes. Each entry of this array is set to another type of associative
     *                                 array that specifies properties of the index that are specific to
     *                                 each field.
     *
     *                                 Currently, only the sorting property is supported. It should be used
     *                                 to define the sorting direction of the index. It may be set to either
     *                                 ascending or descending.
     *
     *                                 Not all DBMS support index sorting direction configuration. The DBMS
     *                                 drivers of those that do not support it ignore this property. Use the
     *                                 function supports() to determine whether the DBMS driver can manage indexes.
     *
     *                                 Example
     *                                    array(
     *                                        'fields' => array(
     *                                            'user_name' => array(
     *                                                'sorting' => 'ascending'
     *                                            ),
     *                                            'last_login' => array()
     *                                        )
     *                                    )
     * @return void
     */
    public function createIndex($table, $name, array $definition)
    {
        return $this->conn->execute($this->createIndexSql($table, $name, $definition));
    }

    /**
     * Get the stucture of a field into an array
     *
     * @param string    $table         name of the table on which the index is to be created
     * @param string    $name          name of the index to be created
     * @param array     $definition    associative array that defines properties of the index to be created.
     * @see Doctrine_Export::createIndex()
     * @return string
     */
    public function createIndexSql($table, $name, array $definition)
    {
        $table  = $this->conn->quoteIdentifier($table);
        $name   = $this->conn->quoteIdentifier($name);
        $type   = '';
        
        if (isset($definition['type'])) {
            switch (strtolower($definition['type'])) {
                case 'unique':
                    $type = strtoupper($definition['type']) . ' ';
                break;
                default:
                    throw new Doctrine_Export_Exception(
                        'Unknown type ' . $definition['type'] . ' for index ' . $name . ' in table ' . $table
                    );
            }
        }

        $query = 'CREATE ' . $type . 'INDEX ' . $name . ' ON ' . $table;

        $fields = array();
        foreach ($definition['fields'] as $field) {
            $fields[] = $this->conn->quoteIdentifier($field);
        }
        $query .= ' (' . implode(', ', $fields) . ')';

        return $query;
    }    
    /**
     * createForeignKeySql
     *
     * @param string    $table         name of the table on which the foreign key is to be created
     * @param array     $definition    associative array that defines properties of the foreign key to be created.
     * @return string
     */
    public function createForeignKeySql($table, array $definition)
    {
        $table = $this->conn->quoteIdentifier($table);
        $query = 'ALTER TABLE ' . $table . ' ADD ' . $this->getForeignKeyDeclaration($definition);

        return $query;
    }

    /**
     * createForeignKey
     *
     * @param string    $table         name of the table on which the foreign key is to be created
     * @param array     $definition    associative array that defines properties of the foreign key to be created.
     * @return string
     */
    public function createForeignKey($table, array $definition)
    {
        $sql = $this->createForeignKeySql($table, $definition);
        
        return $this->conn->execute($sql);
    }

    /**
     * alter an existing table
     * (this method is implemented by the drivers)
     *
     * @param string $name         name of the table that is intended to be changed.
     * @param array $changes     associative array that contains the details of each type
     *                             of change that is intended to be performed. The types of
     *                             changes that are currently supported are defined as follows:
     *
     *                             name
     *
     *                                New name for the table.
     *
     *                            add
     *
     *                                Associative array with the names of fields to be added as
     *                                 indexes of the array. The value of each entry of the array
     *                                 should be set to another associative array with the properties
     *                                 of the fields to be added. The properties of the fields should
     *                                 be the same as defined by the MDB2 parser.
     *
     *
     *                            remove
     *
     *                                Associative array with the names of fields to be removed as indexes
     *                                 of the array. Currently the values assigned to each entry are ignored.
     *                                 An empty array should be used for future compatibility.
     *
     *                            rename
     *
     *                                Associative array with the names of fields to be renamed as indexes
     *                                 of the array. The value of each entry of the array should be set to
     *                                 another associative array with the entry named name with the new
     *                                 field name and the entry named Declaration that is expected to contain
     *                                 the portion of the field declaration already in DBMS specific SQL code
     *                                 as it is used in the CREATE TABLE statement.
     *
     *                            change
     *
     *                                Associative array with the names of the fields to be changed as indexes
     *                                 of the array. Keep in mind that if it is intended to change either the
     *                                 name of a field and any other properties, the change array entries
     *                                 should have the new names of the fields as array indexes.
     *
     *                                The value of each entry of the array should be set to another associative
     *                                 array with the properties of the fields to that are meant to be changed as
     *                                 array entries. These entries should be assigned to the new values of the
     *                                 respective properties. The properties of the fields should be the same
     *                                 as defined by the MDB2 parser.
     *
     *                            Example
     *                                array(
     *                                    'name' => 'userlist',
     *                                    'add' => array(
     *                                        'quota' => array(
     *                                            'type' => 'integer',
     *                                            'unsigned' => 1
     *                                        )
     *                                    ),
     *                                    'remove' => array(
     *                                        'file_limit' => array(),
     *                                        'time_limit' => array()
     *                                    ),
     *                                    'change' => array(
     *                                        'name' => array(
     *                                            'length' => '20',
     *                                            'definition' => array(
     *                                                'type' => 'text',
     *                                                'length' => 20,
     *                                            ),
     *                                        )
     *                                    ),
     *                                    'rename' => array(
     *                                        'sex' => array(
     *                                            'name' => 'gender',
     *                                            'definition' => array(
     *                                                'type' => 'text',
     *                                                'length' => 1,
     *                                                'default' => 'M',
     *                                            ),
     *                                        )
     *                                    )
     *                                )
     *
     * @param boolean $check     indicates whether the function should just check if the DBMS driver
     *                             can perform the requested table alterations if the value is true or
     *                             actually perform them otherwise.
     * @return void
     */
    public function alterTable($name, array $changes, $check = false)
    {
        $sql = $this->alterTableSql($name, $changes, $check);
        
        if (is_string($sql) && $sql) {
            $this->conn->execute($sql);
        }
    }

    /**
     * generates the sql for altering an existing table
     * (this method is implemented by the drivers)
     *
     * @param string $name          name of the table that is intended to be changed.
     * @param array $changes        associative array that contains the details of each type      *
     * @param boolean $check        indicates whether the function should just check if the DBMS driver
     *                              can perform the requested table alterations if the value is true or
     *                              actually perform them otherwise.
     * @see Doctrine_Export::alterTable()
     * @return string
     */
    public function alterTableSql($name, array $changes, $check = false)
    {
        throw new Doctrine_Export_Exception('Alter table not supported by this driver.');
    }

    /**
     * Get declaration of a number of field in bulk
     *
     * @param array $fields  a multidimensional associative array.
     *      The first dimension determines the field name, while the second
     *      dimension is keyed with the name of the properties
     *      of the field being declared as array indexes. Currently, the types
     *      of supported field properties are as follows:
     *
     *      length
     *          Integer value that determines the maximum length of the text
     *          field. If this argument is missing the field should be
     *          declared to have the longest length allowed by the DBMS.
     *
     *      default
     *          Text value to be used as default for this field.
     *
     *      notnull
     *          Boolean flag that indicates whether this field is constrained
     *          to not be set to null.
     *      charset
     *          Text value with the default CHARACTER SET for this field.
     *      collation
     *          Text value with the default COLLATION for this field.
     *      unique
     *          unique constraint
     *
     * @return string
     */
    public function getFieldDeclarationList(array $fields)
    {
        foreach ($fields as $fieldName => $field) {
            $query = $this->getDeclaration($fieldName, $field);

            $queryFields[] = $query;
        }
        return implode(', ', $queryFields);
    }

    /**
     * Obtain DBMS specific SQL code portion needed to declare a generic type
     * field to be used in statements like CREATE TABLE.
     *
     * @param string $name   name the field to be declared.
     * @param array  $field  associative array with the name of the properties
     *      of the field being declared as array indexes. Currently, the types
     *      of supported field properties are as follows:
     *
     *      length
     *          Integer value that determines the maximum length of the text
     *          field. If this argument is missing the field should be
     *          declared to have the longest length allowed by the DBMS.
     *
     *      default
     *          Text value to be used as default for this field.
     *
     *      notnull
     *          Boolean flag that indicates whether this field is constrained
     *          to not be set to null.
     *
     *      charset
     *          Text value with the default CHARACTER SET for this field.
     *
     *      collation
     *          Text value with the default COLLATION for this field.
     *
     *      unique
     *          unique constraint
     *
     *      check
     *          column check constraint
     *
     * @return string  DBMS specific SQL code portion that should be used to
     *      declare the specified field.
     */
    public function getDeclaration($name, array $field)
    {

        $default   = $this->getDefaultFieldDeclaration($field);

        $charset   = (isset($field['charset']) && $field['charset']) ?
                    ' ' . $this->getCharsetFieldDeclaration($field['charset']) : '';

        $collation = (isset($field['collation']) && $field['collation']) ?
                    ' ' . $this->getCollationFieldDeclaration($field['collation']) : '';

        $notnull   = $this->getNotNullFieldDeclaration($field);

        $unique    = (isset($field['unique']) && $field['unique']) ?
                    ' ' . $this->getUniqueFieldDeclaration() : '';

        $check     = (isset($field['check']) && $field['check']) ?
                    ' ' . $field['check'] : '';

        $method = 'get' . $field['type'] . 'Declaration';

        try {
            if (method_exists($this->conn->dataDict, $method)) {
                return $this->conn->dataDict->$method($name, $field);
            } else {
                $dec = $this->conn->dataDict->getNativeDeclaration($field);
            }

            return $this->conn->quoteIdentifier($name, true)
                 . ' ' . $dec . $charset . $default . $notnull . $unique . $check . $collation;
        } catch (Exception $e) {
            throw new Doctrine_Exception('Around field ' . $name . ': ' . $e->getMessage());
        }

    }

    /**
     * getDefaultDeclaration
     * Obtain DBMS specific SQL code portion needed to set a default value
     * declaration to be used in statements like CREATE TABLE.
     *
     * @param array $field      field definition array
     * @return string           DBMS specific SQL code portion needed to set a default value
     */
    public function getDefaultFieldDeclaration($field)
    {
        $default = '';

        if (array_key_exists('default', $field)) {
            if ($field['default'] === '') {
                $field['default'] = empty($field['notnull'])
                    ? null : $this->valid_default_values[$field['type']];

                if ($field['default'] === '' &&
                   ($this->conn->getAttribute(Doctrine_Core::ATTR_PORTABILITY) & Doctrine_Core::PORTABILITY_EMPTY_TO_NULL)) {
                    $field['default'] = null;
                }
            }

            if ($field['type'] === 'boolean') {
                $field['default'] = $this->conn->convertBooleans($field['default']);
            }
            $default = ' DEFAULT ' . (is_null($field['default'])
                ? 'NULL'
                : $this->conn->quote($field['default'], $field['type']));
        }

        return $default;
    }
    

    /**
     * getNotNullFieldDeclaration
     * Obtain DBMS specific SQL code portion needed to set a NOT NULL
     * declaration to be used in statements like CREATE TABLE.
     *
     * @param array $field      field definition array
     * @return string           DBMS specific SQL code portion needed to set a default value
     */
    public function getNotNullFieldDeclaration(array $definition)
    {
        return (isset($definition['notnull']) && $definition['notnull']) ? ' NOT NULL' : '';
    }
    

    /**
     * Obtain DBMS specific SQL code portion needed to set a CHECK constraint
     * declaration to be used in statements like CREATE TABLE.
     *
     * @param array $definition     check definition
     * @return string               DBMS specific SQL code portion needed to set a CHECK constraint
     */
    public function getCheckDeclaration(array $definition)
    {
        $constraints = array();
        foreach ($definition as $field => $def) {
            if (is_string($def)) {
                $constraints[] = 'CHECK (' . $def . ')';
            } else {
                if (isset($def['min'])) {
                    $constraints[] = 'CHECK (' . $field . ' >= ' . $def['min'] . ')';
                }

                if (isset($def['max'])) {
                    $constraints[] = 'CHECK (' . $field . ' <= ' . $def['max'] . ')';
                }
            }
        }

        return implode(', ', $constraints);
    }

    /**
     * Obtain DBMS specific SQL code portion needed to set an index
     * declaration to be used in statements like CREATE TABLE.
     *
     * @param string $name          name of the index
     * @param array $definition     index definition
     * @return string               DBMS specific SQL code portion needed to set an index
     */
    public function getIndexDeclaration($name, array $definition)
    {
        $name   = $this->conn->quoteIdentifier($name);
        $type   = '';

        if (isset($definition['type'])) {
            if (strtolower($definition['type']) == 'unique') {
                $type = strtoupper($definition['type']) . ' ';
            } else {
                throw new Doctrine_Export_Exception(
                    'Unknown type ' . $definition['type'] . ' for index ' . $name
                );
            }
        }

        if ( ! isset($definition['fields']) || ! is_array($definition['fields'])) {
            throw new Doctrine_Export_Exception('No columns given for index ' . $name);
        }

        $query = $type . 'INDEX ' . $name;

        $query .= ' (' . $this->getIndexFieldDeclarationList($definition['fields']) . ')';

        return $query;
    }

    /**
     * getIndexFieldDeclarationList
     * Obtain DBMS specific SQL code portion needed to set an index
     * declaration to be used in statements like CREATE TABLE.
     *
     * @return string
     */
    public function getIndexFieldDeclarationList(array $fields)
    {
        $ret = array();
        foreach ($fields as $field => $definition) {
            if (is_array($definition)) {
                $ret[] = $this->conn->quoteIdentifier($field);
            } else {
                $ret[] = $this->conn->quoteIdentifier($definition);
            }
        }
        return implode(', ', $ret);
    }

    /**
     * A method to return the required SQL string that fits between CREATE ... TABLE
     * to create the table as a temporary table.
     *
     * Should be overridden in driver classes to return the correct string for the
     * specific database type.
     *
     * The default is to return the string "TEMPORARY" - this will result in a
     * SQL error for any database that does not support temporary tables, or that
     * requires a different SQL command from "CREATE TEMPORARY TABLE".
     *
     * @return string The string required to be placed between "CREATE" and "TABLE"
     *                to generate a temporary table, if possible.
     */
    public function getTemporaryTableQuery()
    {
        return 'TEMPORARY';
    }

    /**
     * getForeignKeyDeclaration
     * Obtain DBMS specific SQL code portion needed to set the FOREIGN KEY constraint
     * of a field declaration to be used in statements like CREATE TABLE.
     *
     * @param array $definition         an associative array with the following structure:
     *          name                    optional constraint name
     *
     *          local                   the local field(s)
     *
     *          foreign                 the foreign reference field(s)
     *
     *          foreignTable            the name of the foreign table
     *
     *          onDelete                referential delete action
     *
     *          onUpdate                referential update action
     *
     *          deferred                deferred constraint checking
     *
     * The onDelete and onUpdate keys accept the following values:
     *
     * CASCADE: Delete or update the row from the parent table and automatically delete or
     *          update the matching rows in the child table. Both ON DELETE CASCADE and ON UPDATE CASCADE are supported.
     *          Between two tables, you should not define several ON UPDATE CASCADE clauses that act on the same column
     *          in the parent table or in the child table.
     *
     * SET NULL: Delete or update the row from the parent table and set the foreign key column or columns in the
     *          child table to NULL. This is valid only if the foreign key columns do not have the NOT NULL qualifier
     *          specified. Both ON DELETE SET NULL and ON UPDATE SET NULL clauses are supported.
     *
     * NO ACTION: In standard SQL, NO ACTION means no action in the sense that an attempt to delete or update a primary
     *           key value is not allowed to proceed if there is a related foreign key value in the referenced table.
     *
     * RESTRICT: Rejects the delete or update operation for the parent table. NO ACTION and RESTRICT are the same as
     *           omitting the ON DELETE or ON UPDATE clause.
     *
     * SET DEFAULT
     *
     * @return string  DBMS specific SQL code portion needed to set the FOREIGN KEY constraint
     *                 of a field declaration.
     */
    public function getForeignKeyDeclaration(array $definition)
    {
        $sql  = $this->getForeignKeyBaseDeclaration($definition);
        $sql .= $this->getAdvancedForeignKeyOptions($definition);

        return $sql;
    }

    /**
     * getAdvancedForeignKeyOptions
     * Return the FOREIGN KEY query section dealing with non-standard options
     * as MATCH, INITIALLY DEFERRED, ON UPDATE, ...
     *
     * @param array $definition     foreign key definition
     * @return string
     */
    public function getAdvancedForeignKeyOptions(array $definition)
    {
        $query = '';
        if ( ! empty($definition['onUpdate'])) {
            $query .= ' ON UPDATE ' . $this->getForeignKeyReferentialAction($definition['onUpdate']);
        }
        if ( ! empty($definition['onDelete'])) {
            $query .= ' ON DELETE ' . $this->getForeignKeyReferentialAction($definition['onDelete']);
        }
        return $query;
    }

    /**
     * getForeignKeyReferentialAction
     *
     * returns given referential action in uppercase if valid, otherwise throws
     * an exception
     *
     * @throws Doctrine_Exception_Exception     if unknown referential action given
     * @param string $action    foreign key referential action
     * @param string            foreign key referential action in uppercase
     */
    public function getForeignKeyReferentialAction($action)
    {
        $upper = strtoupper($action);
        switch ($upper) {
            case 'CASCADE':
            case 'SET NULL':
            case 'NO ACTION':
            case 'RESTRICT':
            case 'SET DEFAULT':
                return $upper;
            break;
            default:
                throw new Doctrine_Export_Exception('Unknown foreign key referential action \'' . $upper . '\' given.');
        }
    }

    /**
     * getForeignKeyBaseDeclaration
     * Obtain DBMS specific SQL code portion needed to set the FOREIGN KEY constraint
     * of a field declaration to be used in statements like CREATE TABLE.
     *
     * @param array $definition
     * @return string
     */
    public function getForeignKeyBaseDeclaration(array $definition)
    {
        $sql = '';
        if (isset($definition['name'])) {
            $sql .= 'CONSTRAINT ' . $this->conn->quoteIdentifier($this->conn->formatter->getForeignKeyName($definition['name'])) . ' ';
        }
        $sql .= 'FOREIGN KEY (';

        if ( ! isset($definition['local'])) {
            throw new Doctrine_Export_Exception('Local reference field missing from definition.');
        }
        if ( ! isset($definition['foreign'])) {
            throw new Doctrine_Export_Exception('Foreign reference field missing from definition.');
        }
        if ( ! isset($definition['foreignTable'])) {
            throw new Doctrine_Export_Exception('Foreign reference table missing from definition.');
        }

        if ( ! is_array($definition['local'])) {
            $definition['local'] = array($definition['local']);
        }
        if ( ! is_array($definition['foreign'])) {
            $definition['foreign'] = array($definition['foreign']);
        }

        $sql .= implode(', ', array_map(array($this->conn, 'quoteIdentifier'), $definition['local']))
              . ') REFERENCES '
              . $this->conn->quoteIdentifier($definition['foreignTable']) . '('
              . implode(', ', array_map(array($this->conn, 'quoteIdentifier'), $definition['foreign'])) . ')';

        return $sql;
    }

    /**
     * Obtain DBMS specific SQL code portion needed to set the UNIQUE constraint
     * of a field declaration to be used in statements like CREATE TABLE.
     *
     * @return string  DBMS specific SQL code portion needed to set the UNIQUE constraint
     *                 of a field declaration.
     */
    public function getUniqueFieldDeclaration()
    {
        return 'UNIQUE';
    }

    /**
     * Obtain DBMS specific SQL code portion needed to set the CHARACTER SET
     * of a field declaration to be used in statements like CREATE TABLE.
     *
     * @param string $charset   name of the charset
     * @return string  DBMS specific SQL code portion needed to set the CHARACTER SET
     *                 of a field declaration.
     */
    public function getCharsetFieldDeclaration($charset)
    {
        return '';
    }

    /**
     * Obtain DBMS specific SQL code portion needed to set the COLLATION
     * of a field declaration to be used in statements like CREATE TABLE.
     *
     * @param string $collation   name of the collation
     * @return string  DBMS specific SQL code portion needed to set the COLLATION
     *                 of a field declaration.
     */
    public function getCollationFieldDeclaration($collation)
    {
        return '';
    }

    /**
     * exportSchema
     * method for exporting Doctrine_Record classes to a schema
     *
     * if the directory parameter is given this method first iterates
     * recursively trhough the given directory in order to find any model classes
     *
     * Then it iterates through all declared classes and creates tables for the ones
     * that extend Doctrine_Record and are not abstract classes
     *
     * @throws Doctrine_Connection_Exception    if some error other than Doctrine_Core::ERR_ALREADY_EXISTS
     *                                          occurred during the create table operation
     * @param string $directory     optional directory parameter
     * @return void
     */
    public function exportSchema($directory = null)
    {
        if ($directory !== null) {
            $models = Doctrine_Core::filterInvalidModels(Doctrine_Core::loadModels($directory));
        } else {
            $models = Doctrine_Core::getLoadedModels();
        }

        $this->exportClasses($models);
    }

    public function exportSortedClassesSql($classes, $groupByConnection = true)
    {
         $connections = array();
         foreach ($classes as $class) {
             $connection = Doctrine_Manager::getInstance()->getConnectionForComponent($class);
             $connectionName = $connection->getName();

             if ( ! isset($connections[$connectionName])) {
                 $connections[$connectionName] = array(
                     'create_tables'    => array(),
                     'create_sequences' => array(),
                     'create_indexes'   => array(),
                     'alters'           => array(),
                     'create_triggers'  => array(),
                 );
             }

             $sql = $connection->export->exportClassesSql(array($class));

             // Build array of all the creates
             // We need these to happen first
             foreach ($sql as $key => $query) {
                 // If create table statement
                 if (substr($query, 0, strlen('CREATE TABLE')) == 'CREATE TABLE') {
                     $connections[$connectionName]['create_tables'][] = $query;

                     unset($sql[$key]);
                     continue;
                 }

                 // If create sequence statement
                 if (substr($query, 0, strlen('CREATE SEQUENCE')) == 'CREATE SEQUENCE') {
                     $connections[$connectionName]['create_sequences'][] = $query;

                     unset($sql[$key]);
                     continue;
                 }

                 // If create index statement
                 if (preg_grep("/CREATE ([^ ]* )?INDEX/", array($query))) {
                     $connections[$connectionName]['create_indexes'][] =  $query;

                     unset($sql[$key]);
                     continue;
                 }

                 // If alter table statement or oracle anonymous block enclosing alter
                 if (substr($query, 0, strlen('ALTER TABLE')) == 'ALTER TABLE'
                       || substr($query, 0, strlen('DECLARE')) == 'DECLARE') {
                     $connections[$connectionName]['alters'][] = $query;

                     unset($sql[$key]);
                     continue;
                 }

                 // If create trgger statement
                 if (substr($query, 0, strlen('CREATE TRIGGER')) == 'CREATE TRIGGER') {
                     $connections[$connectionName]['create_triggers'][] = $query;

                 	 unset($sql[$key]);
                     continue;
                 }

                 // If comment statement
                 if (substr($query, 0, strlen('COMMENT ON')) == 'COMMENT ON') {
                     $connections[$connectionName]['comments'][] = $query;

                     unset($sql[$key]);
                     continue;
                 }
             }
         }

         // Loop over all the sql again to merge everything together so it is in the correct order
         $build = array();
         foreach ($connections as $connectionName => $sql) {
             $build[$connectionName] = array_unique(array_merge($sql['create_tables'], $sql['create_sequences'], $sql['create_indexes'], $sql['alters'], $sql['create_triggers']));
         }

         if ( ! $groupByConnection) {
             $new = array();
             foreach($build as $connectionname => $sql) {
                 $new = array_unique(array_merge($new, $sql));
             }
             $build = $new;
         }
         return $build;
    }

    /**
     * exportClasses
     * method for exporting Doctrine_Record classes to a schema
     *
     * FIXME: This function has ugly hacks in it to make sure sql is inserted in the correct order.
     *
     * @throws Doctrine_Connection_Exception    if some error other than Doctrine_Core::ERR_ALREADY_EXISTS
     *                                          occurred during the create table operation
     * @param array $classes
     * @return void
     */
     public function exportClasses(array $classes)
     {
         $queries = $this->exportSortedClassesSql($classes);

         foreach ($queries as $connectionName => $sql) {
             $connection = Doctrine_Manager::getInstance()->getConnection($connectionName);

             $connection->beginTransaction();

             foreach ($sql as $query) {
                 try {
                     $connection->exec($query);
                 } catch (Doctrine_Connection_Exception $e) {
                     // we only want to silence table already exists errors
                     if ($e->getPortableCode() !== Doctrine_Core::ERR_ALREADY_EXISTS) {
                         $connection->rollback();
                         throw new Doctrine_Export_Exception($e->getMessage() . '. Failing Query: ' . $query);
                     }
                 }
             }

             $connection->commit();
         }
     }

    /**
     * exportClassesSql
     * method for exporting Doctrine_Record classes to a schema
     *
     * @throws Doctrine_Connection_Exception    if some error other than Doctrine_Core::ERR_ALREADY_EXISTS
     *                                          occurred during the create table operation
     * @param array $classes
     * @return void
     */
    public function exportClassesSql(array $classes)
    {
        $models = Doctrine_Core::filterInvalidModels($classes);
        
        $sql = array();
        
        foreach ($models as $name) {
            $record = new $name();
            $table = $record->getTable();
            $parents = $table->getOption('joinedParents');

            foreach ($parents as $parent) {
                $data  = $table->getConnection()->getTable($parent)->getExportableFormat();

                $query = $this->conn->export->createTableSql($data['tableName'], $data['columns'], $data['options']);

                $sql = array_merge($sql, (array) $query);
            }

            // Don't export the tables with attribute EXPORT_NONE'
            if ($table->getAttribute(Doctrine_Core::ATTR_EXPORT) === Doctrine_Core::EXPORT_NONE) {
                continue;
            }

            $data = $table->getExportableFormat();

            $query = $this->conn->export->createTableSql($data['tableName'], $data['columns'], $data['options']);

            if (is_array($query)) {
                $sql = array_merge($sql, $query);
            } else {
                $sql[] = $query;
            }

            if ($table->getAttribute(Doctrine_Core::ATTR_EXPORT) & Doctrine_Core::EXPORT_PLUGINS) {
                $sql = array_merge($sql, $this->exportGeneratorsSql($table));
            }
            
            // DC-474: Remove dummy $record from repository to not pollute it during export
            $table->getRepository()->evict($record->getOid());
            unset($record);
        }
        
        $sql = array_unique($sql);
        
        rsort($sql);

        return $sql;
    }

    /**
     * fetches all generators recursively for given table
     *
     * @param Doctrine_Table $table     table object to retrieve the generators from
     * @return array                    an array of Doctrine_Record_Generator objects
     */
    public function getAllGenerators(Doctrine_Table $table)
    {
        $generators = array();

        foreach ($table->getGenerators() as $name => $generator) {
            if ($generator === null) {
                continue;                     	
            }

            $generators[] = $generator;

            $generatorTable = $generator->getTable();
            
            if ($generatorTable instanceof Doctrine_Table) {
                $generators = array_merge($generators, $this->getAllGenerators($generatorTable));
            }
        }

        return $generators;
    }

    /**
     * exportGeneratorsSql
     * exports plugin tables for given table
     *
     * @param Doctrine_Table $table     the table in which the generators belong to
     * @return array                    an array of sql strings
     */
    public function exportGeneratorsSql(Doctrine_Table $table)
    {
    	$sql = array();

        foreach ($this->getAllGenerators($table) as $name => $generator) {
            $table = $generator->getTable();
            
            // Make sure plugin has a valid table
            if ($table instanceof Doctrine_Table) {
                $data = $table->getExportableFormat();

                $query = $this->conn->export->createTableSql($data['tableName'], $data['columns'], $data['options']);

                $sql = array_merge($sql, (array) $query);
            }
        }

        return $sql;
    }

    /**
     * exportSql
     * returns the sql for exporting Doctrine_Record classes to a schema
     *
     * if the directory parameter is given this method first iterates
     * recursively trhough the given directory in order to find any model classes
     *
     * Then it iterates through all declared classes and creates tables for the ones
     * that extend Doctrine_Record and are not abstract classes
     *
     * @throws Doctrine_Connection_Exception    if some error other than Doctrine_Core::ERR_ALREADY_EXISTS
     *                                          occurred during the create table operation
     * @param string $directory     optional directory parameter
     * @return void
     */
    public function exportSql($directory = null)
    {
        if ($directory !== null) {
            $models = Doctrine_Core::filterInvalidModels(Doctrine_Core::loadModels($directory));
        } else {
            $models = Doctrine_Core::getLoadedModels();
        }
        
        return $this->exportSortedClassesSql($models, false);
    }

    /**
     * exportTable
     * exports given table into database based on column and option definitions
     *
     * @throws Doctrine_Connection_Exception    if some error other than Doctrine_Core::ERR_ALREADY_EXISTS
     *                                          occurred during the create table operation
     * @return boolean                          whether or not the export operation was successful
     *                                          false if table already existed in the database
     */
    public function exportTable(Doctrine_Table $table)
    {
        try {
            $data = $table->getExportableFormat();

            $this->conn->export->createTable($data['tableName'], $data['columns'], $data['options']);
        } catch(Doctrine_Connection_Exception $e) {
            // we only want to silence table already exists errors
            if ($e->getPortableCode() !== Doctrine_Core::ERR_ALREADY_EXISTS) {
                throw $e;
            }
        }
    }
}