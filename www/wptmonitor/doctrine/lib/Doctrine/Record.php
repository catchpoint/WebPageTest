<?php
/*
 *  $Id: Record.php 7491 2010-03-29 21:01:59Z jwage $
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
 * Doctrine_Record
 * All record classes should inherit this super class
 *
 * @package     Doctrine
 * @subpackage  Record
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7491 $
 */
abstract class Doctrine_Record extends Doctrine_Record_Abstract implements Countable, IteratorAggregate, Serializable
{
    /**
     * STATE CONSTANTS
     */

    /**
     * DIRTY STATE
     * a Doctrine_Record is in dirty state when its properties are changed
     */
    const STATE_DIRTY       = 1;

    /**
     * TDIRTY STATE
     * a Doctrine_Record is in transient dirty state when it is created
     * and some of its fields are modified but it is NOT yet persisted into database
     */
    const STATE_TDIRTY      = 2;

    /**
     * CLEAN STATE
     * a Doctrine_Record is in clean state when all of its properties are loaded from the database
     * and none of its properties are changed
     */
    const STATE_CLEAN       = 3;

    /**
     * PROXY STATE
     * a Doctrine_Record is in proxy state when its properties are not fully loaded
     */
    const STATE_PROXY       = 4;

    /**
     * NEW TCLEAN
     * a Doctrine_Record is in transient clean state when it is created and none of its fields are modified
     */
    const STATE_TCLEAN      = 5;

    /**
     * LOCKED STATE
     * a Doctrine_Record is temporarily locked during deletes and saves
     *
     * This state is used internally to ensure that circular deletes
     * and saves will not cause infinite loops
     */
    const STATE_LOCKED     = 6;

 	/**
 	 * TLOCKED STATE
 	 * a Doctrine_Record is temporarily locked (and transient) during deletes and saves
 	 *
 	 * This state is used internally to ensure that circular deletes
 	 * and saves will not cause infinite loops
 	 */
 	const STATE_TLOCKED     = 7;


    /**
     * @var Doctrine_Node_<TreeImpl>        node object
     */
    protected $_node;

    /**
     * @var integer $_id                    the primary keys of this object
     */
    protected $_id           = array();

    /**
     * each element is one of 3 following types:
     * - simple type (int, string) - field has a scalar value
     * - null - field has NULL value in DB
     * - Doctrine_Null - field value is unknown, it wasn't loaded yet
     *
     * @var array $_data                    the record data
     */
    protected $_data         = array();

    /**
     * @var array $_values                  the values array, aggregate values and such are mapped into this array
     */
    protected $_values       = array();

    /**
     * @var integer $_state                 the state of this record
     * @see STATE_* constants
     */
    protected $_state;

    /**
     * @var array $_lastModified             an array containing field names that were modified in the previous transaction
     */
    protected $_lastModified = array();

    /**
     * @var array $_modified                an array containing field names that have been modified
     * @todo Better name? $_modifiedFields?
     */
    protected $_modified     = array();

    /**
     * @var array $_oldValues               an array of the old values from set properties
     */
    protected $_oldValues   = array();

    /**
     * @var Doctrine_Validator_ErrorStack   error stack object
     */
    protected $_errorStack;

    /**
     * @var array $_references              an array containing all the references
     */
    protected $_references     = array();

    /**
     * Doctrine_Collection of objects needing to be deleted on save
     *
     * @var string
     */
    protected $_pendingDeletes = array();
    
    /**
     * Array of pending un links in format alias => keys to be executed after save
     *
     * @var array $_pendingUnlinks
     */
    protected $_pendingUnlinks = array();

    /**
     * Array of custom accessors for cache
     *
     * @var array
     */
    protected static $_customAccessors = array();

    /**
     * Array of custom mutators for cache
     *
     * @var array
     */
    protected static $_customMutators = array();

    /**
     * Whether or not to serialize references when a Doctrine_Record is serialized
     *
     * @var boolean
     */
    protected $_serializeReferences = false;

    /**
     * Array containing the save hooks and events that have been invoked
     *
     * @var array
     */
    protected $_invokedSaveHooks = false;

    /**
     * @var integer $index                  this index is used for creating object identifiers
     */
    private static $_index = 1;

    /**
     * @var integer $oid                    object identifier, each Record object has a unique object identifier
     */
    private $_oid;

    /**
     * constructor
     * @param Doctrine_Table|null $table       a Doctrine_Table object or null,
     *                                         if null the table object is retrieved from current connection
     *
     * @param boolean $isNewEntry              whether or not this record is transient
     *
     * @throws Doctrine_Connection_Exception   if object is created using the new operator and there are no
     *                                         open connections
     * @throws Doctrine_Record_Exception       if the cleanData operation fails somehow
     */
    public function __construct($table = null, $isNewEntry = false)
    {
        if (isset($table) && $table instanceof Doctrine_Table) {
            $this->_table = $table;
            $exists = ( ! $isNewEntry);
        } else {
            // get the table of this class
            $class = get_class($this);
            $this->_table = Doctrine_Core::getTable($class);
            $exists = false;
        }

        // Check if the current connection has the records table in its registry
        // If not this record is only used for creating table definition and setting up
        // relations.
        if ( ! $this->_table->getConnection()->hasTable($this->_table->getComponentName())) {
            return;
        }

        $this->_oid = self::$_index;

        self::$_index++;

        // get the data array
        $this->_data = $this->_table->getData();

        // get the column count
        $count = count($this->_data);

        $this->_values = $this->cleanData($this->_data);

        $this->prepareIdentifiers($exists);

        if ( ! $exists) {
            if ($count > count($this->_values)) {
                $this->_state = Doctrine_Record::STATE_TDIRTY;
            } else {
                $this->_state = Doctrine_Record::STATE_TCLEAN;
            }

            // set the default values for this record
            $this->assignDefaultValues();
        } else {
            $this->_state = Doctrine_Record::STATE_CLEAN;

            if ($this->isInProxyState()) {
                $this->_state  = Doctrine_Record::STATE_PROXY;
            }
        }

        $repository = $this->_table->getRepository();
        
        // Fix for #1682 and #1841.
        // Doctrine_Table does not have the repository yet during dummy record creation.
        if ($repository) {
            $repository->add($this);
            $this->construct();
        }
    }

    /**
     * Set whether or not to serialize references.
     * This is used by caching since we want to serialize references when caching
     * but not when just normally serializing a instance
     *
     * @param boolean $bool
     * @return boolean $bool
     */
    public function serializeReferences($bool = null)
    {
        if ( ! is_null($bool)) {
            $this->_serializeReferences = $bool;
        }
        return $this->_serializeReferences;
    }

    /**
     * the current instance counter used to generate unique ids for php objects. Contains the next identifier.
     *
     * @return integer
     */
    public static function _index()
    {
        return self::$_index;
    }

    /**
     * setUp
     * this method is used for setting up relations and attributes
     * it should be implemented by child classes
     *
     * @return void
     */
    public function setUp()
    { }
    /**
     * construct
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the constructor procedure
     *
     * @return void
     */
    public function construct()
    { }

    /**
     * @see $_oid;
     *
     * @return integer  the object identifier
     */
    public function getOid()
    {
        return $this->_oid;
    }

    public function oid()
    {
        return $this->_oid;
    }

    /**
     * calls a subclass hook. Idempotent until @see clearInvokedSaveHooks() is called.
     *
     * <code>
     * $this->invokeSaveHooks('pre', 'save');
     * </code>
     *
     * @param string $when           'post' or 'pre'
     * @param string $type           serialize, unserialize, save, delete, update, insert, validate, dqlSelect, dqlDelete, hydrate
     * @param Doctrine_Event $event  event raised
     * @return Doctrine_Event        the event generated using the type, if not specified
     */
    public function invokeSaveHooks($when, $type, $event = null)
    {
        $func = $when . ucfirst($type);

        if (is_null($event)) {
            $constant = constant('Doctrine_Event::RECORD_' . strtoupper($type));
            //echo $func . " - " . 'Doctrine_Event::RECORD_' . strtoupper($type) . "\n";
            $event = new Doctrine_Event($this, $constant);
        }

        if ( ! isset($this->_invokedSaveHooks[$func])) {
            $this->$func($event);
            $this->getTable()->getRecordListener()->$func($event);

            $this->_invokedSaveHooks[$func] = $event;
        } else {
            $event = $this->_invokedSaveHooks[$func];
        }

        return $event;
    }

    /**
     * makes all the already used save hooks available again
     */
    public function clearInvokedSaveHooks()
    {
        $this->_invokedSaveHooks = array();
    }

