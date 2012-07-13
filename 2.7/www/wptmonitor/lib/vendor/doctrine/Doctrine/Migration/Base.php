<?php
/*
 *  $Id: Migration.php 1080 2007-02-10 18:17:08Z jwage $
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
 * Base migration class. All migration classes must extend from this base class
 *
 * @package     Doctrine
 * @subpackage  Migration
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.1
 * @version     $Revision: 1080 $
 * @author      Jonathan H. Wage <jonwage@gmail.com>
 */
abstract class Doctrine_Migration_Base
{
    /**
     * The default options for tables created using Doctrine_Migration_Base::createTable()
     * 
     * @var array
     */
    private static $defaultTableOptions = array();

    protected $_changes = array();

    protected static $_opposites = array('created_table'       => 'dropped_table',
                                         'dropped_table'       => 'created_table',
                                         'created_constraint'  => 'dropped_constraint',
                                         'dropped_constraint'  => 'created_constraint',
                                         'created_foreign_key' => 'dropped_foreign_key',
                                         'dropped_foreign_key' => 'created_foreign_key',
                                         'created_column'      => 'dropped_column',
                                         'dropped_column'      => 'created_column',
                                         'created_index'       => 'dropped_index',
                                         'dropped_index'       => 'created_index',
                                         );

    /**
     * Get the changes that have been added on this migration class instance
     *
     * @return array $changes
     */
    public function getChanges()
    {
        return $this->_changes;
    }

    public function getNumChanges()
    {
        return count($this->_changes);
    }

    /**
     * Add a change to the stack of changes to execute
     *
     * @param string $type    The type of change
     * @param array  $change   The array of information for the change 
     * @return void
     */
    protected function _addChange($type, array $change = array())
    {
        if (isset($change['upDown']) && $change['upDown'] !== null && isset(self::$_opposites[$type])) {
            $upDown = $change['upDown'];
            unset($change['upDown']);
            if ($upDown == 'down') {
                $opposite = self::$_opposites[$type];
                return $this->_changes[] = array($opposite, $change);
            }
        }
        return $this->_changes[] = array($type, $change);
    }

    /**
     * Sets the default options for tables created using Doctrine_Migration_Base::createTable()
     * 
     * @param array $options
     */
    public static function setDefaultTableOptions(array $options)
    {
        self::$defaultTableOptions = $options;
    }

    /**
     * Returns the default options for tables created using Doctrine_Migration_Base::createTable()
     * 
     * @return array
     */
    public static function getDefaultTableOptions()
    {
        return self::$defaultTableOptions;
    }

    /**
     * Add a create or drop table change.
     *
     * @param string $upDown     Whether to add the up(create) or down(drop) table change.
     * @param string $tableName  Name of the table
     * @param array  $fields     Array of fields for table
     * @param array  $options    Array of options for the table
     * @return void
     */
    public function table($upDown, $tableName, array $fields = array(), array $options = array())
    {
        $options = get_defined_vars();

        $this->_addChange('created_table', $options);
    }

    /**
     * Add a create table change.
     *
     * @param string $tableName  Name of the table
     * @param array  $fields     Array of fields for table
     * @param array  $options    Array of options for the table
     * @return void
     */
    public function createTable($tableName, array $fields = array(), array $options = array())
    {
        $this->table('up', $tableName, $fields, array_merge(self::getDefaultTableOptions(), $options));
    }

    /**
     * Add a drop table change.
     *
     * @param string $tableName  Name of the table
     * @return void
     */
    public function dropTable($tableName)
    {
        $this->table('down', $tableName);
    }

    /**
     * Add a rename table change
     *
     * @param string $oldTableName      Name of the table to change
     * @param string $newTableName      Name to change the table to
     * @return void
     */
    public function renameTable($oldTableName, $newTableName)
    {
        $options = get_defined_vars();
        
        $this->_addChange('renamed_table', $options);
    }

    /**
     * Add a create or drop constraint change.
     *
     * @param string $upDown            Whether to add the up(create) or down(drop) create change.
     * @param string $tableName         Name of the table.
     * @param string $constraintName    Name of the constraint.
     * @param array  $definition        Array for the constraint definition.
     * @return void
     */
    public function constraint($upDown, $tableName, $constraintName, array $definition)
    {
        $options = get_defined_vars();
        
        $this->_addChange('created_constraint', $options);
    }

