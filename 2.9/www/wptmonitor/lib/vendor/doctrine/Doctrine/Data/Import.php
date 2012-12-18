<?php
/*
 *  $Id: Import.php 2552 2007-09-19 19:33:00Z Jonathan.Wage $
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
 * Doctrine_Data_Import
 *
 * @package     Doctrine
 * @package     Data
 * @author      Jonathan H. Wage <jwage@mac.com>
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 2552 $
 */
class Doctrine_Data_Import extends Doctrine_Data
{
    /**
     * Array of imported objects for processing and saving
     *
     * @var array
     */
    protected $_importedObjects = array();

    /**
     * Array of the raw data parsed from yaml
     *
     * @var array
     */
    protected $_rows = array();

    /**
     * Optionally pass the directory/path to the yaml for importing
     *
     * @param string $directory
     * @return void
     */
    public function __construct($directory = null)
    {
        if ($directory !== null) {
            $this->setDirectory($directory);
        }
    }

    /**
     * Do the parsing of the yaml files and return the final parsed array
     *
     * @return array $array
     */
    public function doParsing()
    {
        $recursiveMerge = Doctrine_Manager::getInstance()->getAttribute(Doctrine_Core::ATTR_RECURSIVE_MERGE_FIXTURES);
        $mergeFunction = $recursiveMerge === true ? 'array_merge_recursive':'array_merge';
        $directory = $this->getDirectory();

        $array = array();

        if ($directory !== null) {
            foreach ((array) $directory as $dir) {
                $e = explode('.', $dir);

                // If they specified a specific yml file
                if (end($e) == 'yml') {
                    $array = $mergeFunction($array, Doctrine_Parser::load($dir, $this->getFormat()));
                // If they specified a directory
                } else if (is_dir($dir)) {
                    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir),
                                                            RecursiveIteratorIterator::LEAVES_ONLY);
                    $filesOrdered = array();                                        
                    foreach ($it as $file) {
                        $filesOrdered[] = $file;
                    }
                    // force correct order
                    natcasesort($filesOrdered);
                    foreach ($filesOrdered as $file) {
                        $e = explode('.', $file->getFileName());
                        if (in_array(end($e), $this->getFormats())) {
                            $array = $mergeFunction($array, Doctrine_Parser::load($file->getPathName(), $this->getFormat()));
                        }
                    }
                }
            }
        }

        return $array;
    }

    /**
     * Do the importing of the data parsed from the fixtures
     *
     * @return void
     */
    public function doImport($append = false)
    {
        $array = $this->doParsing();

        if ( ! $append) {
            $this->purge(array_reverse(array_keys($array)));
        }

        $this->_loadData($array);
    }

    /**
     * Recursively loop over all data fixtures and build the array of className rows
     *
     * @return void
     */
    protected function _buildRows($className, $data)
    {
        $table = Doctrine_Core::getTable($className);

        foreach ($data as $rowKey => $row) {
            // do the same for the row information
            $this->_rows[$className][$rowKey] = $row;

            foreach ((array) $row as $key => $value) {
                if ($table->hasRelation($key) && is_array($value) && ! $table->hasTemplate('Doctrine_Template_I18n')) {
                    // Skip associative arrays defining keys to relationships
                    if ( ! isset($value[0]) || (isset($value[0]) && is_array($value[0]))) {
                        $rel = $table->getRelation($key);
                        $relClassName = $rel->getTable()->getOption('name');
                        $relRowKey = $rowKey . '_' . $relClassName;
            
                        if ($rel->getType() == Doctrine_Relation::ONE) {
                            $val = array($relRowKey => $value);
                            $this->_rows[$className][$rowKey][$key] = $relRowKey;
                        } else {
                            $val = $value;
                            $this->_rows[$className][$rowKey][$key] = array_keys($val);
                        }
            
                        $this->_buildRows($relClassName, $val);
                    }
                }
            }
        }
    }

    /**
     * Build the rows for nested set models
     *
     * @return void
     */
    protected function _buildNestedSetRows($className, $data)
    {
        foreach ($data as $rowKey => $row) {
            $children = isset($row['children']) ? $row['children']:array();
            unset($row['children']);
            $this->_rows[$className][$rowKey] = $row;

            $this->_buildNestedSetRows($className, $children);
        }
    }

    /**
     * Get the unsaved object for a specified row key and validate that it is the valid object class
     * for the passed record and relation name
     *
     * @param  string $rowKey
     * @param  Doctrine_Record $record
     * @param  string $relationName
     * @param  string $referringRowKey
     * @return Doctrine_Record
     * @throws Doctrine_Data_Exception
     */
    protected function _getImportedObject($rowKey, Doctrine_Record $record, $relationName, $referringRowKey)
    {
        $relation = $record->getTable()->getRelation($relationName); 
        $rowKey = $this->_getRowKeyPrefix($relation->getTable()) . $rowKey;

        if ( ! isset($this->_importedObjects[$rowKey])) {
            throw new Doctrine_Data_Exception(
                sprintf('Invalid row key specified: %s, referred to in %s', $rowKey, $referringRowKey)
            );
        }

        $relatedRowKeyObject = $this->_importedObjects[$rowKey];

        $relationClass = $relation->getClass();
        if ( ! $relatedRowKeyObject instanceof $relationClass) {
            throw new Doctrine_Data_Exception(sprintf(
                'Class referred to in "%s" is expected to be "%s" and "%s" was given',
                $referringRowKey, $relation->getClass(), get_class($relatedRowKeyObject)
            ));
        }

        return $relatedRowKeyObject;
    }

    /**
     * Process a row and make all the appropriate relations between the imported data
     *
     * @param string $rowKey
     * @param string $row
     * @return void
     */
    protected function _processRow($rowKey, $row)
    {
        $obj = $this->_importedObjects[$rowKey];

        foreach ((array) $row as $key => $value) {
            if (method_exists($obj, 'set' . Doctrine_Inflector::classify($key))) {
                $func = 'set' . Doctrine_Inflector::classify($key);
                $obj->$func($value);
            } else if ($obj->getTable()->hasField($key)) {
                if ($obj->getTable()->getTypeOf($key) == 'object') {
                    $value = unserialize($value);
                }
                $obj->set($key, $value);
            } else if ($obj->getTable()->hasRelation($key)) {
                if (is_array($value)) {
                    if (isset($value[0]) && ! is_array($value[0])) {
                        foreach ($value as $link) {
                            if ($obj->getTable()->getRelation($key)->getType() === Doctrine_Relation::ONE) {
                                $obj->set($key, $this->_getImportedObject($link, $obj, $key, $rowKey));
                            } else if ($obj->getTable()->getRelation($key)->getType() === Doctrine_Relation::MANY) {
                                $relation = $obj->$key;

                                $relation[] = $this->_getImportedObject($link, $obj, $key, $rowKey);
                            }
                        }
                    } else {
                        $obj->$key->fromArray($value);
                    }
                } else {
                    $obj->set($key, $this->_getImportedObject($value, $obj, $key, $rowKey));
                }
            } else {
                try {
                    $obj->$key = $value;
                } catch (Exception $e) {
                    // used for Doctrine plugin methods (Doctrine_Template)
                    if (is_callable(array($obj, 'set' . Doctrine_Inflector::classify($key)))) {
                        $func = 'set' . Doctrine_Inflector::classify($key);
                        $obj->$func($value);
                    } else {
                        throw new Doctrine_Data_Exception('Invalid fixture element "'. $key . '" under "' . $rowKey . '"');
                    }
                }
            }
        }
    }

   /**
    * NestedSet fixtures may come in a 'natural' format with nested children listed under a 'children'
    * key or in a raw, non-nested format with lft/rgt values.
    *
    * This method returns true if the given $data is a nested set in 'natural' form.
    *
    * @param $className
    * @param $data
    * @return boolean
    */
    protected function _hasNaturalNestedSetFormat($className, array &$data)
    {
        if (Doctrine_Core::getTable($className)->isTree()) {
            if (isset($data['NestedSet']) && $data['NestedSet'] == true) {
                unset($data['NestedSet']);
                return true;
            } else {
                $first = current($data);
                return array_key_exists('children', $first);
            }
        } else {
            return false;
        }
    }

    /**
     * Perform the loading of the data from the passed array
     *
     * @param string $array
     * @return void
     */
    protected function _loadData(array $array)
    {
        $nestedSets = array();

        $specifiedModels = $this->getModels();
        $rows = array();

        foreach ($array as $className => $data) {
            if ( ! empty($specifiedModels) && !in_array($className, $specifiedModels)) {
                continue;
            }

            // if loaded data is a nested set in natural format, process through _buildNestedSetRows.
            // 'raw' nested sets and all other models are processed through _buildRows.
            if ($this->_hasNaturalNestedSetFormat($className, $data)) {
                $nestedSets[$className][] = $data;
                $this->_buildNestedSetRows($className, $data);
            } else {
                $this->_buildRows($className, $data);
            }
        }

        $buildRows = array();
        foreach ($this->_rows as $className => $classRows) {
            $rowKeyPrefix = $this->_getRowKeyPrefix(Doctrine_Core::getTable($className));
            foreach ($classRows as $rowKey => $row) {
                $rowKey = $rowKeyPrefix . $rowKey;
                $buildRows[$rowKey] = $row;
                $this->_importedObjects[$rowKey] = new $className();
                $this->_importedObjects[$rowKey]->state('TDIRTY');
            }
        }

        foreach($buildRows as $rowKey => $row) {
            $this->_processRow($rowKey, $row);
        }

        // save natural nested set fixture data and unset from _importedObjects
        foreach ($nestedSets as $className => $sets) {
            foreach ($sets as $data) {
                $this->_loadNestedSetData($className, $data);
            }
        }

        $manager = Doctrine_Manager::getInstance();
        foreach ($manager as $connection) {
            $tree = $connection->unitOfWork->buildFlushTree(array_keys($array));

            foreach ($tree as $model) {
                foreach ($this->_importedObjects as $obj) {

                    if ($obj instanceof $model) {
                        $obj->save();
                    }
                }
            }
        }

    }

    /**
     * Load nested set data for models with nested set enabled
     *
     * @param string $model
     * @param string $nestedSetData
     * @param string $parent
     * @return void
     */
    protected function _loadNestedSetData($model, $nestedSetData, $parent = null)
    {
        foreach($nestedSetData AS $rowKey => $nestedSet) {
            $children = array();
            $data  = array();

            if (array_key_exists('children', $nestedSet)) {
                $children = (array) $nestedSet['children'];
                $children = array_reverse($children, true);
                unset($nestedSet['children']);
            }

            $rowKey = $this->_getRowKeyPrefix(Doctrine_Core::getTable($model)) . $rowKey;

            $record = $this->_importedObjects[$rowKey];
            // remove this nested set from _importedObjects so it's not processed in the save routine for normal objects
            unset($this->_importedObjects[$rowKey]);

            if ( ! $parent) {
                $record->save(); // save, so that createRoot can do: root id = id
                Doctrine_Core::getTable($model)->getTree()->createRoot($record);
            } else {
                $parent->getNode()->addChild($record);
            }

            if (is_array($children) AND !empty($children)) {
                $this->_loadNestedSetData($model, $children, $record);
            }
        }
    }

    /**
     * Returns the prefix to use when indexing an object from the supplied table.
     *
     * @param Doctrine_Table $table
     * @return string
     */
    protected function _getRowKeyPrefix(Doctrine_Table $table)
    {
        return sprintf('(%s) ', $table->getTableName());
    }
}