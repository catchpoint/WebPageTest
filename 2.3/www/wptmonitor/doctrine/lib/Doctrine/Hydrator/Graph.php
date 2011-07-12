<?php
/*
 *  $Id$
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
 * Abstract base class for child drivers to hydrate the object graph in to
 * various data types. For example Doctrine_Record instances or PHP arrays
 *
 * @package     Doctrine
 * @subpackage  Hydrate
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision$
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Roman Borschel <roman@code-factory.org>
 * @author      Jonathan H. Wage <jonwage@gmail.com>
 */
abstract class Doctrine_Hydrator_Graph extends Doctrine_Hydrator_Abstract
{
    protected $_tables = array();

    /**
     * Gets the custom field used for indexing for the specified component alias.
     *
     * @return string  The field name of the field used for indexing or NULL
     *                 if the component does not use any custom field indices.
     */
    protected function _getCustomIndexField($alias)
    {
        return isset($this->_queryComponents[$alias]['map']) ? $this->_queryComponents[$alias]['map'] : null;
    }

    public function hydrateResultSet($stmt)
    {
        // Used variables during hydration
        reset($this->_queryComponents);
        $rootAlias = key($this->_queryComponents);
        $this->_rootAlias = $rootAlias;
        $rootComponentName = $this->_queryComponents[$rootAlias]['table']->getComponentName();
        // if only one component is involved we can make our lives easier
        $isSimpleQuery = count($this->_queryComponents) <= 1;
        // Holds the resulting hydrated data structure
        $result = array();
        // Holds array of record instances so we can call hooks on it
        $instances = array();
        // Holds hydration listeners that get called during hydration
        $listeners = array();
        // Lookup map to quickly discover/lookup existing records in the result
        $identifierMap = array();
        // Holds for each component the last previously seen element in the result set
        $prev = array();
        // holds the values of the identifier/primary key fields of components,
        // separated by a pipe '|' and grouped by component alias (r, u, i, ... whatever)
        // the $idTemplate is a prepared template. $id is set to a fresh template when
        // starting to process a row.
        $id = array();
        $idTemplate = array();

        // Initialize 
     	foreach ($this->_queryComponents as $dqlAlias => $data) { 
     	    $componentName = $data['table']->getComponentName(); 
     	    $instances[$componentName] = $data['table']->getRecordInstance(); 
     	    $listeners[$componentName] = $data['table']->getRecordListener(); 
     	    $identifierMap[$dqlAlias] = array(); 
     	    $prev[$dqlAlias] = null; 
     	    $idTemplate[$dqlAlias] = ''; 
     	} 
     	$cache = array();
     	
        $result = $this->getElementCollection($rootComponentName);

        if ($stmt === false || $stmt === 0) {
            return $result;
        }

        // Process result set
        $cache = array();

        $event = new Doctrine_Event(null, Doctrine_Event::HYDRATE, null);

        if ($this->_hydrationMode == Doctrine_Core::HYDRATE_ON_DEMAND) {
            if ( ! is_null($this->_priorRow)) {
                $data = $this->_priorRow;
                $this->_priorRow = null;
            } else {
                $data = $stmt->fetch(Doctrine_Core::FETCH_ASSOC);
                if ( ! $data) {
                    return $result;
                }
            }
            $activeRootIdentifier = null;
        } else { 
            $data = $stmt->fetch(Doctrine_Core::FETCH_ASSOC); 
            if ( ! $data) { 
                return $result; 
            }
        }

        do {
            $table = $this->_queryComponents[$rootAlias]['table'];
        
            if ($table->getConnection()->getAttribute(Doctrine_Core::ATTR_PORTABILITY) & Doctrine_Core::PORTABILITY_RTRIM) {
                array_map('rtrim', $data);
            }
        
            $id = $idTemplate; // initialize the id-memory
            $nonemptyComponents = array();
            $rowData = $this->_gatherRowData($data, $cache, $id, $nonemptyComponents);

            if ($this->_hydrationMode == Doctrine_Core::HYDRATE_ON_DEMAND)  { 
                if (is_null($activeRootIdentifier)) { 
                    // first row for this record 
                    $activeRootIdentifier = $id[$rootAlias]; 
                } else if ($activeRootIdentifier != $id[$rootAlias]) { 
                    // first row for the next record 
                    $this->_priorRow = $data; 
                    return $result; 
                } 
            }

            //
            // hydrate the data of the root component from the current row
            //
            $componentName = $table->getComponentName();
            // Ticket #1115 (getInvoker() should return the component that has addEventListener)
            $event->setInvoker($table);
            $event->set('data', $rowData[$rootAlias]);
            $listeners[$componentName]->preHydrate($event);
            $instances[$componentName]->preHydrate($event);

            $index = false;

            // Check for an existing element
            if ($isSimpleQuery || ! isset($identifierMap[$rootAlias][$id[$rootAlias]])) {
                $element = $this->getElement($rowData[$rootAlias], $componentName);
                $event->set('data', $element);
                $listeners[$componentName]->postHydrate($event);
                $instances[$componentName]->postHydrate($event);

                // do we need to index by a custom field?
                if ($field = $this->_getCustomIndexField($rootAlias)) {
                    if ( ! isset($element[$field])) {
                        throw new Doctrine_Hydrator_Exception("Couldn't hydrate. Found a non-existent key named '$field'.");
                    } else if (isset($result[$element[$field]])) {
                        throw new Doctrine_Hydrator_Exception("Couldn't hydrate. Found non-unique key mapping named '{$element[$field]}' for the field named '$field'.");
                    }
                    $result[$element[$field]] = $element;
                } else {
                    $result[] = $element;
                }

                $identifierMap[$rootAlias][$id[$rootAlias]] = $this->getLastKey($result);
            } else {
                $index = $identifierMap[$rootAlias][$id[$rootAlias]];
            }

            $this->setLastElement($prev, $result, $index, $rootAlias, false);
            unset($rowData[$rootAlias]);

            // end hydrate data of the root component for the current row

            // $prev[$rootAlias] now points to the last element in $result.
            // now hydrate the rest of the data found in the current row, that belongs to other
            // (related) components.
            foreach ($rowData as $dqlAlias => $data) {
                $index = false;
                $map = $this->_queryComponents[$dqlAlias];
                $table = $map['table'];
                $componentName = $table->getComponentName();
                $event->set('data', $data);
                $event->setInvoker($table);
                $listeners[$componentName]->preHydrate($event);
                $instances[$componentName]->preHydrate($event);

                // It would be nice if this could be moved to the query parser but I could not find a good place to implement it
                if ( ! isset($map['parent'])) {
                    throw new Doctrine_Hydrator_Exception(
                        '"' . $componentName . '" with an alias of "' . $dqlAlias . '"' .
                        ' in your query does not reference the parent component it is related to.'
                    );
                }

                $parent = $map['parent'];
                $relation = $map['relation'];
                $relationAlias = $map['relation']->getAlias();

                $path = $parent . '.' . $dqlAlias;

                if ( ! isset($prev[$parent])) {
                    unset($prev[$dqlAlias]); // Ticket #1228
                    continue;
                }

                // check the type of the relation
                if ( ! $relation->isOneToOne() && $this->initRelated($prev[$parent], $relationAlias)) {
                    $oneToOne = false;
                    // append element
                    if (isset($nonemptyComponents[$dqlAlias])) {
                        $indexExists = isset($identifierMap[$path][$id[$parent]][$id[$dqlAlias]]);
                        $index = $indexExists ? $identifierMap[$path][$id[$parent]][$id[$dqlAlias]] : false;
                        $indexIsValid = $index !== false ? isset($prev[$parent][$relationAlias][$index]) : false;
                        if ( ! $indexExists || ! $indexIsValid) {
                            $element = $this->getElement($data, $componentName);
                            $event->set('data', $element);
                            $listeners[$componentName]->postHydrate($event);
                            $instances[$componentName]->postHydrate($event);

                            if ($field = $this->_getCustomIndexField($dqlAlias)) {
                                if ( ! isset($element[$field])) {
                                    throw new Doctrine_Hydrator_Exception("Couldn't hydrate. Found a non-existent key named '$field'.");
                                } else if (isset($prev[$parent][$relationAlias][$element[$field]])) {
                                    throw new Doctrine_Hydrator_Exception("Couldn't hydrate. Found non-unique key mapping named '$field'.");
                                }
                                $prev[$parent][$relationAlias][$element[$field]] = $element;
                            } else {
                                $prev[$parent][$relationAlias][] = $element; 
                            }
                            $identifierMap[$path][$id[$parent]][$id[$dqlAlias]] = $this->getLastKey($prev[$parent][$relationAlias]);                            
                        }
                        // register collection for later snapshots
                        $this->registerCollection($prev[$parent][$relationAlias]);
                    }
                } else {
                    // 1-1 relation
                    $oneToOne = true;
                    if ( ! isset($nonemptyComponents[$dqlAlias]) && ! isset($prev[$parent][$relationAlias])) {
                        $prev[$parent][$relationAlias] = $this->getNullPointer();
                    } else if ( ! isset($prev[$parent][$relationAlias])) {
                        $element = $this->getElement($data, $componentName);

						// [FIX] Tickets #1205 and #1237
                        $event->set('data', $element);
                        $listeners[$componentName]->postHydrate($event);
                        $instances[$componentName]->postHydrate($event);

                        $prev[$parent][$relationAlias] = $element;
                    }
                }
                if ($prev[$parent][$relationAlias] !== null) {
                    $coll =& $prev[$parent][$relationAlias];
                    $this->setLastElement($prev, $coll, $index, $dqlAlias, $oneToOne);
                }
            }
        } while ($data = $stmt->fetch(Doctrine_Core::FETCH_ASSOC));

        $stmt->closeCursor();
        $this->flush();

        return $result;
    }