    /**
     * Add a create constraint change.
     *
     * @param string $tableName         Name of the table.
     * @param string $constraintname    Name of the constraint.
     * @param array  $definition        Array for the constraint definition.
     * @return void
     */
    public function createConstraint($tableName, $constraintName, array $definition)
    {
        $this->constraint('up', $tableName, $constraintName, $definition);
    }

    /**
     * Add a drop constraint change.
     *
     * @param string $tableName         Name of the table.
     * @param string $constraintname    Name of the constraint.
     * @return void
     */
    public function dropConstraint($tableName, $constraintName, $primary = false)
    {
        $this->constraint('down', $tableName, $constraintName, array('primary' => $primary));
    }

    /**
     * Convenience method for creating or dropping primary keys.
     *
     * @param string $direction 
     * @param string $tableName     Name of the table
     * @param string $columnNames   Array of column names and column definitions
     * @return void
     */
    public function primaryKey($direction, $tableName, $columnNames)
    {
        if ($direction == 'up') {
            $this->createPrimaryKey($tableName, $columnNames);
        } else {
            $this->dropPrimaryKey($tableName, $columnNames);
        }
    }

    /**
     * Convenience method for creating primary keys
     *
     *     [php]
     *     $columns = array(
     *         'id' => array(
     *             'type' => 'integer
     *             'autoincrement' => true
     *          )
     *     );
     *     $this->createPrimaryKey('my_table', $columns);
     *
     * Equivalent to doing:
     *
     *  * Add new columns (addColumn())
     *  * Create primary constraint on columns (createConstraint())
     *  * Change autoincrement = true field to be autoincrement
     * 
     * @param string $tableName     Name of the table
     * @param string $columnNames   Array of column names and column definitions
     * @return void
     */
    public function createPrimaryKey($tableName, $columnNames)
    {
        $autoincrement = false;
        $fields = array();

        // Add the columns
        foreach ($columnNames as $columnName => $def) {
            $type = $def['type'];
            $length = isset($def['length']) ? $def['length'] : null;
            $options = isset($def['options']) ? $def['options'] : array();

            $this->addColumn($tableName, $columnName, $type, $length, $options);

            $fields[$columnName] = array();

            if (isset($def['autoincrement'])) {
                $autoincrement = true;
                $autoincrementColumn = $columnName;
                $autoincrementType = $type;
                $autoincrementLength = $length;
                $autoincrementOptions = $options;
                $autoincrementOptions['autoincrement'] = true;
            }
        }

        // Create the primary constraint for the columns
        $this->createConstraint($tableName, null, array(
            'primary' => true,
            'fields' => $fields
        ));

        // If auto increment change the column to be so
        if ($autoincrement) {
            $this->changeColumn($tableName, $autoincrementColumn, $autoincrementType, $autoincrementLength, $autoincrementOptions);
        }
    }

    /**
     * Convenience method for dropping primary keys.
     *
     *     [php]
     *     $columns = array(
     *         'id' => array(
     *             'type' => 'integer
     *             'autoincrement' => true
     *          )
     *     );
     *     $this->dropPrimaryKey('my_table', $columns);
     *
     * Equivalent to doing:
     *
     *  * Change autoincrement column so it's not (changeColumn())
     *  * Remove primary constraint (dropConstraint())
     *  * Removing columns (removeColumn())
     *
     * @param string $tableName     Name of the table
     * @param string $columnNames   Array of column names and column definitions
     * @return void
     */
    public function dropPrimaryKey($tableName, $columnNames)
    {
        // un-autoincrement
        foreach ((array) $columnNames as $columnName => $def) {
            if (isset($def['autoincrement'])) {
                $changeDef = $def;
                unset($changeDef['autoincrement']);
                $this->changeColumn($tableName, $columnName, $changeDef['type'], $changeDef['length'], $changeDef);
            }
        }

        // Remove primary constraint
        $this->dropConstraint($tableName, null, true);

        // Remove columns
        foreach (array_keys((array) $columnNames) as $columnName) {
            $this->removeColumn($tableName, $columnName);
        }
    }

