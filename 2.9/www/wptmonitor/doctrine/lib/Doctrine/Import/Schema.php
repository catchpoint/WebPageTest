<?php
/*
 * $Id: Schema.php 1838 2007-06-26 00:58:21Z nicobn $
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
 * Doctrine_Import_Schema
 *
 * Class for importing Doctrine_Record classes from a yaml schema definition
 *
 * @package     Doctrine
 * @subpackage  Import
 * @link        www.doctrine-project.org
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @version     $Revision: 1838 $
 * @author      Nicolas Bérard-Nault <nicobn@gmail.com>
 * @author      Jonathan H. Wage <jonwage@gmail.com>
 */
class Doctrine_Import_Schema
{
    /**
     * Schema definition keys that can be applied at the global level.
     *
     * @var array
     */
    protected static $_globalDefinitionKeys = array(
        'connection',
        'attributes',
        'templates',
        'actAs',
        'options',
        'package',
        'package_custom_path',
        'inheritance',
        'detect_relations');

    /**
     * _relations
     *
     * Array of all relationships parsed from all schema files
     *
     * @var array
     */
    protected $_relations = array();

    /**
     * _options
     *
     * Array of options used to configure the model generation from the parsed schema files
     * This array is forwarded to Doctrine_Import_Builder
     *
     * @var array
     */
    protected $_options = array('packagesPrefix'        =>  'Package',
                                'packagesPath'          =>  '',
                                'packagesFolderName'    =>  'packages',
                                'suffix'                =>  '.php',
                                'generateBaseClasses'   =>  true,
                                'generateTableClasses'  =>  false,
                                'generateAccessors'     =>  false,
                                'baseClassPrefix'       =>  'Base',
                                'baseClassesDirectory'  =>  'generated',
                                'baseClassName'         =>  'Doctrine_Record');

    /**
     * _validation
     *
     * Array used to validate schema element.
     * See: _validateSchemaElement
     *
     * @var array
     */
    protected $_validation = array('root'       =>  array('abstract',
                                                          'connection',
                                                          'className',
                                                          'tableName',
                                                          'connection',
                                                          'relations',
                                                          'columns',
                                                          'indexes',
                                                          'attributes',
                                                          'templates',
                                                          'actAs',
                                                          'options',
                                                          'package',
                                                          'package_custom_path',
                                                          'inheritance',
                                                          'detect_relations',
                                                          'listeners',
                                                          'checks',
                                                          'comment'),

                                   'column'     =>  array('name',
                                                          'format',
                                                          'fixed',
                                                          'primary',
                                                          'autoincrement',
                                                          'type',
                                                          'length',
                                                          'size',
                                                          'default',
                                                          'scale',
                                                          'values',
                                                          'comment',
                                                          'sequence',
                                                          'protected',
                                                          'zerofill',
                                                          'owner',
                                                          'extra',
                                                          'comment'),

                                   'relation'   =>  array('key',
                                                          'class',
                                                          'alias',
                                                          'type',
                                                          'refClass',
                                                          'local',
                                                          'foreign',
                                                          'foreignClass',
                                                          'foreignAlias',
                                                          'foreignType',
                                                          'autoComplete',
                                                          'cascade',
                                                          'onDelete',
                                                          'onUpdate',
                                                          'equal',
                                                          'owningSide',
                                                          'refClassRelationAlias',
                                                          'foreignKeyName',
                                                          'orderBy'),

                                   'inheritance'=>  array('type',
                                                          'extends',
                                                          'keyField',
                                                          'keyValue'));

    /**
     * Returns an array of definition keys that can be applied at the global level.
     * 
     * @return array
     */
    public static function getGlobalDefinitionKeys()
    {
        return self::$_globalDefinitionKeys;
    }

    /**
     * getOption
     *
     * @param string $name 
     * @return void
     */
    public function getOption($name)
    {
        if (isset($this->_options[$name]))   {
            return $this->_options[$name];
        }
    }

    /**
     * getOptions
     *
     * @return void
     */
    public function getOptions()
    {
        return $this->_options;
    }