    /**
     * Puts the fields of a data row into a new array, grouped by the component
     * they belong to. The column names in the result set are mapped to their
     * field names during this procedure.
     *
     * @return array  An array with all the fields (name => value) of the data row,
     *                grouped by their component (alias).
     */
    protected function _gatherRowData(&$data, &$cache, &$id, &$nonemptyComponents)
    {
        $rowData = array();

        foreach ($data as $key => $value) {
            // Parse each column name only once. Cache the results. 
            if ( ! isset($cache[$key])) {
                // check ignored names. fastest solution for now. if we get more we'll start
                // to introduce a list.
                if ($this->_isIgnoredName($key)) {
                    continue;
                }

                $e = explode('__', $key);
                $last = strtolower(array_pop($e));
                $cache[$key]['dqlAlias'] = $this->_tableAliases[strtolower(implode('__', $e))];
                $table = $this->_queryComponents[$cache[$key]['dqlAlias']]['table'];
                $fieldName = $table->getFieldName($last);
                $cache[$key]['fieldName'] = $fieldName;
                if ($table->isIdentifier($fieldName)) {
                    $cache[$key]['isIdentifier'] = true;
                } else {
                  $cache[$key]['isIdentifier'] = false;
                }
                $type = $table->getTypeOfColumn($last);
                if ($type == 'integer' || $type == 'string') {
                    $cache[$key]['isSimpleType'] = true;
                } else {
                    $cache[$key]['type'] = $type;
                    $cache[$key]['isSimpleType'] = false;
                }
            }

            $map = $this->_queryComponents[$cache[$key]['dqlAlias']];
            $table = $map['table'];
            $dqlAlias = $cache[$key]['dqlAlias'];
            $fieldName = $cache[$key]['fieldName'];
            $agg = false;
            if (isset($this->_queryComponents[$dqlAlias]['agg'][$fieldName])) {
                $fieldName = $this->_queryComponents[$dqlAlias]['agg'][$fieldName];
                $agg = true;
            }

            if ($cache[$key]['isIdentifier']) {
                $id[$dqlAlias] .= '|' . $value;
            }

            if ($cache[$key]['isSimpleType']) {
                $preparedValue = $value;
            } else {
                $preparedValue = $table->prepareValue($fieldName, $value, $cache[$key]['type']);
            }

            // Ticket #1380
            // Hydrate aggregates in to the root component as well.
            // So we know that all aggregate values will always be available in the root component
            if ($agg) {
                $rowData[$this->_rootAlias][$fieldName] = $preparedValue;
                if (isset($rowData[$dqlAlias])) {
                    $rowData[$dqlAlias][$fieldName] = $preparedValue;
                }
            } else {
                $rowData[$dqlAlias][$fieldName] = $preparedValue;
            }

            if ( ! isset($nonemptyComponents[$dqlAlias]) && $value !== null) {
                $nonemptyComponents[$dqlAlias] = true;
            }
        }

        return $rowData;
    }

