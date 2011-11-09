<?php
/*
 *  $Id: Mssql.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Export_Mssql
 *
 * @package     Doctrine
 * @subpackage  Export
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Lukas Smith <smith@pooteeweet.org> (PEAR MDB2 library)
 * @author      Frank M. Kromann <frank@kromann.info> (PEAR MDB2 Mssql driver)
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 */
class Doctrine_Export_Mssql extends Doctrine_Export
{
  /**
     * create a new database
     *
     * @param string $name name of the database that should be created
     * @return void
     */
    public function createDatabase($name)
    {
        $name = $this->conn->quoteIdentifier($name, true);
        $query = "CREATE DATABASE $name";
        $options = $this->conn->getOptions();
        if (isset($options['database_device']) && $options['database_device']) {
            $query.= ' ON '.$this->conn->options['database_device'];
            $query.= $this->conn->options['database_size'] ? '=' .
                     $this->conn->options['database_size'] : '';
        }
        return $this->conn->standaloneQuery($query, array(), true);
    }

    /**
     * drop an existing database
     *
     * @param string $name name of the database that should be dropped
     * @return void
     */
    public function dropDatabase($name)
    {
        $name = $this->conn->quoteIdentifier($name, true);
        return $this->conn->standaloneQuery('DROP DATABASE ' . $name, array(), true);
    }

    /**
     * Override the parent method.
     *
     * @return string The string required to be placed between "CREATE" and "TABLE"
     *                to generate a temporary table, if possible.
     */
    public function getTemporaryTableQuery()
    {
        return '';
    }  

    public function dropIndexSql($table, $name)
    {
        $name = $this->conn->quoteIdentifier($this->conn->formatter->getIndexName($name));
        $table = $this->conn->quoteIdentifier($table);

        return 'DROP INDEX ' . $name . ' ON ' . $table;
    }

    /**
     * alter an existing table
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
     *                                 be the same as defined by the Metabase parser.
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
     *                                 as defined by the Metabase parser.
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
        if ( !$name ) {
            throw new Doctrine_Export_Exception('no valid table name specified');
        }

        foreach ($changes as $changeName => $change) {
            switch ($changeName) {
                case 'add':
                case 'remove':
                case 'name':
                case 'rename':
                case 'change':
                    break;
                default:
                    throw new Doctrine_Export_Exception('alterTable: change type "' . $changeName . '" not yet supported');
            }
        }

        if( $check ) {
            return true;
        }


        $query = '';
        $post_queries = ''; //SQL Server uses a stored procedure to rename objects

        //NAME (TABLE)
        if( !empty($changes['name']) )
        {
            $change_name = $this->conn->quoteIdentifier($changes['name'], true);

            $post_queries .= sprintf(
                "EXECUTE sp_RENAME '%s', '%s';",
                $this->conn->quoteIdentifier($name),
                $change_name
            );
        }

        //ADD TABLE
        if ( ! empty($changes['add']) && is_array($changes['add'])) {
            foreach ($changes['add'] as $fieldName => $field) {
                if ($query) {
                    $query .= ', ';
                }
                $query .= 'ADD ' . $this->getDeclaration($fieldName, $field);
            }
        }

        //REMOVE TABLE
        if ( ! empty($changes['remove']) && is_array($changes['remove'])) {
                if ($query) {
                    $query .= ', ';
                }
            $query .= 'DROP COLUMN ';

            $dropped = array();
            foreach ($changes['remove'] as $fieldName => $field) {
                
                $field_name = $this->conn->quoteIdentifier($fieldName, true);
                $dropped[] = $fieldName;
            }

            $query .= implode(', ', $dropped) . ' ';
        }

        $rename = array();
        if ( ! empty($changes['rename']) && is_array($changes['rename'])) {
            foreach ($changes['rename'] as $fieldName => $field) {
                $rename[$field['name']] = $fieldName;
            }
        }

        //CHANGE (COLUMN DEFINITION)
        if ( ! empty($changes['change']) && is_array($changes['change'])) {
            if ($query) {
                $query.= ', ';
            }

            $query .= "ALTER COLUMN ";

            $altered = array();
            foreach ($changes['change'] as $fieldName => $field) {
                
                if (isset($rename[$fieldName])) {
                    $oldFieldName = $rename[$fieldName];
                    unset($rename[$fieldName]);
                } else {
                    $oldFieldName = $fieldName;
                }
                $oldFieldName = $this->conn->quoteIdentifier($oldFieldName, true);

                $altered[] = $this->getDeclaration($fieldName, $field['definition']);
            }

            $query .= implode(sprintf(
                "; ALTER TABLE %s ALTER COLUMN ",
                $this->conn->quoteIdentifier($name, true)
            ), $altered) . ' ';
        }

        //RENAME (COLUMN)
        if ( ! empty($rename) && is_array($rename)) {
            foreach ($rename as $renameName => $renamedField) {

                $field = $changes['rename'][$renamedField];
                $renamedField = $this->conn->quoteIdentifier($renamedField);

                $post_queries .= sprintf(
                    "EXECUTE sp_RENAME '%s.%s', '%s', 'COLUMN';",
                    $this->conn->quoteIdentifier($name),
                    $renamedField,
                    $this->conn->quoteIdentifier($field['name'], true)
                );
            }
        }

        if ( !$query && !$post_queries) {
            return false;
        }

        $name = $this->conn->quoteIdentifier($name, true);

        $final_query = '';
        if( $query )
        {
            $final_query .= 'ALTER TABLE ' . $name . ' ' . trim($query) . ';';
    }

        if( $post_queries )
        {
            $final_query .= $post_queries;
        }

        return $this->conn->exec($final_query);
    }

    /**
     * create sequence
     *
     * @param string $seqName name of the sequence to be created
     * @param string $start start value of the sequence; default is 1
     * @param array     $options  An associative array of table options:
     *                          array(
     *                              'comment' => 'Foo',
     *                              'charset' => 'utf8',
     *                              'collate' => 'utf8_unicode_ci',
     *                          );
     * @return string
     */
    public function createSequence($seqName, $start = 1, array $options = array())
    {
        $sequenceName = $this->conn->quoteIdentifier($this->conn->getSequenceName($seqName), true);
        $seqcolName = $this->conn->quoteIdentifier($this->conn->options['seqcol_name'], true);
        $query = 'CREATE TABLE ' . $sequenceName . ' (' . $seqcolName .
                 ' INT PRIMARY KEY CLUSTERED IDENTITY(' . $start . ', 1) NOT NULL)';

        $res = $this->conn->exec($query);

        if ($start == 1) {
            return true;
        }

        try {
            $query = 'SET IDENTITY_INSERT ' . $sequenceName . ' ON ' .
                     'INSERT INTO ' . $sequenceName . ' (' . $seqcolName . ') VALUES ( ' . $start . ')';
            $res = $this->conn->exec($query);
        } catch (Exception $e) {
            $result = $this->conn->exec('DROP TABLE ' . $sequenceName);
        }
        return true;
    }