    /**
     * setOption
     *
     * @param string $name 
     * @param string $value 
     * @return void
     */
    public function setOption($name, $value)
    {
        if (isset($this->_options[$name])) {
            $this->_options[$name] = $value;
        }
    }
    
    /**
     * setOptions
     *
     * @param string $options 
     * @return void
     */
    public function setOptions($options)
    {
        if ( ! empty($options)) {
          $this->_options = $options;
        }
    }

    /**
     * buildSchema
     *
     * Loop throug directories of schema files and parse them all in to one complete array of schema information
     *
     * @param  string   $schema Array of schema files or single schema file. Array of directories with schema files or single directory
     * @param  string   $format Format of the files we are parsing and building from
     * @return array    $array
     */
    public function buildSchema($schema, $format)
    {
        $array = array();

        foreach ((array) $schema AS $s) {
            if (is_file($s)) {
                $e = explode('.', $s);
                if (end($e) === $format) {
                    $array = array_merge($array, $this->parseSchema($s, $format));
                }          
            } else if (is_dir($s)) {
                $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($s),
                                                      RecursiveIteratorIterator::LEAVES_ONLY);

                foreach ($it as $file) {
                    $e = explode('.', $file->getFileName());
                    if (end($e) === $format) {
                        $array = array_merge($array, $this->parseSchema($file->getPathName(), $format));
                    }
                }
            } else {
              $array = array_merge($array, $this->parseSchema($s, $format));
            }
        }

        $array = $this->_buildRelationships($array);
        $array = $this->_processInheritance($array);