    /**
     * tests validity of the record using the current data.
     *
     * @param boolean $deep   run the validation process on the relations
     * @param boolean $hooks  invoke save hooks before start
     * @return boolean        whether or not this record is valid
     */
    public function isValid($deep = false, $hooks = true)
    {
        if ( ! $this->_table->getAttribute(Doctrine_Core::ATTR_VALIDATE)) {
            return true;
        }

        if ($this->_state == self::STATE_LOCKED || $this->_state == self::STATE_TLOCKED) {
            return true;
        }

        if ($hooks) {
            $this->invokeSaveHooks('pre', 'save');
            $this->invokeSaveHooks('pre', $this->exists() ? 'update' : 'insert');
        }

        // Clear the stack from any previous errors.
        $this->getErrorStack()->clear();

        // Run validation process
        $event = new Doctrine_Event($this, Doctrine_Event::RECORD_VALIDATE);
        $this->preValidate($event);
        $this->getTable()->getRecordListener()->preValidate($event);
        
        if ( ! $event->skipOperation) {
        
            $validator = new Doctrine_Validator();
            $validator->validateRecord($this);
            $this->validate();
            if ($this->_state == self::STATE_TDIRTY || $this->_state == self::STATE_TCLEAN) {
                $this->validateOnInsert();
            } else {
                $this->validateOnUpdate();
            }
        }

        $this->getTable()->getRecordListener()->postValidate($event);
        $this->postValidate($event);

        $valid = $this->getErrorStack()->count() == 0 ? true : false;
        if ($valid && $deep) {
            $stateBeforeLock = $this->_state;
            $this->_state = $this->exists() ? self::STATE_LOCKED : self::STATE_TLOCKED;

            foreach ($this->_references as $reference) {
                if ($reference instanceof Doctrine_Record) {
                    if ( ! $valid = $reference->isValid($deep)) {
                        break;
                    }
                } else if ($reference instanceof Doctrine_Collection) {
                    foreach ($reference as $record) {
                        if ( ! $valid = $record->isValid($deep)) {
                            break;
                        }
                    }
                }
            }
            $this->_state = $stateBeforeLock;
        }

        return $valid;
    }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the validation procedure, doing any custom / specialized
     * validations that are neccessary.
     */
    protected function validate()
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the validation procedure only when the record is going to be
     * updated.
     */
    protected function validateOnUpdate()
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the validation procedure only when the record is going to be
     * inserted into the data store the first time.
     */
    protected function validateOnInsert()
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the serializing procedure.
     */
    public function preSerialize($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the serializing procedure.
     */
    public function postSerialize($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the serializing procedure.
     */
    public function preUnserialize($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the serializing procedure.
     */
    public function postUnserialize($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the saving procedure.
     */
    public function preSave($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the saving procedure.
     */
    public function postSave($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the deletion procedure.
     */
    public function preDelete($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the deletion procedure.
     */
    public function postDelete($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the saving procedure only when the record is going to be
     * updated.
     */
    public function preUpdate($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the saving procedure only when the record is going to be
     * updated.
     */
    public function postUpdate($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the saving procedure only when the record is going to be
     * inserted into the data store the first time.
     */
    public function preInsert($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the saving procedure only when the record is going to be
     * inserted into the data store the first time.
     */
    public function postInsert($event)
    { }

    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the validation procedure. Useful for cleaning up data before 
     * validating it.
     */
    public function preValidate($event)
    { }
    /**
     * Empty template method to provide concrete Record classes with the possibility
     * to hook into the validation procedure.
     */
    public function postValidate($event)
    { }

    /**
     * Empty template method to provide Record classes with the ability to alter DQL select
     * queries at runtime
     */
    public function preDqlSelect($event)
    { }

    /**
     * Empty template method to provide Record classes with the ability to alter DQL update
     * queries at runtime
     */
    public function preDqlUpdate($event)
    { }

    /**
     * Empty template method to provide Record classes with the ability to alter DQL delete
     * queries at runtime
     */
    public function preDqlDelete($event)
    { }

    /**
     * Empty template method to provide Record classes with the ability to alter hydration 
     * before it runs
     */
    public function preHydrate($event)
    { }

    /**
     * Empty template method to provide Record classes with the ability to alter hydration 
     * after it runs
     */
    public function postHydrate($event)
    { }

    /**
     * Get the record error stack as a human readable string.
     * Useful for outputting errors to user via web browser
     *
     * @return string $message
     */
    public function getErrorStackAsString()
    {
        $errorStack = $this->getErrorStack();

        if (count($errorStack)) {
            $message = sprintf("Validation failed in class %s\n\n", get_class($this));

            $message .= "  " . count($errorStack) . " field" . (count($errorStack) > 1 ?  's' : null) . " had validation error" . (count($errorStack) > 1 ?  's' : null) . ":\n\n";
            foreach ($errorStack as $field => $errors) {
                $message .= "    * " . count($errors) . " validator" . (count($errors) > 1 ?  's' : null) . " failed on $field (" . implode(", ", $errors) . ")\n";
            }
            return $message;
        } else {
            return false;
        }
    }

    /**
     * retrieves the ErrorStack. To be called after a failed validation attempt (@see isValid()).
     *
     * @return Doctrine_Validator_ErrorStack    returns the errorStack associated with this record
     */
    public function getErrorStack()
    {
        if ( ! $this->_errorStack) {
            $this->_errorStack = new Doctrine_Validator_ErrorStack(get_class($this));
        }
        
        return $this->_errorStack;
    }

    /**
     * assigns the ErrorStack or returns it if called without parameters
     *
     * @param Doctrine_Validator_ErrorStack          errorStack to be assigned for this record
     * @return void|Doctrine_Validator_ErrorStack    returns the errorStack associated with this record
     */
    public function errorStack($stack = null)
    {
        if ($stack !== null) {
            if ( ! ($stack instanceof Doctrine_Validator_ErrorStack)) {
               throw new Doctrine_Record_Exception('Argument should be an instance of Doctrine_Validator_ErrorStack.');
            }
            $this->_errorStack = $stack;
        } else {
            return $this->getErrorStack();
        }
    }

    /**
     * Assign the inheritance column values
     *
     * @return void
     */
    public function assignInheritanceValues()
    {
        $map = $this->_table->inheritanceMap;
        foreach ($map as $k => $v) {
            $k = $this->_table->getFieldName($k);
            $old = $this->get($k, false);

            if (((string) $old !== (string) $v || $old === null) && !in_array($k, $this->_modified)) {
                $this->set($k, $v);
            }
        }
    }

    /**
     * setDefaultValues
     * sets the default values for records internal data
     *
     * @param boolean $overwrite                whether or not to overwrite the already set values
     * @return boolean
     */
    public function assignDefaultValues($overwrite = false)
    {
        if ( ! $this->_table->hasDefaultValues()) {
            return false;
        }
        foreach ($this->_data as $column => $value) {
            $default = $this->_table->getDefaultValueOf($column);

            if ($default === null) {
                continue;
            }

            if ($value === self::$_null || $overwrite) {
                $this->_data[$column] = $default;
                $this->_modified[]    = $column;
                $this->_state = Doctrine_Record::STATE_TDIRTY;
            }
        }
    }

    /**
     * cleanData
     * leaves the $data array only with values whose key is a field inside this
     * record and returns the values that were removed from $data.  Also converts
     * any values of 'null' to objects of type Doctrine_Null.
     *
     * @param array $data   data array to be cleaned
     * @return array        values cleaned from data
     */
    public function cleanData(&$data)
    {
        $tmp = $data;
        $data = array();

        foreach ($this->getTable()->getFieldNames() as $fieldName) {
            if (isset($tmp[$fieldName])) {
                $data[$fieldName] = $tmp[$fieldName];
            } else if (array_key_exists($fieldName, $tmp)) {
                $data[$fieldName] = null;
            } else if ( !isset($this->_data[$fieldName])) {
                $data[$fieldName] = self::$_null;
            }
            unset($tmp[$fieldName]);
        }

        return $tmp;
    }

    /**
     * hydrate
     * hydrates this object from given array
     *
     * @param array $data
     * @param boolean $overwriteLocalChanges  whether to overwrite the unsaved (dirty) data
     * @return void
     */
    public function hydrate(array $data, $overwriteLocalChanges = true)
    {
        if ($overwriteLocalChanges) {
            $this->_values = array_merge($this->_values, $this->cleanData($data));
            $this->_data = array_merge($this->_data, $data);
            $this->_modified = array();
            $this->_oldValues = array();
        } else {
            $this->_values = array_merge($this->cleanData($data), $this->_values);
            $this->_data = array_merge($data, $this->_data);
        }

        if (!$this->isModified() && $this->isInProxyState()) {
            $this->_state = self::STATE_PROXY;
        }
    }

    /**
     * prepareIdentifiers
     * prepares identifiers for later use
     *
     * @param boolean $exists               whether or not this record exists in persistent data store
     * @return void
     */
    private function prepareIdentifiers($exists = true)
    {
        switch ($this->_table->getIdentifierType()) {
            case Doctrine_Core::IDENTIFIER_AUTOINC:
            case Doctrine_Core::IDENTIFIER_SEQUENCE:
            case Doctrine_Core::IDENTIFIER_NATURAL:
                $name = $this->_table->getIdentifier();
                if (is_array($name)) {
                    $name = $name[0];
                }
                if ($exists) {
                    if (isset($this->_data[$name]) && $this->_data[$name] !== self::$_null) {
                        $this->_id[$name] = $this->_data[$name];
                    }
                }
                break;
            case Doctrine_Core::IDENTIFIER_COMPOSITE:
                $names = $this->_table->getIdentifier();

                foreach ($names as $name) {
                    if ($this->_data[$name] === self::$_null) {
                        $this->_id[$name] = null;
                    } else {
                        $this->_id[$name] = $this->_data[$name];
                    }
                }
                break;
        }
    }

    /**
     * serialize
     * this method is automatically called when an instance of Doctrine_Record is serialized
     *
     * @return string
     */
    public function serialize()
    {
        $event = new Doctrine_Event($this, Doctrine_Event::RECORD_SERIALIZE);

        $this->preSerialize($event);
        $this->getTable()->getRecordListener()->preSerialize($event);

        $vars = get_object_vars($this);

        if ( ! $this->serializeReferences()) {
            unset($vars['_references']);
        }
        unset($vars['_table']);
        unset($vars['_errorStack']);
        unset($vars['_filter']);
        unset($vars['_node']);

        $data = $this->_data;
        if ($this->exists()) {
            $data = array_merge($data, $this->_id);
        }

        foreach ($data as $k => $v) {
            if ($v instanceof Doctrine_Record && $this->_table->getTypeOf($k) != 'object') {
                unset($vars['_data'][$k]);
            } elseif ($v === self::$_null) {
                unset($vars['_data'][$k]);
            } else {
                switch ($this->_table->getTypeOf($k)) {
                    case 'array':
                    case 'object':
                        $vars['_data'][$k] = serialize($vars['_data'][$k]);
                        break;
                    case 'gzip':
                        $vars['_data'][$k] = gzcompress($vars['_data'][$k]);
                        break;
                }
            }
        }

        $str = serialize($vars);

        $this->postSerialize($event);
        $this->getTable()->getRecordListener()->postSerialize($event);

        return $str;
    }

    /**
     * this method is automatically called everytime an instance is unserialized
     *
     * @param string $serialized                Doctrine_Record as serialized string
     * @throws Doctrine_Record_Exception        if the cleanData operation fails somehow
     * @return void
     */
    public function unserialize($serialized)
    {
        $event = new Doctrine_Event($this, Doctrine_Event::RECORD_UNSERIALIZE);
        
        $manager    = Doctrine_Manager::getInstance();
        $connection = $manager->getConnectionForComponent(get_class($this));

        $this->_oid = self::$_index;
        self::$_index++;

        $this->_table = $connection->getTable(get_class($this));
        
        $this->preUnserialize($event);
        $this->getTable()->getRecordListener()->preUnserialize($event);

        $array = unserialize($serialized);

        foreach($array as $k => $v) {
            $this->$k = $v;
        }

        foreach ($this->_data as $k => $v) {
            switch ($this->_table->getTypeOf($k)) {
                case 'array':
                case 'object':
                    $this->_data[$k] = unserialize($this->_data[$k]);
                    break;
                case 'gzip':
                   $this->_data[$k] = gzuncompress($this->_data[$k]);
                    break;
                case 'enum':
                    $this->_data[$k] = $this->_table->enumValue($k, $this->_data[$k]);
                    break;

            }
        }

        $this->_table->getRepository()->add($this);

        $this->cleanData($this->_data);

        $this->prepareIdentifiers($this->exists());

        $this->postUnserialize($event);
        $this->getTable()->getRecordListener()->postUnserialize($event);
    }

    /**
     * assigns the state of this record or returns it if called without parameters
     *
     * @param integer|string $state                 if set, this method tries to set the record state to $state
     * @see Doctrine_Record::STATE_* constants
     *
     * @throws Doctrine_Record_State_Exception      if trying to set an unknown state
     * @return null|integer
     */
    public function state($state = null)
    {
        if ($state == null) {
            return $this->_state;
        }
        
        $err = false;
        if (is_integer($state)) {
            if ($state >= 1 && $state <= 7) {
                $this->_state = $state;
            } else {
                $err = true;
            }
        } else if (is_string($state)) {
            $upper = strtoupper($state);

            $const = 'Doctrine_Record::STATE_' . $upper;
            if (defined($const)) {
                $this->_state = constant($const);
            } else {
                $err = true;
            }
        }

        if ($this->_state === Doctrine_Record::STATE_TCLEAN ||
                $this->_state === Doctrine_Record::STATE_CLEAN) {
            $this->_resetModified();
        }

        if ($err) {
            throw new Doctrine_Record_State_Exception('Unknown record state ' . $state);
        }
    }

    /**
     * refresh
     * refresh internal data from the database
     *
     * @param bool $deep                        If true, fetch also current relations. Caution: this deletes
     *                                          any aggregated values you may have queried beforee
     *
     * @throws Doctrine_Record_Exception        When the refresh operation fails (when the database row
     *                                          this record represents does not exist anymore)
     * @return boolean
     */
    public function refresh($deep = false)
    {
        $id = $this->identifier();
        if ( ! is_array($id)) {
            $id = array($id);
        }
        if (empty($id)) {
            return false;
        }
        $id = array_values($id);

        $overwrite = $this->getTable()->getAttribute(Doctrine_Core::ATTR_HYDRATE_OVERWRITE);
        $this->getTable()->setAttribute(Doctrine_Core::ATTR_HYDRATE_OVERWRITE, true);

        if ($deep) {
            $query = $this->getTable()->createQuery();
            foreach (array_keys($this->_references) as $name) {
                $query->leftJoin(get_class($this) . '.' . $name);
            }
            $query->where(implode(' = ? AND ', (array)$this->getTable()->getIdentifier()) . ' = ?');
            $this->clearRelated();
            $record = $query->fetchOne($id);
        } else {
            // Use HYDRATE_ARRAY to avoid clearing object relations
            $record = $this->getTable()->find($id, Doctrine_Core::HYDRATE_ARRAY);
            if ($record) {
                $this->hydrate($record);
            }
        }

        $this->getTable()->setAttribute(Doctrine_Core::ATTR_HYDRATE_OVERWRITE, $overwrite);

        if ($record === false) {
            throw new Doctrine_Record_Exception('Failed to refresh. Record does not exist.');
        }

        $this->_resetModified();

        $this->prepareIdentifiers();

        $this->_state = Doctrine_Record::STATE_CLEAN;

        return $this;
    }

    /**
     * refresh
     * refresh data of related objects from the database
     *
     * @param string $name              name of a related component.
     *                                  if set, this method only refreshes the specified related component
     *
     * @return Doctrine_Record          this object
     */
    public function refreshRelated($name = null)
    {
        if (is_null($name)) {
            foreach ($this->_table->getRelations() as $rel) {
                $alias = $rel->getAlias();
                unset($this->_references[$alias]);
                $reference = $rel->fetchRelatedFor($this);
                if ($reference instanceof Doctrine_Collection) {
                    $this->_references[$alias] = $reference;
                } else if ($reference instanceof Doctrine_Record) {
                    if ($reference->exists()) {
                        $this->_references[$alias] = $reference;
                    } else {
                        $reference->free();
                    }
                }
            }
        } else {
            unset($this->_references[$name]);
            $rel = $this->_table->getRelation($name);
            $reference = $rel->fetchRelatedFor($this);
            if ($reference instanceof Doctrine_Collection) {
                $this->_references[$name] = $reference;
            } else if ($reference instanceof Doctrine_Record) {
                if ($reference->exists()) {
                    $this->_references[$name] = $reference;
                } else {
                    $reference->free();
                }
            }
        }
    }

    /**
     * Clear a related reference or all references
     *
     * @param string $name The relationship reference to clear
     * @return void
     */
    public function clearRelated($name = null)
    {
        if (is_null($name)) {
            $this->_references = array();
        } else {
            unset($this->_references[$name]);
        }
    }

    /**
     * Check if a related relationship exists. Will lazily load the relationship
     * in order to check. If the reference didn't already exist and it doesn't
     * exist in the database, the related reference will be cleared immediately.
     *
     * @param string $name 
     * @return boolean Whether or not the related relationship exists
     */
    public function relatedExists($name)
    {
        if ($this->hasReference($name) && $this->_references[$name] !== self::$_null) {
            return true;
        }

        $reference = $this->$name;
        if ($reference instanceof Doctrine_Record) {
            $exists = $reference->exists();
        } elseif ($reference instanceof Doctrine_Collection) {
            throw new Doctrine_Record_Exception(
                'You can only call relatedExists() on a relationship that '.
                'returns an instance of Doctrine_Record'
            );
        } else {
            $exists = false;
        }

        if (!$exists) {
            $this->clearRelated($name);
        }

        return $exists;
    }

    /**
     * returns the table object for this record.
     *
     * @return Doctrine_Table        a Doctrine_Table object
     */
    public function getTable()
    {
        return $this->_table;
    }

    /**
     * return all the internal data (columns)
     *
     * @return array                        an array containing all the properties
     */
    public function getData()
    {
        return $this->_data;
    }

    /**
     * returns the value of a property (column). If the property is not yet loaded
     * this method does NOT load it.
     *
     * @param $name                         name of the property
     * @throws Doctrine_Record_Exception    if trying to get an unknown property
     * @return mixed
     */
    public function rawGet($fieldName)
    {
        if ( ! array_key_exists($fieldName, $this->_data)) {
            throw new Doctrine_Record_Exception('Unknown property '. $fieldName);
        }
        if ($this->_data[$fieldName] === self::$_null) {
            return null;
        }

        return $this->_data[$fieldName];
    }

    /**
     * loads all the uninitialized properties from the database.
     * Used to move a record from PROXY to CLEAN/DIRTY state.
     *
     * @param array $data  overwriting data to load in the record. Instance is hydrated from the table if not specified.
     * @return boolean
     */
    public function load(array $data = array())
    {
        // only load the data from database if the Doctrine_Record is in proxy state
        if ($this->exists() && $this->isInProxyState()) {
            $id = $this->identifier();
            
            if ( ! is_array($id)) {
                $id = array($id);
            }
            
            if (empty($id)) {
                return false;
            }

            $data = empty($data) ? $this->getTable()->find($id, Doctrine_Core::HYDRATE_ARRAY) : $data;
            
            if (is_array($data)) {
                foreach ($data as $field => $value) {
                    if ( ! array_key_exists($field, $this->_data) || $this->_data[$field] === self::$_null) {
                       $this->_data[$field] = $value;
                   }
                }
            }
            
            if ($this->isModified()) {
                $this->_state = Doctrine_Record::STATE_DIRTY;
            } else if (!$this->isInProxyState()) {
                $this->_state = Doctrine_Record::STATE_CLEAN;
            }
            
            return true;
        }
        
        return false;
    }
        
    /**
     * indicates whether record has any not loaded fields
     *
     * @return boolean
     */
    public function isInProxyState()
    {
        $count = 0;
        foreach ($this->_data as $value) {
            if ($value !== self::$_null) {
                $count++;
            }
        }
        if ($count < $this->_table->getColumnCount()) {
            return true;
        }
        return false;
    }

    /**
     * sets a fieldname to have a custom accessor or check if a field has a custom
     * accessor defined (when called without $accessor parameter).
     *
     * @param string $fieldName 
     * @param string $accessor 
     * @return boolean
     */
    public function hasAccessor($fieldName, $accessor = null)
    {
        $componentName = $this->_table->getComponentName();
        if ($accessor) {
            self::$_customAccessors[$componentName][$fieldName] = $accessor;
        } else {
            return (isset(self::$_customAccessors[$componentName][$fieldName]) && self::$_customAccessors[$componentName][$fieldName]);
        }
    }

    /**
     * clears the accessor for a field name
     *
     * @param string $fieldName 
     * @return void
     */
    public function clearAccessor($fieldName)
    {
        $componentName = $this->_table->getComponentName();
        unset(self::$_customAccessors[$componentName][$fieldName]);
    }

    /**
     * gets the custom accessor for a field name
     *
     * @param string $fieldName 
     * @return string $accessor
     */
    public function getAccessor($fieldName)
    {
        if ($this->hasAccessor($fieldName)) {
            $componentName = $this->_table->getComponentName();
            return self::$_customAccessors[$componentName][$fieldName];
        }
    }

    /**
     * gets all accessors for this component instance
     *
     * @return array $accessors
     */
    public function getAccessors()
    {
        $componentName = $this->_table->getComponentName();
        return isset(self::$_customAccessors[$componentName]) ? self::$_customAccessors[$componentName] : array();
    }

    /**
     * sets a fieldname to have a custom mutator or check if a field has a custom
     * mutator defined (when called without the $mutator parameter)
     *
     * @param string $fieldName 
     * @param string $mutator 
     * @return boolean
     */
    public function hasMutator($fieldName, $mutator = null)
    {
        $componentName = $this->_table->getComponentName();
        if ($mutator) {
            self::$_customMutators[$componentName][$fieldName] = $mutator;
        } else {
            return (isset(self::$_customMutators[$componentName][$fieldName]) && self::$_customMutators[$componentName][$fieldName]);
        }
    }

    /**
     * gets the custom mutator for a field name
     *
     * @param string $fieldname 
     * @return string
     */
    public function getMutator($fieldName)
    {
        if ($this->hasMutator($fieldName)) {
            $componentName = $this->_table->getComponentName();
            return self::$_customMutators[$componentName][$fieldName];
        }
    }

    /**
     * clears the custom mutator for a field name
     *
     * @param string $fieldName 
     * @return void
     */
    public function clearMutator($fieldName)
    {
        $componentName = $this->_table->getComponentName();
        unset(self::$_customMutators[$componentName][$fieldName]);
    }

    /**
     * gets all custom mutators for this component instance
     *
     * @return array $mutators
     */
    public function getMutators()
    {
        $componentName = $this->_table->getComponentName();
        return self::$_customMutators[$componentName];
    }

    /**
     * Set a fieldname to have a custom accessor and mutator
     *
     * @param string $fieldname
     * @param string $accessor
     * @param string $mutator
     */
    public function hasAccessorMutator($fieldName, $accessor, $mutator)
    {
        $this->hasAccessor($fieldName, $accessor);
        $this->hasMutator($fieldName, $mutator);
    }

    /**
     * returns a value of a property or a related component
     *
     * @param mixed $fieldName                  name of the property or related component
     * @param boolean $load                     whether or not to invoke the loading procedure
     * @throws Doctrine_Record_Exception        if trying to get a value of unknown property / related component
     * @return mixed
     */
    public function get($fieldName, $load = true)
    {
        if ($this->_table->getAttribute(Doctrine_Core::ATTR_AUTO_ACCESSOR_OVERRIDE) || $this->hasAccessor($fieldName)) {
            $componentName = $this->_table->getComponentName();

            $accessor = $this->hasAccessor($fieldName) 
                ? $this->getAccessor($fieldName)
                : 'get' . Doctrine_Inflector::classify($fieldName);

            if ($this->hasAccessor($fieldName) || method_exists($this, $accessor)) {
                $this->hasAccessor($fieldName, $accessor);
                return $this->$accessor($load);
            }
        }
        return $this->_get($fieldName, $load);
    }

    protected function _get($fieldName, $load = true)
    {
        $value = self::$_null;

        if (array_key_exists($fieldName, $this->_values)) {
            return $this->_values[$fieldName];
        }

        if (array_key_exists($fieldName, $this->_data)) {
            // check if the value is the Doctrine_Null object located in self::$_null)
            if ($this->_data[$fieldName] === self::$_null && $load) {
                $this->load();
            }

            if ($this->_data[$fieldName] === self::$_null) {
                $value = null;
            } else {
                $value = $this->_data[$fieldName];
            }
            
            return $value;
        }
        
        try {
            if ( ! isset($this->_references[$fieldName])) {
                if ($load) {
                    $rel = $this->_table->getRelation($fieldName);
                    $this->_references[$fieldName] = $rel->fetchRelatedFor($this);
                } else {
                    $this->_references[$fieldName] = null;
                }
            }

            if ($this->_references[$fieldName] === self::$_null) {
                return null;
            }

            return $this->_references[$fieldName];
        } catch (Doctrine_Table_Exception $e) {
            $success = false;
            foreach ($this->_table->getFilters() as $filter) {
                try {
                    $value = $filter->filterGet($this, $fieldName);
                    $success = true;
                } catch (Doctrine_Exception $e) {}
            }
            if ($success) {
                return $value;
            } else {
                throw $e;
            }
        }
    }

    /**
     * sets a value that will be managed as if it were a field by magic accessor and mutators, @see get() and @see set().
     * Normally used by Doctrine for the mapping of aggregate values.
     *
     * @param string $name                  the name of the mapped value
     * @param mixed $value                  mixed value to be mapped
     * @return void
     */
    public function mapValue($name, $value = null)
    {
        $this->_values[$name] = $value;
    }

    /**
     * Tests whether a mapped value exists
     *
     * @param string $name  the name of the property
     * @return boolean
     */
    public function hasMappedValue($name)
    {
        return array_key_exists($name, $this->_values);
    }

    /**
     * alters mapped values, properties and related components.
     *
     * @param mixed $name                   name of the property or reference
     * @param mixed $value                  value of the property or reference
     * @param boolean $load                 whether or not to refresh / load the uninitialized record data
     *
     * @throws Doctrine_Record_Exception    if trying to set a value for unknown property / related component
     * @throws Doctrine_Record_Exception    if trying to set a value of wrong type for related component
     *
     * @return Doctrine_Record
     */
    public function set($fieldName, $value, $load = true)
    {
        if ($this->_table->getAttribute(Doctrine_Core::ATTR_AUTO_ACCESSOR_OVERRIDE) || $this->hasMutator($fieldName)) {
            $componentName = $this->_table->getComponentName();
            $mutator = $this->hasMutator($fieldName)
                ? $this->getMutator($fieldName):
                'set' . Doctrine_Inflector::classify($fieldName);

            if ($this->hasMutator($fieldName) || method_exists($this, $mutator)) {
                $this->hasMutator($fieldName, $mutator);
                return $this->$mutator($value, $load);
            }
        }
        return $this->_set($fieldName, $value, $load);
    }

    protected function _set($fieldName, $value, $load = true)
    {
        if (array_key_exists($fieldName, $this->_values)) {
            $this->_values[$fieldName] = $value;
        } else if (array_key_exists($fieldName, $this->_data)) {
            $type = $this->_table->getTypeOf($fieldName);
            if ($value instanceof Doctrine_Record) {
                $id = $value->getIncremented();

                if ($id !== null && $type !== 'object') {
                    $value = $id;
                }
            }

            if ($load) {
                $old = $this->get($fieldName, $load);
            } else {
                $old = $this->_data[$fieldName];
            }
            
            if ($this->_isValueModified($type, $old, $value)) {
                if ($value === null) {
                    $value = $this->_table->getDefaultValueOf($fieldName); 
                }
                $this->_data[$fieldName] = $value;
                $this->_modified[] = $fieldName;
                $this->_oldValues[$fieldName] = $old;

                switch ($this->_state) {
                    case Doctrine_Record::STATE_CLEAN:
                    case Doctrine_Record::STATE_PROXY:
                        $this->_state = Doctrine_Record::STATE_DIRTY;
                        break;
                    case Doctrine_Record::STATE_TCLEAN:
                        $this->_state = Doctrine_Record::STATE_TDIRTY;
                        break;
                }
            }
        } else {
            try {
                $this->coreSetRelated($fieldName, $value);
            } catch (Doctrine_Table_Exception $e) {
                $success = false;
                foreach ($this->_table->getFilters() as $filter) {
                    try {
                        $value = $filter->filterSet($this, $fieldName, $value);
                        $success = true;
                    } catch (Doctrine_Exception $e) {}
                }
                if ($success) {
                    return $value;
                } else {
                    throw $e;
                }
            }
        }

        return $this;
    }

    /**
     * Check if a value has changed according to Doctrine
     * Doctrine is loose with type checking in the same ways PHP is for consistancy of behavior
     *
     * This function basically says if what is being set is of Doctrine type boolean and something
     * like current_value == 1 && new_value = true would not be considered modified
     *
     * Simply doing $old !== $new will return false for boolean columns would mark the field as modified
     * and change it in the database when it is not necessary
     *
     * @param string $type  Doctrine type of the column
     * @param string $old   Old value
     * @param string $new   New value
     * @return boolean $modified  Whether or not Doctrine considers the value modified
     */
    protected function _isValueModified($type, $old, $new)
    {
        if ($new instanceof Doctrine_Expression) {
            return true;
        }

        if ($type == 'boolean' && (is_bool($old) || is_numeric($old)) && (is_bool($new) || is_numeric($new)) && $old == $new) {
            return false;
        } else if (in_array($type, array('decimal', 'float')) && is_numeric($old) && is_numeric($new)) {
            return $old * 100 != $new * 100;
        } else if (in_array($type, array('integer', 'int')) && is_numeric($old) && is_numeric($new)) {
            return $old !== $new;
        } else if ($type == 'timestamp' || $type == 'date') {
            $oldStrToTime = strtotime($old);
            $newStrToTime = strtotime($new);
            if ($oldStrToTime && $newStrToTime) {
                return $oldStrToTime !== $newStrToTime;
            } else {
                return $old !== $new;
            }
        } else {
            return $old !== $new;
        }
    }

    /**
     * Places a related component in the object graph.
     *
     * This method inserts a related component instance in this record 
     * relations, populating the foreign keys accordingly.
     *
     * @param string $name                                  related component alias in the relation
     * @param Doctrine_Record|Doctrine_Collection $value    object to be linked as a related component
     * @todo Refactor. What about composite keys?
     */
    public function coreSetRelated($name, $value)
    {
        $rel = $this->_table->getRelation($name);
        
        if ($value === null) {
            $value = self::$_null;
        }
        
        // one-to-many or one-to-one relation
        if ($rel instanceof Doctrine_Relation_ForeignKey || $rel instanceof Doctrine_Relation_LocalKey) {
            if ( ! $rel->isOneToOne()) {
                // one-to-many relation found
                if ( ! ($value instanceof Doctrine_Collection)) {
                    throw new Doctrine_Record_Exception("Couldn't call Doctrine_Core::set(), second argument should be an instance of Doctrine_Collection when setting one-to-many references.");
                }

                if (isset($this->_references[$name])) {
                    $this->_references[$name]->setData($value->getData());

                    return $this;
                }
            } else {
                $localFieldName = $this->_table->getFieldName($rel->getLocal());

                if ($value !== self::$_null) {
                    $relatedTable = $rel->getTable();
                    $foreignFieldName = $relatedTable->getFieldName($rel->getForeign());
                }

                // one-to-one relation found
                if ( ! ($value instanceof Doctrine_Record) && ! ($value instanceof Doctrine_Null)) {
                    throw new Doctrine_Record_Exception("Couldn't call Doctrine_Core::set(), second argument should be an instance of Doctrine_Record or Doctrine_Null when setting one-to-one references.");
                }

                if ($rel instanceof Doctrine_Relation_LocalKey) {
                    if ($value !== self::$_null &&  ! empty($foreignFieldName) && $foreignFieldName != $value->getTable()->getIdentifier()) {
                        $this->set($localFieldName, $value->rawGet($foreignFieldName), false);
                    } else {
                        // FIX: Ticket #1280 fits in this situation
                        $this->set($localFieldName, $value, false);
                    }
                } elseif ($value !== self::$_null) {
                    // We should only be able to reach $foreignFieldName if we have a Doctrine_Record on hands
                    $value->set($foreignFieldName, $this, false);
                }
            }
        } else if ($rel instanceof Doctrine_Relation_Association) {
            // join table relation found
            if ( ! ($value instanceof Doctrine_Collection)) {
                throw new Doctrine_Record_Exception("Couldn't call Doctrine_Core::set(), second argument should be an instance of Doctrine_Collection when setting many-to-many references.");
            }
        }

        $this->_references[$name] = $value;
    }

    /**
     * test whether a field (column, mapped value, related component, accessor) is accessible by @see get()
     *
     * @param string $fieldName
     * @return boolean
     */
    public function contains($fieldName)
    {
        if (array_key_exists($fieldName, $this->_data)) {
            // this also returns true if the field is a Doctrine_Null.
            // imho this is not correct behavior.
            return true;
        }
        if (isset($this->_id[$fieldName])) {
            return true;
        }
        if (isset($this->_values[$fieldName])) {
            return true;
        }
        if (isset($this->_references[$fieldName]) &&
            $this->_references[$fieldName] !== self::$_null) {

            return true;
        }
        return false;
    }

    /**
     * deletes a column or a related component.
     * @param string $name
     * @return void
     */
    public function __unset($name)
    {
        if (array_key_exists($name, $this->_data)) {
            $this->_data[$name] = array();
        } else if (isset($this->_references[$name])) {
            if ($this->_references[$name] instanceof Doctrine_Record) {
                $this->_pendingDeletes[] = $this->$name;
                $this->_references[$name] = self::$_null;
            } elseif ($this->_references[$name] instanceof Doctrine_Collection) {
                $this->_pendingDeletes[] = $this->$name;
                $this->_references[$name]->setData(array());
            }
        }
    }

    /**
     * returns Doctrine_Record instances which need to be deleted on save
     *
     * @return array
     */
    public function getPendingDeletes()
    {
        return $this->_pendingDeletes;
    }

    /**
     * returns Doctrine_Record instances which need to be unlinked (deleting the relation) on save
     *
     * @return array $pendingUnlinks
     */
    public function getPendingUnlinks()
    {
        return $this->_pendingUnlinks;
    }

    /**
     * resets pending record unlinks
     *
     * @return void
     */
    public function resetPendingUnlinks()
    {
        $this->_pendingUnlinks = array();
    }

    /**
     * applies the changes made to this object into database
     * this method is smart enough to know if any changes are made
     * and whether to use INSERT or UPDATE statement
     *
     * this method also saves the related components
     *
     * @param Doctrine_Connection $conn     optional connection parameter
     * @throws Exception                    if record is not valid and validation is active
     * @return void
     */
    public function save(Doctrine_Connection $conn = null)
    {
        if ($conn === null) {
            $conn = $this->_table->getConnection();
        }
        $conn->unitOfWork->saveGraph($this);
    }

    /**
     * tries to save the object and all its related components.
     * In contrast to Doctrine_Record::save(), this method does not
     * throw an exception when validation fails but returns TRUE on
     * success or FALSE on failure.
     *
     * @param Doctrine_Connection $conn                 optional connection parameter
     * @return TRUE if the record was saved sucessfully without errors, FALSE otherwise.
     */
    public function trySave(Doctrine_Connection $conn = null) {
        try {
            $this->save($conn);
            return true;
        } catch (Doctrine_Validator_Exception $ignored) {
            return false;
        }
    }

    /**
     * executes a SQL REPLACE query. A REPLACE query is identical to a INSERT
     * query, except that if there is already a row in the table with the same
     * key field values, the REPLACE query just updates its values instead of
     * inserting a new row.
     *
     * The REPLACE type of query does not make part of the SQL standards. Since
     * practically only MySQL and SQLIte implement it natively, this type of
     * query isemulated through this method for other DBMS using standard types
     * of queries inside a transaction to assure the atomicity of the operation.
     *
     * @param Doctrine_Connection $conn             optional connection parameter
     * @throws Doctrine_Connection_Exception        if some of the key values was null
     * @throws Doctrine_Connection_Exception        if there were no key fields
     * @throws Doctrine_Connection_Exception        if something fails at database level
     * @return integer                              number of rows affected
     */
    public function replace(Doctrine_Connection $conn = null)
    {
        if ($conn === null) {
            $conn = $this->_table->getConnection();
        }
        return $conn->unitOfWork->saveGraph($this, true);
    }

    /**
     * retrieves an array of modified fields and associated new values.
     * 
     * @param boolean $old      pick the old values (instead of the new ones)
     * @param boolean $last     pick only lastModified values (@see getLastModified())
     * @return array $a
     */
    public function getModified($old = false, $last = false)
    {
        $a = array();

        $modified = $last ? $this->_lastModified:$this->_modified;
        foreach ($modified as $fieldName) {
            if ($old) {
                $a[$fieldName] = isset($this->_oldValues[$fieldName]) 
                    ? $this->_oldValues[$fieldName] 
                    : $this->getTable()->getDefaultValueOf($fieldName);
            } else {
                $a[$fieldName] = $this->_data[$fieldName];
            }
        }
        return $a;
    }

    /**
     * returns an array of the modified fields from the last transaction.
     *
     * @param boolean $old      pick the old values (instead of the new ones)
     * @return array
     */
    public function getLastModified($old = false)
    {
        return $this->getModified($old, true);
    }

    /**
     * Retrieves data prepared for a sql transaction.
     *
     * Returns an array of modified fields and values with data preparation;
     * adds column aggregation inheritance and converts Records into primary 
     * key values.
     *
     * @param array $array
     * @return array
     * @todo What about a little bit more expressive name? getPreparedData?
     */
    public function getPrepared(array $array = array())
    {
        $a = array();

        if (empty($array)) {
            $modifiedFields = $this->_modified;
        }

        foreach ($modifiedFields as $field) {
            $type = $this->_table->getTypeOf($field);

            if ($this->_data[$field] === self::$_null) {
                $a[$field] = null;
                continue;
            }

            switch ($type) {
                case 'array':
                case 'object':
                    $a[$field] = serialize($this->_data[$field]);
                    break;
                case 'gzip':
                    $a[$field] = gzcompress($this->_data[$field],5);
                    break;
                case 'boolean':
                    $a[$field] = $this->getTable()->getConnection()->convertBooleans($this->_data[$field]);
                break;
                case 'set':
                    if (is_array($this->_data[$field])) {
                        $a[$field] = implode(',', $this->_data[$field]);
                    } else {
                        $a[$field] = $this->_data[$field];
                    }
                break;
                default:
                    if ($this->_data[$field] instanceof Doctrine_Record) {
                        $a[$field] = $this->_data[$field]->getIncremented();
                        if ($a[$field] !== null) {
                            $this->_data[$field] = $a[$field];
                        }
                    } else {
                        $a[$field] = $this->_data[$field];
                    }
                    /** TODO:
                    if ($this->_data[$v] === null) {
                        throw new Doctrine_Record_Exception('Unexpected null value.');
                    }
                    */
            }
        }

        return $a;
    }

    /**
     * implements Countable interface
     *
     * @return integer          the number of columns in this record
     */
    public function count()
    {
        return count($this->_data);
    }

    /**
     * alias for @see count()
     *
     * @return integer          the number of columns in this record
     */
    public function columnCount()
    {
        return $this->count();
    }

    /**
     * returns the record representation as an array
     *
     * @link http://www.doctrine-project.org/documentation/manual/1_1/en/working-with-models
     * @param boolean $deep         whether to include relations
     * @param boolean $prefixKey    not used
     * @return array
     */
    public function toArray($deep = true, $prefixKey = false)
    {
        if ($this->_state == self::STATE_LOCKED || $this->_state == self::STATE_TLOCKED) {
            return false;
        }
        
        $stateBeforeLock = $this->_state;
        $this->_state = $this->exists() ? self::STATE_LOCKED : self::STATE_TLOCKED;
        
        $a = array();

        foreach ($this as $column => $value) {
            if ($value === self::$_null || is_object($value)) {
                $value = null;
            }

            $columnValue = $this->get($column, false);

            if ($columnValue instanceof Doctrine_Record) {
                $a[$column] = $columnValue->getIncremented();
            } else {
                $a[$column] = $columnValue;
            }
        }

        if ($this->_table->getIdentifierType() ==  Doctrine_Core::IDENTIFIER_AUTOINC) {
            $i      = $this->_table->getIdentifier();
            $a[$i]  = $this->getIncremented();
        }

        if ($deep) {
            foreach ($this->_references as $key => $relation) {
                if ( ! $relation instanceof Doctrine_Null) {
                    $a[$key] = $relation->toArray($deep, $prefixKey);
                }
            }
        }

        // [FIX] Prevent mapped Doctrine_Records from being displayed fully
        foreach ($this->_values as $key => $value) {
            $a[$key] = ($value instanceof Doctrine_Record || $value instanceof Doctrine_Collection)
                ? $value->toArray($deep, $prefixKey) : $value;
        }

        $this->_state = $stateBeforeLock;

        return $a;
    }

    /**
     * merges this record with an array of values
     * or with another existing instance of this object
     *
     * @see fromArray()
     * @link http://www.doctrine-project.org/documentation/manual/1_1/en/working-with-models
     * @param string $array  array of data to merge, see link for documentation
     * @param bool   $deep   whether or not to merge relations
     * @return void
     */
    public function merge($data, $deep = true)
    {
        if ($data instanceof $this) {
            $array = $data->toArray($deep);
        } else if (is_array($data)) {
            $array = $data;
        }

        return $this->fromArray($array, $deep);
    }

    /**
     * imports data from a php array
     *
     * @link http://www.doctrine-project.org/documentation/manual/1_1/en/working-with-models
     * @param string $array  array of data, see link for documentation
     * @param bool   $deep   whether or not to act on relations
     * @return void
     */
    public function fromArray(array $array, $deep = true)
    {
        $refresh = false;
        foreach ($array as $key => $value) {
            if ($key == '_identifier') {
                $refresh = true;
                $this->assignIdentifier($value);
                continue;
            }

            if ($deep && $this->getTable()->hasRelation($key)) {
                if ( ! $this->$key) {
                    $this->refreshRelated($key);
                }

                if (is_array($value)) {
                    if (isset($value[0]) && ! is_array($value[0])) {
                        $this->unlink($key, array(), false);
                        $this->link($key, $value, false);
                    } else {
                        $this->$key->fromArray($value, $deep);
                    }
                }
            } else if ($this->getTable()->hasField($key) || array_key_exists($key, $this->_values)) {
                $this->set($key, $value);
            } else {
                $method = 'set' . Doctrine_Inflector::classify($key);

                try {
                    if (is_callable(array($this, $method))) {
                        $this->$method($value);
                    }
                } catch (Doctrine_Record_Exception $e) {}
            }
        }

        if ($refresh) {
            $this->refresh();
        }
    }

    /**
     * synchronizes a Doctrine_Record instance and its relations with data from an array
     *
     * it expects an array representation of a Doctrine_Record similar to the return
     * value of the toArray() method. If the array contains relations it will create
     * those that don't exist, update the ones that do, and delete the ones missing
     * on the array but available on the Doctrine_Record (unlike @see fromArray() that
     * does not touch what it is not in $array)
     *
     * @param array $array representation of a Doctrine_Record
     * @param bool   $deep   whether or not to act on relations
     */
    public function synchronizeWithArray(array $array, $deep = true)
    {
        $refresh = false;
        foreach ($array as $key => $value) {
            if ($key == '_identifier') {
                $refresh = true;
                $this->assignIdentifier($value);
                continue;
            }

            if ($deep && $this->getTable()->hasRelation($key)) {
                if ( ! $this->$key) {
                    $this->refreshRelated($key);
                }

                if (is_array($value)) {
                    if (isset($value[0]) && ! is_array($value[0])) {
                        $this->unlink($key, array(), false);
                        $this->link($key, $value, false);
                    } else {
                        $this->$key->synchronizeWithArray($value);
                    }
                }
            } else if ($this->getTable()->hasField($key) || array_key_exists($key, $this->_values)) {
                $this->set($key, $value);
            }
        }

        // Eliminate relationships missing in the $array
        foreach ($this->_references as $name => $relation) {
	        $rel = $this->getTable()->getRelation($name);

            if ( ! $rel->isRefClass() && ! isset($array[$name]) && ( ! $rel->isOneToOne() || ! isset($array[$rel->getLocalFieldName()]))) {
                unset($this->$name);
            }
        }

        if ($refresh) {
            $this->refresh();
        }
    }

    /**
     * exports instance to a chosen format
     *
     * @param string $type  format type: array, xml, yml, json
     * @param string $deep  whether or not to export all relationships
     * @return string       representation as $type format. Array is $type is array
     */
    public function exportTo($type, $deep = true)
    {
        if ($type == 'array') {
            return $this->toArray($deep);
        } else {
            return Doctrine_Parser::dump($this->toArray($deep, true), $type);
        }
    }

    /**
     * imports data from a chosen format in the current instance
     *
     * @param string $type  Format type: xml, yml, json
     * @param string $data  Data to be parsed and imported
     * @return void
     */
    public function importFrom($type, $data, $deep = true)
    {
        if ($type == 'array') {
            return $this->fromArray($data, $deep);
        } else {
            return $this->fromArray(Doctrine_Parser::load($data, $type), $deep);
        }
    }

    /**
     * returns true if this record is saved in the database, otherwise false (it is transient)
     *
     * @return boolean
     */
    public function exists()
    {
        return ($this->_state !== Doctrine_Record::STATE_TCLEAN  &&
                $this->_state !== Doctrine_Record::STATE_TDIRTY  &&
                $this->_state !== Doctrine_Record::STATE_TLOCKED &&
                $this->_state !== null);
    }

    /**
     * returns true if this record was modified, otherwise false
     *
     * @param boolean $deep     whether to process also the relations for changes
     * @return boolean
     */
    public function isModified($deep = false)
    {
        $modified = ($this->_state === Doctrine_Record::STATE_DIRTY ||
                $this->_state === Doctrine_Record::STATE_TDIRTY);
        if ( ! $modified && $deep) {
            if ($this->_state == self::STATE_LOCKED || $this->_state == self::STATE_TLOCKED) {
                return false;
            }

            $stateBeforeLock = $this->_state;
            $this->_state = $this->exists() ? self::STATE_LOCKED : self::STATE_TLOCKED;

            foreach ($this->_references as $reference) {
                if ($reference instanceof Doctrine_Record) {
                    if ($modified = $reference->isModified($deep)) {
                        break;
                    }
                } else if ($reference instanceof Doctrine_Collection) {
                    foreach ($reference as $record) {
                        if ($modified = $record->isModified($deep)) {
                            break 2;
                        }
                    }
                }
            }
            $this->_state = $stateBeforeLock;
        }
        return $modified;
    }

    /**
     * checks existence of properties and related components
     * @param mixed $fieldName   name of the property or reference
     * @return boolean
     */
    public function hasRelation($fieldName)
    {
        if (isset($this->_data[$fieldName]) || isset($this->_id[$fieldName])) {
            return true;
        }
        return $this->_table->hasRelation($fieldName);
    }

    /**
     * implements IteratorAggregate interface
     * @return Doctrine_Record_Iterator     iterator through data
     */
    public function getIterator()
    {
        return new Doctrine_Record_Iterator($this);
    }

    /**
     * deletes this data access object and all the related composites
     * this operation is isolated by a transaction
     *
     * this event can be listened by the onPreDelete and onDelete listeners
     *
     * @return boolean      true if successful
     */
    public function delete(Doctrine_Connection $conn = null)
    {
        if ($conn == null) {
            $conn = $this->_table->getConnection();
        }
        return $conn->unitOfWork->delete($this);
    }

    /**
     * generates a copy of this object. Returns an instance of the same class of $this.
     *
     * @param boolean $deep     whether to duplicates the objects targeted by the relations
     * @return Doctrine_Record
     */
    public function copy($deep = false)
    {
        $data = $this->_data;

        if ($this->_table->getIdentifierType() === Doctrine_Core::IDENTIFIER_AUTOINC) {
            $id = $this->_table->getIdentifier();

            unset($data[$id]);
        }

        $ret = $this->_table->create($data);
        $modified = array();

        foreach ($data as $key => $val) {
            if ( ! ($val instanceof Doctrine_Null)) {
                $ret->_modified[] = $key;
            }
        }

        if ($deep) {
            foreach ($this->_references as $key => $value) {
                if ($value instanceof Doctrine_Collection) {
                    foreach ($value as $valueKey => $record) {
                        $ret->{$key}[$valueKey] = $record->copy($deep);
                    }
                } else if ($value instanceof Doctrine_Record) {
                    $ret->set($key, $value->copy($deep));
                }
            }
        }

        return $ret;
    }

    /**
     * assigns an identifier to the instance, for database storage
     *
     * @param mixed $id     a key value or an array of keys
     * @return void
     */
    public function assignIdentifier($id = false)
    {
        if ($id === false) {
            $this->_id       = array();
            $this->_data     = $this->cleanData($this->_data);
            $this->_state    = Doctrine_Record::STATE_TCLEAN;
            $this->_resetModified();
        } elseif ($id === true) {
            $this->prepareIdentifiers(true);
            $this->_state    = Doctrine_Record::STATE_CLEAN;
            $this->_resetModified();
        } else {
            if (is_array($id)) {
                foreach ($id as $fieldName => $value) {
                    $this->_id[$fieldName] = $value;
                    $this->_data[$fieldName] = $value;
                }
            } else {
                $name = $this->_table->getIdentifier();
                $this->_id[$name] = $id;
                $this->_data[$name] = $id;
            }
            $this->_state = Doctrine_Record::STATE_CLEAN;
            $this->_resetModified();
        }
    }

    /**
     * returns the primary keys of this object
     *
     * @return array
     */
    public function identifier()
    {
        return $this->_id;
    }

    /**
     * returns the value of autoincremented primary key of this object (if any)
     *
     * @return integer
     * @todo Better name?
     */
    final public function getIncremented()
    {
        $id = current($this->_id);
        if ($id === false) {
            return null;
        }

        return $id;
    }

    /**
     * getLast
     * this method is used internally by Doctrine_Query
     * it is needed to provide compatibility between
     * records and collections
     *
     * @return Doctrine_Record
     */
    public function getLast()
    {
        return $this;
    }

    /**
     * tests whether a relation is set
     * @param string $name  relation alias
     * @return boolean
     */
    public function hasReference($name)
    {
        return isset($this->_references[$name]);
    }

    /**
     * gets a related component
     *
     * @param string $name
     * @return Doctrine_Record|Doctrine_Collection
     */
    public function reference($name)
    {
        if (isset($this->_references[$name])) {
            return $this->_references[$name];
        }
    }

    /**
     * gets a related component and fails if it does not exist
     *
     * @param string $name
     * @throws Doctrine_Record_Exception        if trying to get an unknown related component
     */
    public function obtainReference($name)
    {
        if (isset($this->_references[$name])) {
            return $this->_references[$name];
        }
        throw new Doctrine_Record_Exception("Unknown reference $name");
    }

    /**
     * get all related components
     * @return array    various Doctrine_Collection or Doctrine_Record instances
     */
    public function getReferences()
    {
        return $this->_references;
    }

    /**
     * set a related component
     *
     * @param string $alias
     * @param Doctrine_Access $coll
     */
    final public function setRelated($alias, Doctrine_Access $coll)
    {
        $this->_references[$alias] = $coll;
    }

    /**
     * loadReference
     * loads a related component
     *
     * @throws Doctrine_Table_Exception             if trying to load an unknown related component
     * @param string $name                          alias of the relation
     * @return void
     */
    public function loadReference($name)
    {
        $rel = $this->_table->getRelation($name);
        $this->_references[$name] = $rel->fetchRelatedFor($this);
    }

    /**
     * call
     *
     * @param string|array $callback    valid callback
     * @param string $column            column name
     * @param mixed arg1 ... argN       optional callback arguments
     * @return Doctrine_Record provides a fluent interface
     */
    public function call($callback, $column)
    {
        $args = func_get_args();
        array_shift($args);

        if (isset($args[0])) {
            $fieldName = $args[0];
            $args[0] = $this->get($fieldName);

            $newvalue = call_user_func_array($callback, $args);

            $this->_data[$fieldName] = $newvalue;
        }
        return $this;
    }

    /**
     * getter for node associated with this record
     *
     * @return Doctrine_Node    false if component is not a Tree
     */
    public function getNode()
    {
        if ( ! $this->_table->isTree()) {
            return false;
        }

        if ( ! isset($this->_node)) {
            $this->_node = Doctrine_Node::factory($this,
                                              $this->getTable()->getOption('treeImpl'),
                                              $this->getTable()->getOption('treeOptions')
                                              );
        }

        return $this->_node;
    }

    public function unshiftFilter(Doctrine_Record_Filter $filter)
    {
        return $this->_table->unshiftFilter($filter);
    }

    /**
     * unlink
     * removes links from this record to given records
     * if no ids are given, it removes all links
     *
     * @param string $alias     related component alias
     * @param array $ids        the identifiers of the related records
     * @param boolean $now      whether or not to execute now or set as pending unlinks
     * @return Doctrine_Record  this object (fluent interface)
     */
    public function unlink($alias, $ids = array(), $now = false)
    {
        $ids = (array) $ids;

        // fix for #1622
        if ( ! isset($this->_references[$alias]) && $this->hasRelation($alias)) {
            $this->loadReference($alias);
        }		

        $allIds = array();
        if (isset($this->_references[$alias])) {
            if ($this->_references[$alias] instanceof Doctrine_Record) {
                $allIds[] = $this->_references[$alias]->identifier();
                if (in_array($this->_references[$alias]->identifier(), $ids) || empty($ids)) {
                    unset($this->_references[$alias]);
                }
            } else {
                $allIds = $this->get($alias)->getPrimaryKeys();
                foreach ($this->_references[$alias] as $k => $record) {
                    if (in_array(current($record->identifier()), $ids) || empty($ids)) {
                        $this->_references[$alias]->remove($k);
                    }
                }
            }
        }

        if ( ! $this->exists() || $now === false) {
            if ( ! $ids) {
                $ids = $allIds;
            }
            foreach ($ids as $id) {
                $this->_pendingUnlinks[$alias][$id] = true;
            }
            return $this;
        } else {
            return $this->unlinkInDb($alias, $ids);
        }
    }

    /**
     * unlink now the related components, querying the db
     * @param string $alias     related component alias
     * @param array $ids        the identifiers of the related records
     * @return Doctrine_Record  this object (fluent interface)
     */
    public function unlinkInDb($alias, $ids = array())
    {
        $rel = $this->getTable()->getRelation($alias);

        if ($rel instanceof Doctrine_Relation_Association) {
            $q = $rel->getAssociationTable()
                ->createQuery()
                ->delete()
                ->where($rel->getLocal() . ' = ?', array_values($this->identifier()));

            if (count($ids) > 0) {
                $q->whereIn($rel->getForeign(), $ids);
            }

            $q->execute();
        } else if ($rel instanceof Doctrine_Relation_ForeignKey) {
            $q = $rel->getTable()->createQuery()
                ->update()
                ->set($rel->getForeign(), '?', array(null))
                ->addWhere($rel->getForeign() . ' = ?', array_values($this->identifier()));

            if (count($ids) > 0) {
                $q->whereIn($rel->getTable()->getIdentifier(), $ids);
            }

            $q->execute();
        }
        return $this;
    }

    /**
     * creates links from this record to given records
     *
     * @param string $alias     related component alias
     * @param array $ids        the identifiers of the related records
     * @param boolean $now      wether or not to execute now or set pending
     * @return Doctrine_Record  this object (fluent interface)
     */
    public function link($alias, $ids, $now = false)
    {
        $ids = (array) $ids;

        if ( ! count($ids)) {
            return $this;
        }

        if ( ! $this->exists() || $now === false) {
            $relTable = $this->getTable()->getRelation($alias)->getTable();
            $records = $relTable->createQuery()
                ->whereIn($relTable->getIdentifier(), $ids)
                ->execute();

            foreach ($records as $record) {
                if ($this->$alias instanceof Doctrine_Record) {
                    $this->set($alias, $record);
                } else {
                    $this->get($alias)->add($record);
                }
            }

            foreach ($ids as $id) {
                if (isset($this->_pendingUnlinks[$alias][$id])) {
                    unset($this->_pendingUnlinks[$alias][$id]);
                }
            }

            return $this;
        } else {
            return $this->linkInDb($alias, $ids);
        }
    }

    /**
     * creates links from this record to given records now, querying the db
     *
     * @param string $alias     related component alias
     * @param array $ids        the identifiers of the related records
     * @return Doctrine_Record  this object (fluent interface)
     */
    public function linkInDb($alias, $ids)
    {
        $identifier = array_values($this->identifier());
        $identifier = array_shift($identifier);

        $rel = $this->getTable()->getRelation($alias);

        if ($rel instanceof Doctrine_Relation_Association) {
            $modelClassName = $rel->getAssociationTable()->getComponentName();
            $localFieldName = $rel->getLocalFieldName();
            $localFieldDef  = $rel->getAssociationTable()->getColumnDefinition($localFieldName);

            if ($localFieldDef['type'] == 'integer') {
                $identifier = (integer) $identifier;
            }

            $foreignFieldName = $rel->getForeignFieldName();
            $foreignFieldDef  = $rel->getAssociationTable()->getColumnDefinition($foreignFieldName);

            if ($foreignFieldDef['type'] == 'integer') {
                foreach ($ids as $i => $id) {
                    $ids[$i] = (integer) $id;
                }
            }

            foreach ($ids as $id) {
                $record = new $modelClassName;
                $record[$localFieldName] = $identifier;
                $record[$foreignFieldName] = $id;
                $record->save();
            }
        } else if ($rel instanceof Doctrine_Relation_ForeignKey) {
            $q = $rel->getTable()
                ->createQuery()
                ->update()
                ->set($rel->getForeign(), '?', array_values($this->identifier()));

            if (count($ids) > 0) {
                $q->whereIn($rel->getTable()->getIdentifier(), $ids);
            }

            $q->execute();
        } else if ($rel instanceof Doctrine_Relation_LocalKey) {
            $q = $this->getTable()
                ->createQuery()
                ->update()
                ->set($rel->getLocalFieldName(), '?', $ids);

            if (count($ids) > 0) {
                $q->whereIn($rel->getTable()->getIdentifier(), array_values($this->identifier()));
            }

            $q->execute();
        }

        return $this;
    }

    /**
     * Reset the modified array and store the old array in lastModified so it 
     * can be accessed by users after saving a record, since the modified array 
     * is reset after the object is saved.
     *
     * @return void
     */
    protected function _resetModified()
    {
        if ( ! empty($this->_modified)) {
            $this->_lastModified = $this->_modified;
            $this->_modified = array();
        }
    }

    /**
     * magic method used for method overloading
     *
     * the function of this method is to try to find a given method from the templates (behaviors)
     * the record is using, and if found, execute it. Note that already existing methods would not be
     * overloaded.
     *
     * So, in sense, this method replicates the usage of mixins (as seen in some programming languages)
     *
     * @param string $method        name of the method
     * @param array $args           method arguments
     * @return mixed                the return value of the given method
     */
    public function __call($method, $args)
    {
        if (($template = $this->_table->getMethodOwner($method)) !== false) {
            $template->setInvoker($this);
            return call_user_func_array(array($template, $method), $args);
        }

        foreach ($this->_table->getTemplates() as $template) {
            if (is_callable(array($template, $method))) {
                $template->setInvoker($this);
                $this->_table->setMethodOwner($method, $template);

                return call_user_func_array(array($template, $method), $args);
            }
        }

        throw new Doctrine_Record_UnknownPropertyException(sprintf('Unknown method %s::%s', get_class($this), $method));
    }

    /**
     * used to delete node from tree - MUST BE USE TO DELETE RECORD IF TABLE ACTS AS TREE
     *
     */
    public function deleteNode()
    {
        $this->getNode()->delete();
    }
    
    /**
     * Helps freeing the memory occupied by the entity.
     * Cuts all references the entity has to other entities and removes the entity
     * from the instance pool.
     * Note: The entity is no longer useable after free() has been called. Any operations
     * done with the entity afterwards can lead to unpredictable results.
     * @param boolean $deep     whether to free also the related components
     */
    public function free($deep = false)
    {
        if ($this->_state != self::STATE_LOCKED && $this->_state != self::STATE_TLOCKED) {
            $this->_state = $this->exists() ? self::STATE_LOCKED : self::STATE_TLOCKED;

            $this->_table->getRepository()->evict($this->_oid);
            $this->_table->removeRecord($this);
            $this->_data = array();
            $this->_id = array();

            if ($deep) {
                foreach ($this->_references as $name => $reference) {
                    if ( ! ($reference instanceof Doctrine_Null)) {
                        $reference->free($deep);
                    }
                }
            }

            $this->_references = array();
        }
    }

    /**
     * __toString alias
     *
     * @return string
     */
    public function toString()
    {
        return Doctrine_Core::dump(get_object_vars($this));
    }

    /**
     * magic method
     * @return string representation of this object
     */
    public function __toString()
    {
        return (string) $this->_oid;
    }
}