    /**
     * Add a create or drop foreign key change.
     *
     * @param string $upDown        Whether to add the up(create) or down(drop) foreign key change.
     * @param string $tableName     Name of the table.
     * @param string $name          Name of the foreign key.
     * @param array  $definition    Array for the foreign key definition
     * @return void
     */
    public function foreignKey($upDown, $tableName, $name, array $definition = array())
    {
        $definition['name'] = $name;
        $options = get_defined_vars();

        $this->_addChange('created_foreign_key', $options);
    }

    /**
     * Add a create foreign key change.
     *
     * @param string $tableName     Name of the table.
     * @param string $name          Name of the foreign key.
     * @param array  $definition    Array for the foreign key definition
     * @return void
     */
    public function createForeignKey($tableName, $name, array $definition)
    {
        $this->foreignKey('up', $tableName, $name, $definition);
    }

    /**
     * Add a drop foreign key change.
     *
     * @param string $tableName     Name of the table.
     * @param string $name          Name of the foreign key.
     * @return void
     */
    public function dropForeignKey($tableName, $name)
    {
        $this->foreignKey('down', $tableName, $name);
    }

    /**
     * Add a add or remove column change.
     *
     * @param string $upDown        Whether to add the up(add) or down(remove) column change.
     * @param string $tableName     Name of the table
     * @param string $columnName    Name of the column
     * @param string $type          Type of the column
     * @param string $length        Length of the column
     * @param array  $options       Array of options for the column
     * @return void
     */
    public function column($upDown, $tableName, $columnName, $type = null, $length = null, array $options = array())
    {
        $options = get_defined_vars();
        if ( ! isset($options['options']['length'])) {
            $options['options']['length'] = $length;
        }
        $options = array_merge($options, $options['options']);
        unset($options['options']);

        $this->_addChange('created_column', $options);
    }

    /**
     * Add a add column change.
     *
     * @param string $tableName     Name of the table
     * @param string $columnName    Name of the column
     * @param string $type          Type of the column
     * @param string $length        Length of the column
     * @param array  $options       Array of options for the column
     * @return void
     */
    public function addColumn($tableName, $columnName, $type, $length = null, array $options = array())
    {
        $this->column('up', $tableName, $columnName, $type, $length, $options);
    }

    /**
     * Add a remove column change.
     *
     * @param string $tableName     Name of the table
     * @param string $columnName    Name of the column
     * @return void
     */
    public function removeColumn($tableName, $columnName)
    {
        $this->column('down', $tableName, $columnName);
    }

    /**
     * Add a rename column change
     *
     * @param string $tableName         Name of the table to rename the column on
     * @param string $oldColumnName     The old column name
     * @param string $newColumnName     The new column name
     * @return void
     */
    public function renameColumn($tableName, $oldColumnName, $newColumnName)
    {
        $options = get_defined_vars();
        
        $this->_addChange('renamed_column', $options);
    }

    /**
     * Add a change column change
     *
     * @param string $tableName     Name of the table to change the column on
     * @param string $columnName    Name of the column to change
     * @param string $type          New type of column
     * @param string $length        The length of the column
     * @param array  $options       New options for the column
     * @return void
     */
    public function changeColumn($tableName, $columnName, $type = null, $length = null, array $options = array())
    {
        $options = get_defined_vars();
        $options['options']['length'] = $length;

        $this->_addChange('changed_column', $options);
    }

    /**
     * Add a add or remove index change.
     *
     * @param string $upDown       Whether to add the up(add) or down(remove) index change.
     * @param string $tableName    Name of the table
     * @param string $indexName    Name of the index
     * @param array  $definition   Array for the index definition
     * @return void
     */
    public function index($upDown, $tableName, $indexName, array $definition = array())
    {
        $options = get_defined_vars();
        
        $this->_addChange('created_index', $options);
    }

    /**
     * Add a add index change.
     *
     * @param string $tableName    Name of the table
     * @param string $indexName    Name of the index
     * @param array  $definition   Array for the index definition
     * @return void
     */
    public function addIndex($tableName, $indexName, array $definition)
    {
        $this->index('up', $tableName, $indexName, $definition);
    }

    /**
     * Add a remove index change.
     *
     * @param string $tableName    Name of the table
     * @param string $indexName    Name of the index
     * @return void
     */
    public function removeIndex($tableName, $indexName)
    {
        $this->index('down', $tableName, $indexName);
    }

    public function preUp()
    {
    }

    public function postUp()
    {
    }

    public function preDown()
    {
    }

    public function postDown()
    {
    }
}