<?php
/*
 *  $Id: UnitOfWork.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Connection_UnitOfWork
 *
 * Note: This class does not have the semantics of a real "Unit of Work" in 0.10/1.0.
 * Database operations are not queued. All changes to objects are immediately written
 * to the database. You can think of it as a unit of work in auto-flush mode.
 *
 * Referential integrity is currently not always ensured.
 *
 * @package     Doctrine
 * @subpackage  Connection
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Roman Borschel <roman@code-factory.org>
 */
class Doctrine_Connection_UnitOfWork extends Doctrine_Connection_Module
{
    /**
     * Saves the given record and all associated records.
     * (The save() operation is always cascaded in 0.10/1.0).
     *
     * @param Doctrine_Record $record
     * @return void
     */
    public function saveGraph(Doctrine_Record $record, $replace = false)
    {
        $record->assignInheritanceValues();

        $conn = $this->getConnection();
        $conn->connect();

        $state = $record->state();
        if ($state === Doctrine_Record::STATE_LOCKED || $state === Doctrine_Record::STATE_TLOCKED) {
            return false;
        }

        $record->state($record->exists() ? Doctrine_Record::STATE_LOCKED : Doctrine_Record::STATE_TLOCKED);

        try {
            $conn->beginInternalTransaction();
            $record->state($state);

            $event = $record->invokeSaveHooks('pre', 'save');
            $state = $record->state();

            $isValid = true;

            if ( ! $event->skipOperation) {
                $this->saveRelatedLocalKeys($record);

                switch ($state) {
                    case Doctrine_Record::STATE_TDIRTY:
                    case Doctrine_Record::STATE_TCLEAN:
                        if ($replace) {
                            $isValid = $this->replace($record);
                        } else {
                            $isValid = $this->insert($record);
                        }
                        break;
                    case Doctrine_Record::STATE_DIRTY:
                    case Doctrine_Record::STATE_PROXY:
                        if ($replace) {
                            $isValid = $this->replace($record);
                        } else {
                            $isValid = $this->update($record);
                        }
                        break;
                    case Doctrine_Record::STATE_CLEAN:
                        // do nothing
                        break;
                }

                if ($isValid) {
                    // NOTE: what about referential integrity issues?
                    foreach ($record->getPendingDeletes() as $pendingDelete) {
                        $pendingDelete->delete();
                    }
                
                    foreach ($record->getPendingUnlinks() as $alias => $ids) {
                        if ($ids === false) {
                            $record->unlinkInDb($alias, array());
                        } else if ($ids) {
                            $record->unlinkInDb($alias, array_keys($ids));
                        }
                    }
                    $record->resetPendingUnlinks();

                    $record->invokeSaveHooks('post', 'save', $event);
                } else {
                    $conn->transaction->addInvalid($record);
                }

                $state = $record->state();

                $record->state($record->exists() ? Doctrine_Record::STATE_LOCKED : Doctrine_Record::STATE_TLOCKED);

                if ($isValid) {
                    $saveLater = $this->saveRelatedForeignKeys($record);
                    foreach ($saveLater as $fk) {
                        $alias = $fk->getAlias();

                        if ($record->hasReference($alias)) {
                            $obj = $record->$alias;

                            // check that the related object is not an instance of Doctrine_Null
                            if ($obj && ! ($obj instanceof Doctrine_Null)) {
                                $obj->save($conn);
                            }
                        }
                    }

                    // save the MANY-TO-MANY associations
                    $this->saveAssociations($record);
                }
            }

            $record->state($state);

            $conn->commit();
        } catch (Exception $e) {
            // Make sure we roll back our internal transaction
            //$record->state($state);
            $conn->rollback();
            throw $e;
        }

        $record->clearInvokedSaveHooks();

        return true;
    }