    /**
     * This function drops an existing sequence
     *
     * @param string $seqName      name of the sequence to be dropped
     * @return void
     */
    public function dropSequenceSql($seqName)
    {
        $sequenceName = $this->conn->quoteIdentifier($this->conn->getSequenceName($seqName), true);
        return 'DROP TABLE ' . $sequenceName;
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

        if( !isset($options['primary']) ) //Use field declaration of primary if the primary option not set
        {
            foreach( $fields as $field_name => $field_data )
            {
                if( isset($field_data['primary']) && $field_data['primary'] )
                    $options['primary'][$field_name] = $field_name;
            }
        }

        if( isset($options['primary']) )
        {
            foreach( $options['primary'] as $field_name )
            {
                if( isset($fields[$field_name]) )
                {
                    $fields[$field_name]['notnull'] = true; //Silently forcing NOT NULL as MSSQL will kill a query that has a nullable PK
                }
            }
        }

        $queryFields = $this->getFieldDeclarationList($fields);

        if (isset($options['primary']) && ! empty($options['primary'])) {
            $primaryKeys = array_map(array($this->conn, 'quoteIdentifier'), array_values($options['primary']));
            $queryFields .= ', PRIMARY KEY(' . implode(', ', $primaryKeys) . ')';
        }

        $query = 'CREATE TABLE ' . $this->conn->quoteIdentifier($name, true) . ' (' . $queryFields;
        
        $check = $this->getCheckDeclaration($fields);

        if ( ! empty($check)) {
            $query .= ', ' . $check;
        }

        $query .= ')';

        $sql[] = $query;
        
        if (isset($options['indexes']) && ! empty($options['indexes'])) {
            foreach($options['indexes'] as $index => $definition) {
                if (is_array($definition)) {
                    $sql[] = $this->createIndexSql($name,$index, $definition);
                }
            }
        }
        
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
     * getNotNullFieldDeclaration
     * Obtain DBMS specific SQL code portion needed to set a NOT NULL
     * declaration to be used in statements like CREATE TABLE.
     *
     * @param array $field      field definition array
     * @return string           DBMS specific SQL code portion needed to set a default value
     */
    public function getNotNullFieldDeclaration(array $definition)
    {
        return (
            (isset($definition['notnull']) && $definition['notnull']) || 
            (isset($definition['primary']) && $definition['primary'])
        ) ? ' NOT NULL' : ' NULL';
    }
}