        return $array;
    }

    /**
     * importSchema
     *
     * A method to import a Schema and translate it into a Doctrine_Record object
     *
     * @param  string $schema       The file containing the XML schema
     * @param  string $format       Format of the schema file
     * @param  string $directory    The directory where the Doctrine_Record class will be written
     * @param  array  $models       Optional array of models to import
     *
     * @return void
     */
    public function importSchema($schema, $format = 'yml', $directory = null, $models = array())
    {
        $schema = (array) $schema;
        $builder = new Doctrine_Import_Builder();
        $builder->setTargetPath($directory);
        $builder->setOptions($this->getOptions());
        
        $array = $this->buildSchema($schema, $format);

        if (count($array) == 0) { 
            throw new Doctrine_Import_Exception(
                sprintf('No ' . $format . ' schema found in ' . implode(", ", $schema))
            ); 
        }

        foreach ($array as $name => $definition) {
            if ( ! empty($models) && !in_array($definition['className'], $models)) {
                continue;
            }
            
            $builder->buildRecord($definition);
        }
    }

    /**
     * parseSchema
     *
     * A method to parse a Schema and translate it into a property array.
     * The function returns that property array.
     *
     * @param  string $schema   Path to the file containing the schema
     * @param  string $type     Format type of the schema we are parsing
     * @return array  $build    Built array of schema information
     */
    public function parseSchema($schema, $type)
    {
        $defaults = array('abstract'            =>  false,
                          'className'           =>  null,
                          'tableName'           =>  null,
                          'connection'          =>  null,
                          'relations'           =>  array(),
                          'indexes'             =>  array(),
                          'attributes'          =>  array(),
                          'templates'           =>  array(),
                          'actAs'               =>  array(),
                          'options'             =>  array(),
                          'package'             =>  null,
                          'inheritance'         =>  array(),
                          'detect_relations'    =>  false);
        
        $array = Doctrine_Parser::load($schema, $type);

        // Loop over and build up all the global values and remove them from the array
        $globals = array();
        foreach ($array as $key => $value) {
            if (in_array($key, self::$_globalDefinitionKeys)) {
                unset($array[$key]);
                $globals[$key] = $value;
            }
        }

        // Merge the globals that aren't specifically set to each class
        foreach ($array as $className => $table) {
            $array[$className] = Doctrine_Lib::arrayDeepMerge($globals, $array[$className]);
        }

        $build = array();

        foreach ($array as $className => $table) {
            $table = (array) $table;
            $this->_validateSchemaElement('root', array_keys($table), $className);

            $columns = array();

            $className = isset($table['className']) ? (string) $table['className']:(string) $className;

            if (isset($table['inheritance']['keyField']) || isset($table['inheritance']['keyValue'])) {
                $table['inheritance']['type'] = 'column_aggregation';
            }

            if (isset($table['tableName']) && $table['tableName']) {
                $tableName = $table['tableName'];
            } else {
                if (isset($table['inheritance']['type']) && ($table['inheritance']['type'] == 'column_aggregation')) {
                    $tableName = null;
                } else {
                    $tableName = Doctrine_Inflector::tableize($className);
                }
            }

            $connection = isset($table['connection']) ? $table['connection']:'current';

            $columns = isset($table['columns']) ? $table['columns']:array();

            if ( ! empty($columns)) {
                foreach ($columns as $columnName => $field) {

                    // Support short syntax: my_column: integer(4)
                    if ( ! is_array($field)) {
                        $original = $field;
                        $field = array();
                        $field['type'] = $original;
                    }

                    $colDesc = array();
                    if (isset($field['name'])) {
                        $colDesc['name'] = $field['name'];
                    } else {
                        $colDesc['name'] = $columnName;
                    }

                    $this->_validateSchemaElement('column', array_keys($field), $className . '->columns->' . $colDesc['name']);

                    // Support short type(length) syntax: my_column: { type: integer(4) }
                    $e = explode('(', $field['type']);
                    if (isset($e[0]) && isset($e[1])) {
                        $colDesc['type'] = $e[0];
                        $value = substr($e[1], 0, strlen($e[1]) - 1);
                        $e = explode(',', $value);
                        $colDesc['length'] = $e[0];
                        if (isset($e[1]) && $e[1]) {
                            $colDesc['scale'] = $e[1];
                        }
                    } else {
                        $colDesc['type'] = isset($field['type']) ? (string) $field['type']:null;
                        $colDesc['length'] = isset($field['length']) ? (int) $field['length']:null;
                        $colDesc['length'] = isset($field['size']) ? (int) $field['size']:$colDesc['length'];
                    }

                    $colDesc['fixed'] = isset($field['fixed']) ? (int) $field['fixed']:null;
                    $colDesc['primary'] = isset($field['primary']) ? (bool) (isset($field['primary']) && $field['primary']):null;
                    $colDesc['default'] = isset($field['default']) ? $field['default']:null;
                    $colDesc['autoincrement'] = isset($field['autoincrement']) ? (bool) (isset($field['autoincrement']) && $field['autoincrement']):null;

                    if (isset($field['sequence'])) {
                        if (true === $field['sequence']) {
                            $colDesc['sequence'] = $tableName;
                        } else {
                            $colDesc['sequence'] = (string) $field['sequence'];
                        }
                    } else {
                        $colDesc['sequence'] = null;
                    }

                    $colDesc['values'] = isset($field['values']) ? (array) $field['values']:null;

                    // Include all the specified and valid validators in the colDesc
                    $validators = Doctrine_Manager::getInstance()->getValidators();

                    foreach ($validators as $validator) {
                        if (isset($field[$validator])) {
                            $colDesc[$validator] = $field[$validator];
                        }
                    }

                    $columns[(string) $columnName] = $colDesc;
                }
            }

            // Apply the default values
            foreach ($defaults as $key => $defaultValue) {
                if (isset($table[$key]) && ! isset($build[$className][$key])) {
                    $build[$className][$key] = $table[$key];
                } else {
                    $build[$className][$key] = isset($build[$className][$key]) ? $build[$className][$key]:$defaultValue;
                }
            }
            
            $build[$className]['className'] = $className;
            $build[$className]['tableName'] = $tableName;
            $build[$className]['columns'] = $columns;
            
            // Make sure that anything else that is specified in the schema makes it to the final array
            $build[$className] = Doctrine_Lib::arrayDeepMerge($table, $build[$className]);
            
            // We need to keep track of the className for the connection
            $build[$className]['connectionClassName'] = $build[$className]['className'];
        }

        return $build;
    }

    /**
     * _processInheritance
     * 
     * Perform some processing on inheritance.
     * Sets the default type and sets some default values for certain types
     *
     * @param string $array 
     * @return void
     */
    protected function _processInheritance($array)
    {
        // Apply default inheritance configuration
        foreach ($array as $className => $definition) {
            if ( ! empty($array[$className]['inheritance'])) {
                $this->_validateSchemaElement('inheritance', array_keys($definition['inheritance']), $className . '->inheritance');

                // Default inheritance to concrete inheritance
                if ( ! isset($array[$className]['inheritance']['type'])) {
                    $array[$className]['inheritance']['type'] = 'concrete';
                }

                // Some magic for setting up the keyField and keyValue column aggregation options
                // Adds keyField to the parent class automatically
                if ($array[$className]['inheritance']['type'] == 'column_aggregation') {
                    // Set the keyField to 'type' by default
                    if ( ! isset($array[$className]['inheritance']['keyField'])) {
                        $array[$className]['inheritance']['keyField'] = 'type';                        
                    }
                    
                    // Set the keyValue to the name of the child class if it does not exist
                    if ( ! isset($array[$className]['inheritance']['keyValue'])) {
                        $array[$className]['inheritance']['keyValue'] = $className;
                    }

                    $parent = $this->_findBaseSuperClass($array, $definition['className']);
                    // Add the keyType column to the parent if a definition does not already exist
                    if ( ! isset($array[$parent]['columns'][$array[$className]['inheritance']['keyField']])) {
                        $array[$parent]['columns'][$array[$className]['inheritance']['keyField']] = array('name' => $array[$className]['inheritance']['keyField'], 'type' => 'string', 'length' => 255);
                    }
                }
            }
        }

        // Array of the array keys to move to the parent, and the value to default the child definition to
        // after moving it. Will also populate the subclasses array for the inheritance parent
        $moves = array('columns' => array(),
                       'indexes' => array(),
                       'attributes' => array(),
                       'options' => array(),
                       'checks' => array());

        foreach ($array as $className => $definition) {
            // Move any definitions on the schema to the parent
            if (isset($definition['inheritance']['extends']) && isset($definition['inheritance']['type']) && ($definition['inheritance']['type'] == 'simple' || $definition['inheritance']['type'] == 'column_aggregation')) {
                $parent = $this->_findBaseSuperClass($array, $definition['className']);
                foreach ($moves as $move => $resetValue) {
                    if (isset($array[$parent][$move]) && isset($definition[$move])) {
                        $array[$parent][$move] = Doctrine_Lib::arrayDeepMerge($array[$parent][$move], $definition[$move]);
                        $array[$definition['className']][$move] = $resetValue;
                    }
                }

                // Populate the parents subclasses
                if ($definition['inheritance']['type'] == 'column_aggregation') {
                    // Fix for 2015: loop through superclasses' inheritance to the base-superclass to  
                    // make sure we collect all keyFields needed (and not only the first) 
                    $inheritanceFields = array($definition['inheritance']['keyField'] => $definition['inheritance']['keyValue']); 

                    $superClass = $definition['inheritance']['extends']; 
                    $multiInheritanceDef = $array[$superClass]; 

                    while (count($multiInheritanceDef['inheritance']) > 0 && array_key_exists('extends', $multiInheritanceDef['inheritance']) && $multiInheritanceDef['inheritance']['type'] == 'column_aggregation') { 
                        $superClass = $multiInheritanceDef['inheritance']['extends'];
                        
                        // keep original keyField with it's keyValue
                        if ( ! isset($inheritanceFields[$multiInheritanceDef['inheritance']['keyField']])) { 
                            $inheritanceFields[$multiInheritanceDef['inheritance']['keyField']] = $multiInheritanceDef['inheritance']['keyValue'];
                        } 
                        $multiInheritanceDef = $array[$superClass]; 
                    } 

                    $array[$parent]['inheritance']['subclasses'][$definition['className']] = $inheritanceFields;
                }
            }
        }

        return $array;
    }

    /**
     * Find the base super class for this inheritance child. We need to move all levels of children to the
     * top most parent.
     *
     * @param  array  $array  Array of schema information
     * @return string $class  Class to get find the parent for
     */
    protected function _findBaseSuperClass($array, $class)
    {
        if (isset($array[$class]['inheritance']['extends']) && isset($array[$class]['inheritance']['type']) && ($array[$class]['inheritance']['type'] == 'simple' || $array[$class]['inheritance']['type'] == 'column_aggregation')) {
            return $this->_findBaseSuperClass($array, $array[$class]['inheritance']['extends']);
        } else {
            return $class;
        }
    }

    /**
     * buildRelationships
     *
     * Loop through an array of schema information and build all the necessary relationship information
     * Will attempt to auto complete relationships and simplify the amount of information required 
     * for defining a relationship
     *
     * @param  string $array 
     * @return void
     */
    protected function _buildRelationships($array)
    {
        // Handle auto detecting relations by the names of columns
        // User.contact_id will automatically create User hasOne Contact local => contact_id, foreign => id
        foreach ($array as $className => $properties) {
            if (isset($properties['columns']) && ! empty($properties['columns']) && isset($properties['detect_relations']) && $properties['detect_relations']) {
                foreach ($properties['columns'] as $column) {
                    // Check if the column we are inflecting has a _id on the end of it before trying to inflect it and find
                    // the class name for the column
                    if (strpos($column['name'], '_id')) {
                        $columnClassName = Doctrine_Inflector::classify(str_replace('_id', '', $column['name']));
                        if (isset($array[$columnClassName]) && !isset($array[$className]['relations'][$columnClassName])) {
                            $array[$className]['relations'][$columnClassName] = array();

                            // Set the detected foreign key type and length to the same as the primary key
                            // of the related table
                            $type = isset($array[$columnClassName]['columns']['id']['type']) ? $array[$columnClassName]['columns']['id']['type']:'integer';
                            $length = isset($array[$columnClassName]['columns']['id']['length']) ? $array[$columnClassName]['columns']['id']['length']:8;
                            $array[$className]['columns'][$column['name']]['type'] = $type;
                            $array[$className]['columns'][$column['name']]['length'] = $length;
                        }
                    }
                }
            }
        }

        foreach ($array as $name => $properties) {
            if ( ! isset($properties['relations'])) {
                continue;
            }
            
            $className = $properties['className'];
            $relations = $properties['relations'];
            
            foreach ($relations as $alias => $relation) {
                $class = isset($relation['class']) ? $relation['class']:$alias;
                if ( ! isset($array[$class])) {
                    continue;
                }
                $relation['class'] = $class;
                $relation['alias'] = isset($relation['alias']) ? $relation['alias'] : $alias;
                
                // Attempt to guess the local and foreign
                if (isset($relation['refClass'])) {
                    $relation['local'] = isset($relation['local']) ? $relation['local']:Doctrine_Inflector::tableize($name) . '_id';
                    $relation['foreign'] = isset($relation['foreign']) ? $relation['foreign']:Doctrine_Inflector::tableize($class) . '_id';
                } else {
                    $relation['local'] = isset($relation['local']) ? $relation['local']:Doctrine_Inflector::tableize($relation['class']) . '_id';
                    $relation['foreign'] = isset($relation['foreign']) ? $relation['foreign']:'id';
                }
                
                if (isset($relation['refClass'])) {
                    $relation['type'] = 'many';
                }
                
                if (isset($relation['type']) && $relation['type']) {
                    $relation['type'] = $relation['type'] === 'one' ? Doctrine_Relation::ONE:Doctrine_Relation::MANY;
                } else {
                    $relation['type'] = Doctrine_Relation::ONE;
                }

                if (isset($relation['foreignType']) && $relation['foreignType']) {
                    $relation['foreignType'] = $relation['foreignType'] === 'one' ? Doctrine_Relation::ONE:Doctrine_Relation::MANY;
                }
                
                $relation['key'] = $this->_buildUniqueRelationKey($relation);
                
                $this->_validateSchemaElement('relation', array_keys($relation), $className . '->relation->' . $relation['alias']);
                
                $this->_relations[$className][$alias] = $relation;
            }
        }
        
        // Now we auto-complete opposite ends of relationships
        $this->_autoCompleteOppositeRelations();
        
        // Make sure we do not have any duplicate relations
        $this->_fixDuplicateRelations();

        // Set the full array of relationships for each class to the final array
        foreach ($this->_relations as $className => $relations) {
            $array[$className]['relations'] = $relations;
        }
        
        return $array;
    }

    /**
     * fixRelationships
     *
     * Loop through all relationships building the opposite ends of each relationship
     * and make sure no duplicate relations exist
     *
     * @return void
     */
    protected function _autoCompleteOppositeRelations()
    {
        foreach($this->_relations as $className => $relations) {
            foreach ($relations AS $alias => $relation) {
                if ((isset($relation['equal']) && $relation['equal']) || (isset($relation['autoComplete']) && $relation['autoComplete'] === false)) {
                    continue;
                }
                
                $newRelation = array();
                $newRelation['foreign'] = $relation['local'];
                $newRelation['local'] = $relation['foreign'];
                $newRelation['class'] = isset($relation['foreignClass']) ? $relation['foreignClass']:$className;
                $newRelation['alias'] = isset($relation['foreignAlias']) ? $relation['foreignAlias']:$className;
                $newRelation['foreignAlias'] = $alias;
                
                // this is so that we know that this relation was autogenerated and
                // that we do not need to include it if it is explicitly declared in the schema by the users.
                $newRelation['autogenerated'] = true; 
                
                if (isset($relation['refClass'])) {
                    $newRelation['refClass'] = $relation['refClass'];
                    $newRelation['type'] = isset($relation['foreignType']) ? $relation['foreignType']:$relation['type'];
                } else {                
                    if (isset($relation['foreignType'])) {
                        $newRelation['type'] = $relation['foreignType'];
                    } else {
                        $newRelation['type'] = $relation['type'] === Doctrine_Relation::ONE ? Doctrine_Relation::MANY:Doctrine_Relation::ONE;
                    }
                }

                // Make sure it doesn't already exist
                if ( ! isset($this->_relations[$relation['class']][$newRelation['alias']])) {
                    $newRelation['key'] = $this->_buildUniqueRelationKey($newRelation);
                    $this->_relations[$relation['class']][$newRelation['alias']] = $newRelation;
                }
            }
        }
    }

    /**
     * _fixDuplicateRelations
     *
     * Ensure the relations for each class are unique and that no duplicated relations exist from the auto generated relations
     * and the user explicitely defining the opposite end
     *
     * @return void
     */
    protected function _fixDuplicateRelations()
    {
        foreach($this->_relations as $className => $relations) {
            // This is for checking for duplicates between alias-relations and a auto-generated relations to ensure the result set of unique relations
            $existingRelations = array();
            $uniqueRelations = array();
            foreach ($relations as $relation) {
                if ( ! in_array($relation['key'], $existingRelations)) {
                    $existingRelations[] = $relation['key'];
                    $uniqueRelations = array_merge($uniqueRelations, array($relation['alias'] => $relation));
                } else {
                    // check to see if this relationship is not autogenerated, if it's not, then the user must have explicitly declared it
                    if ( ! isset($relation['autogenerated']) || $relation['autogenerated'] != true) {
                        $uniqueRelations = array_merge($uniqueRelations, array($relation['alias'] => $relation));
                    }
                }
            }
            
            $this->_relations[$className] = $uniqueRelations;
        }
    }

    /**
     * _buildUniqueRelationKey
     *
     * Build a unique key to identify a relationship by
     * Md5 hash of all the relationship parameters
     *
     * @param string $relation 
     * @return void
     */
    protected function _buildUniqueRelationKey($relation)
    {
        return md5($relation['local'].$relation['foreign'].$relation['class'].(isset($relation['refClass']) ? $relation['refClass']:null));
    }

    /**
     * _validateSchemaElement
     *
     * @param string $name 
     * @param string $value 
     * @return void
     */
    protected function _validateSchemaElement($name, $element, $path)
    {
        $element = (array) $element;

        $validation = $this->_validation[$name];

        // Validators are a part of the column validation
        // This should be fixed, made cleaner
        if ($name == 'column') {
            $validators = Doctrine_Manager::getInstance()->getValidators();
            $validation = array_merge($validation, $validators);
        }

        $validation = array_flip($validation);
        foreach ($element as $key => $value) {
            if ( ! isset($validation[$value])) {
                throw new Doctrine_Import_Exception(
                    sprintf('Invalid schema element named "' . $value . '" at path "' . $path . '"')
                );
            }
        }
    }
}