    abstract public function getElementCollection($component);

    abstract public function registerCollection($coll);
 
    abstract public function initRelated(&$record, $name);
 
    abstract public function getNullPointer();
 
    abstract public function getElement(array $data, $component);

    abstract public function getLastKey(&$coll);

    abstract public function setLastElement(&$prev, &$coll, $index, $dqlAlias, $oneToOne);

    public function flush()
    {

    }

    /**
     * Get the classname to return. Most often this is just the options['name']
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
     *
     */
    protected function _getClassnameToReturn(array &$data, $component)
    {
        if ( ! isset($this->_tables[$component])) {
            $this->_tables[$component] = Doctrine_Core::getTable($component);
        }
        
        if ( ! ($subclasses = $this->_tables[$component]->getOption('subclasses'))) {
            return $component;
        }
        
        $matchedComponents = array($component);
        foreach ($subclasses as $subclass) {
            $table = Doctrine_Core::getTable($subclass);
            $inheritanceMap = $table->getOption('inheritanceMap');
            if (count($inheritanceMap) > 1) {
                $needMatches = count($inheritanceMap);
                foreach ($inheritanceMap as $key => $value) {
                    $key = $this->_tables[$component]->getFieldName($key);
                    if ( isset($data[$key]) && $data[$key] == $value) {
                        --$needMatches;
                    }
                }
                if ($needMatches == 0) {
                    $matchedComponents[] = $table->getComponentName();
                }
            } else {
                list($key, $value) = each($inheritanceMap);
                $key = $this->_tables[$component]->getFieldName($key);
                if ( ! isset($data[$key]) || $data[$key] != $value) {
                    continue;
                } else {
                    $matchedComponents[] = $table->getComponentName();
                }
            }
        }
        
        $matchedComponent = $matchedComponents[count($matchedComponents)-1];
        
        if ( ! isset($this->_tables[$matchedComponent])) {
            $this->_tables[$matchedComponent] = Doctrine_Core::getTable($matchedComponent);
        }
        
        return $matchedComponent;
    }
}