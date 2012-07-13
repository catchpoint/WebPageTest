<?php
/*
 *  $Id: Relation.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Relation
 * This class represents a relation between components
 *
 * @package     Doctrine
 * @subpackage  Relation
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
abstract class Doctrine_Relation implements ArrayAccess
{
    /**
     * RELATION CONSTANTS
     */

    /**
     * constant for ONE_TO_ONE and MANY_TO_ONE relationships
     */
    const ONE   = 0;
    
    /**
     * constant for MANY_TO_MANY and ONE_TO_MANY relationships
     */
    const MANY  = 1;
    
    // TRUE => mandatory, everything else is just a default value. this should be refactored
    // since TRUE can bot be used as a default value this way. All values should be default values.
    /**
     * @var array $definition   @see __construct()
     */
    protected $definition = array('alias'       => true,
                                  'foreign'     => true,
                                  'local'       => true,
                                  'class'       => true,
                                  'type'        => true,
                                  'table'       => true,
                                  'localTable'  => true,
                                  'name'        => null,
                                  'refTable'    => null,
                                  'onDelete'    => null,
                                  'onUpdate'    => null,
                                  'deferred'    => null,
                                  'deferrable'  => null,
                                  'constraint'  => null,
                                  'equal'       => false,
                                  'cascade'     => array(), // application-level cascades
                                  'owningSide'  => false, // whether this is the owning side
                                  'refClassRelationAlias' => null,
                                  'foreignKeyName' => null,
                                  'orderBy' => null
                                  );

    protected $_isRefClass = null;

    /**
     * constructor
     *
     * @param array $definition         an associative array with the following structure:
     *          name                    foreign key constraint name
     *
     *          local                   the local field(s)
     *
     *          foreign                 the foreign reference field(s)
     *
     *          table                   the foreign table object
     *
     *          localTable              the local table object
     *
     *          refTable                the reference table object (if any)
     *
     *          onDelete                referential delete action
     *  
     *          onUpdate                referential update action
     *
     *          deferred                deferred constraint checking 
     *
     *          alias                   relation alias
     *
     *          type                    the relation type, either Doctrine_Relation::ONE or Doctrine_Relation::MANY
     *
     *          constraint              boolean value, true if the relation has an explicit referential integrity constraint
     *
     *          foreignKeyName          the name of the dbms foreign key to create. Optional, if left blank Doctrine will generate one for you
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
     */
    public function __construct(array $definition)
    {
        $def = array();
        foreach ($this->definition as $key => $val) {
            if ( ! isset($definition[$key]) && $val) {
                throw new Doctrine_Exception($key . ' is required!');
            }
            if (isset($definition[$key])) {
                $def[$key] = $definition[$key];
            } else {
                $def[$key] = $this->definition[$key];          
            }
        }
        $this->definition = $def;
    }

    /**
     * hasConstraint
     * whether or not this relation has an explicit constraint
     *
     * @return boolean
     */
    public function hasConstraint()
    {
        return ($this->definition['constraint'] ||
                ($this->definition['onUpdate']) ||
                ($this->definition['onDelete']));
    }

    public function isDeferred()
    {
        return $this->definition['deferred'];
    }

    public function isDeferrable()
    {
        return $this->definition['deferrable'];
    }

    public function isEqual()
    {
        return $this->definition['equal'];
    }

    public function offsetExists($offset)
    {
        return isset($this->definition[$offset]);
    }

    public function offsetGet($offset)
    {
        if (isset($this->definition[$offset])) {
            return $this->definition[$offset];
        }
        
        return null;
    }

    public function offsetSet($offset, $value)
    {
        if (isset($this->definition[$offset])) {
            $this->definition[$offset] = $value;
        }
    }

    public function offsetUnset($offset)
    {
        $this->definition[$offset] = false;
    }

    /**
     * toArray
     *
     * @return array
     */
    public function toArray() 
    {
        return $this->definition;
    }

    /**
     * getAlias
     * returns the relation alias
     *
     * @return string
     */
    final public function getAlias()
    {
        return $this->definition['alias'];
    }

    /**
     * getType
     * returns the relation type, either 0 or 1
     *
     * @see Doctrine_Relation MANY_* and ONE_* constants
     * @return integer
     */
    final public function getType()
    {
        return $this->definition['type'];
    }
    
    /**
     * Checks whether this relation cascades deletions to the related objects
     * on the application level.
     *
     * @return boolean
     */
    public function isCascadeDelete()
    {
        return in_array('delete', $this->definition['cascade']);
    }

    /**
     * getTable
     * returns the foreign table object
     *
     * @return Doctrine_Table
     */
    final public function getTable()
    {
        return Doctrine_Manager::getInstance()
               ->getConnectionForComponent($this->definition['class'])
               ->getTable($this->definition['class']);
    }

    /**
     * getClass
     * returns the name of the related class
     *
     * @return string
     */
    final public function getClass()
    {
        return $this->definition['class'];
    }

    /**
     * getLocal
     * returns the name of the local column
     *
     * @return string
     */
    final public function getLocal()
    {
        return $this->definition['local'];
    }
    
    /**
     * getLocalFieldName
     * returns the field name of the local column
     */
    final public function getLocalFieldName()
    {
        return $this->definition['localTable']->getFieldName($this->definition['local']);
    }

    /**
     * getLocalColumnName
     * returns the column name of the local column
     *
     * @return string $columnName
     */
    final public function getLocalColumnName()
    {
        return $this->definition['localTable']->getColumnName($this->definition['local']);
    }

    /**
     * getForeign
     * returns the name of the foreignkey column where
     * the localkey column is pointing at
     *
     * @return string
     */
    final public function getForeign()
    {
        return $this->definition['foreign'];
    }
    
    /**
     * getLocalFieldName
     * returns the field name of the foreign column
     */
    final public function getForeignFieldName()
    {
        return $this->definition['table']->getFieldName($this->definition['foreign']);
    }

    /**
     * getForeignColumnName
     * returns the column name of the foreign column
     *
     * @return string $columnName
     */
    final public function getForeignColumnName()
    {
       return $this->definition['table']->getColumnName($this->definition['foreign']);
    }

    /**
     * isOneToOne
     * returns whether or not this relation is a one-to-one relation
     *
     * @return boolean
     */
    final public function isOneToOne()
    {
        return ($this->definition['type'] == Doctrine_Relation::ONE);
    }

    /**
     * getRelationDql
     *
     * @param integer $count
     * @return string
     */
    public function getRelationDql($count)
    {
        $component = $this->getTable()->getComponentName();

        $dql  = 'FROM ' . $component
              . ' WHERE ' . $component . '.' . $this->definition['foreign']
              . ' IN (' . substr(str_repeat('?, ', $count), 0, -2) . ')'
              . $this->getOrderBy($component);

        return $dql;
    }

    /**
     * fetchRelatedFor
     *
     * fetches a component related to given record
     *
     * @param Doctrine_Record $record
     * @return Doctrine_Record|Doctrine_Collection
     */
    abstract public function fetchRelatedFor(Doctrine_Record $record);

    /**
     * Get the name of the foreign key for this relationship
     *
     * @return string $foreignKeyName
     */
    public function getForeignKeyName()
    {
        if (isset($this->definition['foreignKeyName'])) {
            return $this->definition['foreignKeyName'];
        }
        return $this['localTable']->getConnection()->generateUniqueRelationForeignKeyName($this);
    }

    /**
     * Get the relationship orderby SQL/DQL
     *
     * @param string $alias        The alias to use
     * @param boolean $columnNames Whether or not to use column names instead of field names
     * @return string $orderBy
     */
    public function getOrderBy($alias = null, $columnNames = false)
    {
        if ( ! $alias) {
           $alias = $this->getTable()->getComponentName();
        }

        if ($orderBy = $this->getOrderByStatement($alias, $columnNames)) {
            return ' ORDER BY ' . $orderBy;
        }
    }

    /**
     * Get the relationship orderby statement
     *
     * @param string $alias        The alias to use
     * @param boolean $columnNames Whether or not to use column names instead of field names
     * @return string $orderByStatement
     */
    public function getOrderByStatement($alias = null, $columnNames = false)
    {
        $table = $this->getTable();

        if ( ! $alias) {
           $alias = $table->getComponentName();
        }

        if (isset($this->definition['orderBy'])) {
            return $table->processOrderBy($alias, $this->definition['orderBy'], $columnNames);
        } else {
            return $table->getOrderByStatement($alias, $columnNames);
        }
    }

    public function isRefClass()
    {
        if ($this->_isRefClass === null) {
            $this->_isRefClass = false;
            $table = $this->getTable();
            foreach ($table->getRelations() as $name => $relation) {
                foreach ($relation['table']->getRelations() as $relation) {
                    if (isset($relation['refTable']) && $relation['refTable'] === $table) {
                        $this->_isRefClass = true;
                        break(2);
                    }
                }
            }
        }

        return $this->_isRefClass;
    }

    /**
     * __toString
     *
     * @return string
     */
    public function __toString()
    {
        $r[] = "<pre>";
        foreach ($this->definition as $k => $v) {
            if (is_object($v)) {
                $v = 'Object(' . get_class($v) . ')';
            }
            $r[] = $k . ' : ' . $v;
        }
        $r[] = "</pre>";
        return implode("\n", $r);
    }
}