    /**
     * Deletes the given record and all the related records that participate
     * in an application-level delete cascade.
     *
     * this event can be listened by the onPreDelete and onDelete listeners
     *
     * @return boolean      true on success, false on failure
     */
    public function delete(Doctrine_Record $record)
    {
        $deletions = array();
        $this->_collectDeletions($record, $deletions);
        return $this->_executeDeletions($deletions);
    }

    /**
     * Collects all records that need to be deleted by applying defined
     * application-level delete cascades.
     *
     * @param array $deletions  Map of the records to delete. Keys=Oids Values=Records.
     */
    private function _collectDeletions(Doctrine_Record $record, array &$deletions)
    {
        if ( ! $record->exists()) {
            return;
        }

        $deletions[$record->getOid()] = $record;
        $this->_cascadeDelete($record, $deletions);
    }

    /**
     * Executes the deletions for all collected records during a delete operation
     * (usually triggered through $record->delete()).
     *
     * @param array $deletions  Map of the records to delete. Keys=Oids Values=Records.
     */
    private function _executeDeletions(array $deletions)
    {
        // collect class names
        $classNames = array();
        foreach ($deletions as $record) {
            $classNames[] = $record->getTable()->getComponentName();
        }
        $classNames = array_unique($classNames);

        // order deletes
        $executionOrder = $this->buildFlushTree($classNames);

        // execute
        try {
            $this->conn->beginInternalTransaction();

            for ($i = count($executionOrder) - 1; $i >= 0; $i--) {
                $className = $executionOrder[$i];
                $table = $this->conn->getTable($className);

                // collect identifiers
                $identifierMaps = array();
                $deletedRecords = array();
                foreach ($deletions as $oid => $record) {
                    if ($record->getTable()->getComponentName() == $className) {
                        $veto = $this->_preDelete($record);
                        if ( ! $veto) {
                            $identifierMaps[] = $record->identifier();
                            $deletedRecords[] = $record;
                            unset($deletions[$oid]);
                        }
                    }
                }

                if (count($deletedRecords) < 1) {
                    continue;
                }

                // extract query parameters (only the identifier values are of interest)
                $params = array();
                $columnNames = array();
                foreach ($identifierMaps as $idMap) {
                    while (list($fieldName, $value) = each($idMap)) {
                        $params[] = $value;
                        $columnNames[] = $table->getColumnName($fieldName);
                    }
                }
                $columnNames = array_unique($columnNames);

                // delete
                $tableName = $table->getTableName();
                $sql = "DELETE FROM " . $this->conn->quoteIdentifier($tableName) . " WHERE ";

                if ($table->isIdentifierComposite()) {
                    $sql .= $this->_buildSqlCompositeKeyCondition($columnNames, count($identifierMaps));
                    $this->conn->exec($sql, $params);
                } else {
                    $sql .= $this->_buildSqlSingleKeyCondition($columnNames, count($params));
                    $this->conn->exec($sql, $params);
                }

                // adjust state, remove from identity map and inform postDelete listeners
                foreach ($deletedRecords as $record) {
                    // currently just for bc!
                    $this->_deleteCTIParents($table, $record);
                    //--
                    $record->state(Doctrine_Record::STATE_TCLEAN);
                    $record->getTable()->removeRecord($record);
                    $this->_postDelete($record);
                }
            }

            // trigger postDelete for records skipped during the deletion (veto!)
            foreach ($deletions as $skippedRecord) {
                $this->_postDelete($skippedRecord);
            }

            $this->conn->commit();

            return true;
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    /**
     * Builds the SQL condition to target multiple records who have a single-column
     * primary key.
     *
     * @param Doctrine_Table $table  The table from which the records are going to be deleted.
     * @param integer $numRecords  The number of records that are going to be deleted.
     * @return string  The SQL condition "pk = ? OR pk = ? OR pk = ? ..."
     */
    private function _buildSqlSingleKeyCondition($columnNames, $numRecords)
    {
        $idColumn = $this->conn->quoteIdentifier($columnNames[0]);
        return implode(' OR ', array_fill(0, $numRecords, "$idColumn = ?"));
    }

    /**
     * Builds the SQL condition to target multiple records who have a composite primary key.
     *
     * @param Doctrine_Table $table  The table from which the records are going to be deleted.
     * @param integer $numRecords  The number of records that are going to be deleted.
     * @return string  The SQL condition "(pk1 = ? AND pk2 = ?) OR (pk1 = ? AND pk2 = ?) ..."
     */
    private function _buildSqlCompositeKeyCondition($columnNames, $numRecords)
    {
        $singleCondition = "";
        foreach ($columnNames as $columnName) {
            $columnName = $this->conn->quoteIdentifier($columnName);
            if ($singleCondition === "") {
                $singleCondition .= "($columnName = ?";
            } else {
                $singleCondition .= " AND $columnName = ?";
            }
        }
        $singleCondition .= ")";
        $fullCondition = implode(' OR ', array_fill(0, $numRecords, $singleCondition));

        return $fullCondition;
    }

    /**
     * Cascades an ongoing delete operation to related objects. Applies only on relations
     * that have 'delete' in their cascade options.
     * This is an application-level cascade. Related objects that participate in the
     * cascade and are not yet loaded are fetched from the database.
     * Exception: many-valued relations are always (re-)fetched from the database to
     * make sure we have all of them.
     *
     * @param Doctrine_Record  The record for which the delete operation will be cascaded.
     * @throws PDOException    If something went wrong at database level
     * @return void
     */
     protected function _cascadeDelete(Doctrine_Record $record, array &$deletions)
     {
         foreach ($record->getTable()->getRelations() as $relation) {
             if ($relation->isCascadeDelete()) {
                 $fieldName = $relation->getAlias();
                 // if it's a xToOne relation and the related object is already loaded
                 // we don't need to refresh.
                 if ( ! ($relation->getType() == Doctrine_Relation::ONE && isset($record->$fieldName))) {
                     $record->refreshRelated($relation->getAlias());
                 }
                 $relatedObjects = $record->get($relation->getAlias());
                 if ($relatedObjects instanceof Doctrine_Record && $relatedObjects->exists()
                        && ! isset($deletions[$relatedObjects->getOid()])) {
                     $this->_collectDeletions($relatedObjects, $deletions);
                 } else if ($relatedObjects instanceof Doctrine_Collection && count($relatedObjects) > 0) {
                     // cascade the delete to the other objects
                     foreach ($relatedObjects as $object) {
                         if ( ! isset($deletions[$object->getOid()])) {
                             $this->_collectDeletions($object, $deletions);
                         }
                     }
                 }
             }
         }
     }

    /**
     * saveRelatedForeignKeys
     * saves all related (through ForeignKey) records to $record
     *
     * @throws PDOException         if something went wrong at database level
     * @param Doctrine_Record $record
     */
    public function saveRelatedForeignKeys(Doctrine_Record $record)
    {
        $saveLater = array();
        foreach ($record->getReferences() as $k => $v) {
            $rel = $record->getTable()->getRelation($k);
            if ($rel instanceof Doctrine_Relation_ForeignKey) {
                $saveLater[$k] = $rel;
            }
        }

        return $saveLater;
    }
    
    /**
     * saveRelatedLocalKeys
     * saves all related (through LocalKey) records to $record
     *
     * @throws PDOException         if something went wrong at database level
     * @param Doctrine_Record $record
     */
    public function saveRelatedLocalKeys(Doctrine_Record $record)
    {
        $state = $record->state();
        $record->state($record->exists() ? Doctrine_Record::STATE_LOCKED : Doctrine_Record::STATE_TLOCKED);

        foreach ($record->getReferences() as $k => $v) {
            $rel = $record->getTable()->getRelation($k);
            
            $local = $rel->getLocal();
            $foreign = $rel->getForeign();

            if ($rel instanceof Doctrine_Relation_LocalKey) {
                // ONE-TO-ONE relationship
                $obj = $record->get($rel->getAlias());

                // Protection against infinite function recursion before attempting to save
                if ($obj instanceof Doctrine_Record && $obj->isModified()) {
                    $obj->save($this->conn);

                    $id = array_values($obj->identifier());

                    if ( ! empty($id)) {
                        foreach ((array) $rel->getLocal() as $k => $columnName) {
                            $field = $record->getTable()->getFieldName($columnName);
                            
                            if (isset($id[$k]) && $id[$k] && $record->getTable()->hasField($field)) {
                                $record->set($field, $id[$k]);
                            }
                        }
                    }
                }
            }
        }
        $record->state($state);
    }

    /**
     * saveAssociations
     *
     * this method takes a diff of one-to-many / many-to-many original and
     * current collections and applies the changes
     *
     * for example if original many-to-many related collection has records with
     * primary keys 1,2 and 3 and the new collection has records with primary keys
     * 3, 4 and 5, this method would first destroy the associations to 1 and 2 and then
     * save new associations to 4 and 5
     *
     * @throws Doctrine_Connection_Exception         if something went wrong at database level
     * @param Doctrine_Record $record
     * @return void
     */
    public function saveAssociations(Doctrine_Record $record)
    {
        foreach ($record->getReferences() as $k => $v) {
            $rel = $record->getTable()->getRelation($k);

            if ($rel instanceof Doctrine_Relation_Association) {
                if ($this->conn->getAttribute(Doctrine_Core::ATTR_CASCADE_SAVES) || $v->isModified()) {
                    $v->save($this->conn, false);
                }

                $assocTable = $rel->getAssociationTable();
                foreach ($v->getDeleteDiff() as $r) {
                    $query = 'DELETE FROM ' . $assocTable->getTableName()
                           . ' WHERE ' . $rel->getForeignRefColumnName() . ' = ?'
                           . ' AND ' . $rel->getLocalRefColumnName() . ' = ?';

                    $this->conn->execute($query, array($r->getIncremented(), $record->getIncremented()));
                }

                foreach ($v->getInsertDiff() as $r) {
                    $assocRecord = $assocTable->create();
                    $assocRecord->set($assocTable->getFieldName($rel->getForeign()), $r);
                    $assocRecord->set($assocTable->getFieldName($rel->getLocal()), $record);
                    $this->saveGraph($assocRecord);
                }
                // take snapshot of collection state, so that we know when its modified again
                $v->takeSnapshot();
            }
        }
    }

    /**
     * Invokes preDelete event listeners.
     *
     * @return boolean  Whether a listener has used it's veto (don't delete!).
     */
    private function _preDelete(Doctrine_Record $record)
    {
        $event = new Doctrine_Event($record, Doctrine_Event::RECORD_DELETE);
        $record->preDelete($event);
        $record->getTable()->getRecordListener()->preDelete($event);

        return $event->skipOperation;
    }

    /**
     * Invokes postDelete event listeners.
     */
    private function _postDelete(Doctrine_Record $record)
    {
        $event = new Doctrine_Event($record, Doctrine_Event::RECORD_DELETE);
        $record->postDelete($event);
        $record->getTable()->getRecordListener()->postDelete($event);
    }

    /**
     * saveAll
     * persists all the pending records from all tables
     *
     * @throws PDOException         if something went wrong at database level
     * @return void
     */
    public function saveAll()
    {
        // get the flush tree
        $tree = $this->buildFlushTree($this->conn->getTables());

        // save all records
        foreach ($tree as $name) {
            $table = $this->conn->getTable($name);
            foreach ($table->getRepository() as $record) {
                $this->saveGraph($record);
            }
        }
    }

    /**
     * updates given record
     *
     * @param Doctrine_Record $record   record to be updated
     * @return boolean                  whether or not the update was successful
     */
    public function update(Doctrine_Record $record)
    {
        $event = $record->invokeSaveHooks('pre', 'update');;

        if ($record->isValid(false, false)) {
            $table = $record->getTable();
            if ( ! $event->skipOperation) {
                $identifier = $record->identifier();
                if ($table->getOption('joinedParents')) {
                    // currrently just for bc!
                    $this->_updateCTIRecord($table, $record);
                    //--
                } else {
                    $array = $record->getPrepared();
                    $this->conn->update($table, $array, $identifier);
                }
                $record->assignIdentifier(true);
            }

            $record->invokeSaveHooks('post', 'update', $event);

            return true;
        }

        return false;
    }

    /**
     * Inserts a record into database.
     *
     * This method inserts a transient record in the database, and adds it
     * to the identity map of its correspondent table. It proxies to @see 
     * processSingleInsert(), trigger insert hooks and validation of data
     * if required.
     *
     * @param Doctrine_Record $record   
     * @return boolean                  false if record is not valid
     */
    public function insert(Doctrine_Record $record)
    {
        $event = $record->invokeSaveHooks('pre', 'insert');

        if ($record->isValid(false, false)) {
            $table = $record->getTable();

            if ( ! $event->skipOperation) {
                if ($table->getOption('joinedParents')) {
                    // just for bc!
                    $this->_insertCTIRecord($table, $record);
                    //--
                } else {
                    $this->processSingleInsert($record);
                }
            }

            $table->addRecord($record);
            $record->invokeSaveHooks('post', 'insert', $event);

            return true;
        }

        return false;
    }

    /**
     * Replaces a record into database.
     *
     * @param Doctrine_Record $record   
     * @return boolean                  false if record is not valid
     */
    public function replace(Doctrine_Record $record)
    {
        if ($record->exists()) {
            return $this->update($record);
        } else {
            if ($record->isValid()) {
                $this->_assignSequence($record);

                $saveEvent = $record->invokeSaveHooks('pre', 'save');
                $insertEvent = $record->invokeSaveHooks('pre', 'insert');

                $table = $record->getTable();
                $identifier = (array) $table->getIdentifier();
                $data = $record->getPrepared();                
                $result = $this->conn->replace($table, $data, $identifier);

                $record->invokeSaveHooks('post', 'insert', $insertEvent);
                $record->invokeSaveHooks('post', 'save', $saveEvent);

                $this->_assignIdentifier($record);

                return true;
            } else {
                return false;
            }
        }
    }

    /**
     * Inserts a transient record in its table.
     *
     * This method inserts the data of a single record in its assigned table, 
     * assigning to it the autoincrement primary key (if any is defined).
     * 
     * @param Doctrine_Record $record
     * @return void
     */
    public function processSingleInsert(Doctrine_Record $record)
    {
        $fields = $record->getPrepared();
        $table = $record->getTable();

        // Populate fields with a blank array so that a blank records can be inserted
        if (empty($fields)) {
            foreach ($table->getFieldNames() as $field) {
                $fields[$field] = null;
            }
        }

        $this->_assignSequence($record, $fields);
        $this->conn->insert($table, $fields);
        $this->_assignIdentifier($record);
    }

    /**
     * buildFlushTree
     * builds a flush tree that is used in transactions
     *
     * The returned array has all the initialized components in
     * 'correct' order. Basically this means that the records of those
     * components can be saved safely in the order specified by the returned array.
     *
     * @param array $tables     an array of Doctrine_Table objects or component names
     * @return array            an array of component names in flushing order
     */
    public function buildFlushTree(array $tables)
    {
        // determine classes to order. only necessary because the $tables param
        // can contain strings or table objects...
        $classesToOrder = array();
        foreach ($tables as $table) {
            if ( ! ($table instanceof Doctrine_Table)) {
                $table = $this->conn->getTable($table, false);
            }
            $classesToOrder[] = $table->getComponentName();
        }
        $classesToOrder = array_unique($classesToOrder);

        if (count($classesToOrder) < 2) {
            return $classesToOrder;
        }

        // build the correct order
        $flushList = array();
        foreach ($classesToOrder as $class) {
            $table = $this->conn->getTable($class, false);
            $currentClass = $table->getComponentName();

            $index = array_search($currentClass, $flushList);

            if ($index === false) {
                //echo "adding $currentClass to flushlist";
                $flushList[] = $currentClass;
                $index = max(array_keys($flushList));
            }

            $rels = $table->getRelations();

            // move all foreignkey relations to the beginning
            foreach ($rels as $key => $rel) {
                if ($rel instanceof Doctrine_Relation_ForeignKey) {
                    unset($rels[$key]);
                    array_unshift($rels, $rel);
                }
            }

            foreach ($rels as $rel) {
                $relatedClassName = $rel->getTable()->getComponentName();

                if ( ! in_array($relatedClassName, $classesToOrder)) {
                    continue;
                }

                $relatedCompIndex = array_search($relatedClassName, $flushList);
                $type = $rel->getType();

                // skip self-referenced relations
                if ($relatedClassName === $currentClass) {
                    continue;
                }

                if ($rel instanceof Doctrine_Relation_ForeignKey) {
                    // the related component needs to come after this component in
                    // the list (since it holds the fk)

                    if ($relatedCompIndex !== false) {
                        // the component is already in the list
                        if ($relatedCompIndex >= $index) {
                            // it's already in the right place
                            continue;
                        }

                        unset($flushList[$index]);
                        // the related comp has the fk. so put "this" comp immediately
                        // before it in the list
                        array_splice($flushList, $relatedCompIndex, 0, $currentClass);
                        $index = $relatedCompIndex;
                    } else {
                        $flushList[] = $relatedClassName;
                    }

                } else if ($rel instanceof Doctrine_Relation_LocalKey) {
                    // the related component needs to come before the current component
                    // in the list (since this component holds the fk).

                    if ($relatedCompIndex !== false) {
                        // already in flush list
                        if ($relatedCompIndex <= $index) {
                            // it's in the right place
                            continue;
                        }

                        unset($flushList[$relatedCompIndex]);
                        // "this" comp has the fk. so put the related comp before it
                        // in the list
                        array_splice($flushList, $index, 0, $relatedClassName);
                    } else {
                        array_unshift($flushList, $relatedClassName);
                        $index++;
                    }
                } else if ($rel instanceof Doctrine_Relation_Association) {
                    // the association class needs to come after both classes
                    // that are connected through it in the list (since it holds
                    // both fks)

                    $assocTable = $rel->getAssociationFactory();
                    $assocClassName = $assocTable->getComponentName();

                    if ($relatedCompIndex !== false) {
                        unset($flushList[$relatedCompIndex]);
                    }

                    array_splice($flushList, $index, 0, $relatedClassName);
                    $index++;

                    $index3 = array_search($assocClassName, $flushList);

                    if ($index3 !== false) {
                        if ($index3 >= $index) {
                            continue;
                        }

                        unset($flushList[$index3]);
                        array_splice($flushList, $index - 1, 0, $assocClassName);
                        $index = $relatedCompIndex;
                    } else {
                        $flushList[] = $assocClassName;
                    }
                }
            }
        }

        return array_values($flushList);
    }


    /* The following is all the Class Table Inheritance specific code. Support dropped
       for 0.10/1.0. */

    /**
     * Class Table Inheritance code.
     * Support dropped for 0.10/1.0.
     *
     * Note: This is flawed. We also need to delete from subclass tables.
     */
    private function _deleteCTIParents(Doctrine_Table $table, $record)
    {
        if ($table->getOption('joinedParents')) {
            foreach (array_reverse($table->getOption('joinedParents')) as $parent) {
                $parentTable = $table->getConnection()->getTable($parent);
                $this->conn->delete($parentTable, $record->identifier());
            }
        }
    }

    /**
     * Class Table Inheritance code.
     * Support dropped for 0.10/1.0.
     */
    private function _insertCTIRecord(Doctrine_Table $table, Doctrine_Record $record)
    {
        $dataSet = $this->_formatDataSet($record);
        $component = $table->getComponentName();

        $classes = $table->getOption('joinedParents');
        $classes[] = $component;

        foreach ($classes as $k => $parent) {
            if ($k === 0) {
                $rootRecord = new $parent();
                $rootRecord->merge($dataSet[$parent]);
                $this->processSingleInsert($rootRecord);
                $record->assignIdentifier($rootRecord->identifier());
            } else {
                foreach ((array) $rootRecord->identifier() as $id => $value) {
                    $dataSet[$parent][$id] = $value;
                }

                $this->conn->insert($this->conn->getTable($parent), $dataSet[$parent]);
            }
        }
    }

    /**
     * Class Table Inheritance code.
     * Support dropped for 0.10/1.0.
     */
    private function _updateCTIRecord(Doctrine_Table $table, Doctrine_Record $record)
    {
        $identifier = $record->identifier();
        $dataSet = $this->_formatDataSet($record);

        $component = $table->getComponentName();

        $classes = $table->getOption('joinedParents');
        $classes[] = $component;

        foreach ($record as $field => $value) {
            if ($value instanceof Doctrine_Record) {
                if ( ! $value->exists()) {
                    $value->save();
                }
                $record->set($field, $value->getIncremented());
            }
        }

        foreach ($classes as $class) {
            $parentTable = $this->conn->getTable($class);

            if ( ! array_key_exists($class, $dataSet)) {
                continue;
            }

            $this->conn->update($this->conn->getTable($class), $dataSet[$class], $identifier);
        }
    }

    /**
     * Class Table Inheritance code.
     * Support dropped for 0.10/1.0.
     */
    private function _formatDataSet(Doctrine_Record $record)
    {
        $table = $record->getTable();
        $dataSet = array();
        $component = $table->getComponentName();
        $array = $record->getPrepared();

        foreach ($table->getColumns() as $columnName => $definition) {
            if ( ! isset($dataSet[$component])) {
                $dataSet[$component] = array();
            }

            if ( isset($definition['owner']) && ! isset($dataSet[$definition['owner']])) {
                $dataSet[$definition['owner']] = array();
            }

            $fieldName = $table->getFieldName($columnName);
            if (isset($definition['primary']) && $definition['primary']) {
                continue;
            }

            if ( ! array_key_exists($fieldName, $array)) {
                continue;
            }

            if (isset($definition['owner'])) {
                $dataSet[$definition['owner']][$fieldName] = $array[$fieldName];
            } else {
                $dataSet[$component][$fieldName] = $array[$fieldName];
            }
        }

        return $dataSet;
    }

    protected function _assignSequence(Doctrine_Record $record, &$fields = null)
    {
        $table = $record->getTable();
        $seq = $table->sequenceName;

        if ( ! empty($seq)) {
            $id = $this->conn->sequence->nextId($seq);
            $seqName = $table->getIdentifier();
            if ($fields) {
                $fields[$seqName] = $id;
            }

            $record->assignIdentifier($id);

            return $id;
        }
    }

    protected function _assignIdentifier(Doctrine_Record $record)
    {
        $table = $record->getTable();
        $identifier = $table->getIdentifier();
        $seq = $table->sequenceName;

        if (empty($seq) && !is_array($identifier) &&
            $table->getIdentifierType() != Doctrine_Core::IDENTIFIER_NATURAL) {
            $id = false;
            if ($record->$identifier == null) { 
                if (($driver = strtolower($this->conn->getDriverName())) == 'pgsql') {
                    $seq = $table->getTableName() . '_' . $identifier;
                } elseif ($driver == 'oracle' || $driver == 'mssql') {
                    $seq = $table->getTableName();
                }
    
                $id = $this->conn->sequence->lastInsertId($seq);
            } else {
                $id = $record->$identifier;
            }

            if ( ! $id) {
                throw new Doctrine_Connection_Exception("Couldn't get last insert identifier.");
            }
            $record->assignIdentifier($id);
        } else {
            $record->assignIdentifier(true);
        }
    }
}