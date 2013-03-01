<?php
/*
 *    $Id: NestedSet.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Node_NestedSet
 *
 * @package    Doctrine
 * @subpackage Node
 * @license    http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link       www.doctrine-project.org
 * @since      1.0
 * @version    $Revision: 7490 $
 * @author     Joe Simms <joe.simms@websites4.com>
 * @author     Roman Borschel <roman@code-factory.org>     
 */
class Doctrine_Node_NestedSet extends Doctrine_Node implements Doctrine_Node_Interface
{
    /**
     * test if node has previous sibling
     *
     * @return bool            
     */
    public function hasPrevSibling()
    {
        return $this->isValidNode($this->getPrevSibling());        
    }

    /**
     * test if node has next sibling
     *
     * @return bool            
     */ 
    public function hasNextSibling()
    {
        return $this->isValidNode($this->getNextSibling());        
    }

    /**
     * test if node has children
     *
     * @return bool            
     */
    public function hasChildren()
    {
        return (($this->getRightValue() - $this->getLeftValue()) > 1);        
    }

    /**
     * test if node has parent
     *
     * @return bool            
     */
    public function hasParent()
    {
        return $this->isValidNode($this->getRecord()) && ! $this->isRoot();
    }

    /**
     * gets record of prev sibling or empty record
     *
     * @return Doctrine_Record            
     */
    public function getPrevSibling()
    {
        $baseAlias = $this->_tree->getBaseAlias();
        $q = $this->_tree->getBaseQuery();
        $q = $q->addWhere("$baseAlias.rgt = ?", $this->getLeftValue() - 1);
        $q = $this->_tree->returnQueryWithRootId($q, $this->getRootValue());
        $result = $q->execute();

        if (count($result) <= 0) {
            return false;
        }
        
        if ($result instanceof Doctrine_Collection) {
            $sibling = $result->getFirst();
        } else if (is_array($result)) {
            $sibling = array_shift($result);
        }
        
        return $sibling;
    }

    /**
     * gets record of next sibling or empty record
     *
     * @return Doctrine_Record            
     */
    public function getNextSibling()
    {
        $baseAlias = $this->_tree->getBaseAlias();
        $q = $this->_tree->getBaseQuery();
        $q = $q->addWhere("$baseAlias.lft = ?", $this->getRightValue() + 1);
        $q = $this->_tree->returnQueryWithRootId($q, $this->getRootValue());
        $result = $q->execute();

        if (count($result) <= 0) {
            return false;
        }
        
        if ($result instanceof Doctrine_Collection) {
            $sibling = $result->getFirst();
        } else if (is_array($result)) {
            $sibling = array_shift($result);
        }
        
        return $sibling;
    }

    /**
     * gets siblings for node
     *
     * @return array     array of sibling Doctrine_Record objects            
     */
    public function getSiblings($includeNode = false)
    {
        $parent = $this->getParent();
        $siblings = array();
        if ($parent && $parent->exists()) {
            foreach ($parent->getNode()->getChildren() as $child) {
                if ($this->isEqualTo($child) && !$includeNode) {
                    continue;
                }
                $siblings[] = $child;
            }        
        }
        return $siblings;
    }

    /**
     * gets record of first child or empty record
     *
     * @return Doctrine_Record            
     */
    public function getFirstChild()
    {
        $baseAlias = $this->_tree->getBaseAlias();
        $q = $this->_tree->getBaseQuery();
        $q->addWhere("$baseAlias.lft = ?", $this->getLeftValue() + 1);
        $this->_tree->returnQueryWithRootId($q, $this->getRootValue());
        $result = $q->execute();

        if (count($result) <= 0) {
            return false;
        }
        
        if ($result instanceof Doctrine_Collection) {
            $child = $result->getFirst();
        } else if (is_array($result)) {
            $child = array_shift($result);
        }
        
        return $child;       
    }

    /**
     * gets record of last child or empty record
     *
     * @return Doctrine_Record            
     */
    public function getLastChild()
    {
        $baseAlias = $this->_tree->getBaseAlias();
        $q = $this->_tree->getBaseQuery();
        $q->addWhere("$baseAlias.rgt = ?", $this->getRightValue() - 1);
        $this->_tree->returnQueryWithRootId($q, $this->getRootValue());
        $result = $q->execute();

        if (count($result) <= 0) {
            return false;
        }
        
        if ($result instanceof Doctrine_Collection) {
            $child = $result->getFirst();
        } else if (is_array($result)) {
            $child = array_shift($result);
        }
        
        return $child;      
    }

    /**
     * gets children for node (direct descendants only)
     *
     * @return mixed  The children of the node or FALSE if the node has no children.               
     */
    public function getChildren()
    { 
        return $this->getDescendants(1);
    }

    /**
     * gets descendants for node (direct descendants only)
     *
     * @return mixed  The descendants of the node or FALSE if the node has no descendants.
     */
    public function getDescendants($depth = null, $includeNode = false)
    {
        $baseAlias = $this->_tree->getBaseAlias();
        $q = $this->_tree->getBaseQuery();
        $params = array($this->record->get('lft'), $this->record->get('rgt'));
        
        if ($includeNode) {
            $q->addWhere("$baseAlias.lft >= ? AND $baseAlias.rgt <= ?", $params)->addOrderBy("$baseAlias.lft asc");
        } else {
            $q->addWhere("$baseAlias.lft > ? AND $baseAlias.rgt < ?", $params)->addOrderBy("$baseAlias.lft asc");
        }
        
        if ($depth !== null) {
            $q->addWhere("$baseAlias.level <= ?", $this->record['level'] + $depth);
        }
        
        $q = $this->_tree->returnQueryWithRootId($q, $this->getRootValue());
        $result = $q->execute();

        if (count($result) <= 0) {
            return false;
        }

        return $result;
    }

    /**
     * gets record of parent or empty record
     *
     * @return Doctrine_Record            
     */
    public function getParent()
    {
        $baseAlias = $this->_tree->getBaseAlias();
        $q = $this->_tree->getBaseQuery();
        $q->addWhere("$baseAlias.lft < ? AND $baseAlias.rgt > ?", array($this->getLeftValue(), $this->getRightValue()))
          ->addWhere("$baseAlias.level >= ?", $this->record['level'] - 1)
          ->addOrderBy("$baseAlias.rgt asc");
        $q = $this->_tree->returnQueryWithRootId($q, $this->getRootValue());
        $result = $q->execute();
        
        if (count($result) <= 0) {
            return false;
        }
               
        if ($result instanceof Doctrine_Collection) {
            $parent = $result->getFirst();
        } else if (is_array($result)) {
            $parent = array_shift($result);
        }
        
        return $parent;
    }

    /**
     * gets ancestors for node
     *
     * @param integer $deth  The depth 'upstairs'.
     * @return mixed  The ancestors of the node or FALSE if the node has no ancestors (this 
     *                basically means it's a root node).                
     */
    public function getAncestors($depth = null)
    {
        $baseAlias = $this->_tree->getBaseAlias();
        $q = $this->_tree->getBaseQuery();
        $q->addWhere("$baseAlias.lft < ? AND $baseAlias.rgt > ?", array($this->getLeftValue(), $this->getRightValue()))
                ->addOrderBy("$baseAlias.lft asc");
        if ($depth !== null) {
            $q->addWhere("$baseAlias.level >= ?", $this->record['level'] - $depth);
        }
        $q = $this->_tree->returnQueryWithRootId($q, $this->getRootValue());
        $ancestors = $q->execute();
        if (count($ancestors) <= 0) {
            return false;
        }
        return $ancestors;
    }

    /**
     * gets path to node from root, uses record::toString() method to get node names
     *
     * @param string     $seperator     path seperator
     * @param bool     $includeNode     whether or not to include node at end of path
     * @return string     string representation of path                
     */     
    public function getPath($seperator = ' > ', $includeRecord = false)
    {
        $path = array();
        $ancestors = $this->getAncestors();
        if ($ancestors) {
            foreach ($ancestors as $ancestor) {
                $path[] = $ancestor->__toString();
            }
        }
        if ($includeRecord) {
            $path[] = $this->getRecord()->__toString();
        }
            
        return implode($seperator, $path);
    }

    /**
     * gets number of children (direct descendants)
     *
     * @return int            
     */     
    public function getNumberChildren()
    {
        $children = $this->getChildren();
        return $children === false ? 0 : count($children);
    }

    /**
     * gets number of descendants (children and their children)
     *
     * @return int            
     */
    public function getNumberDescendants()
    {
        return ($this->getRightValue() - $this->getLeftValue() - 1) / 2;
    }

    /**
     * inserts node as parent of dest record
     *
     * @return bool
     * @todo Wrap in transaction          
     */
    public function insertAsParentOf(Doctrine_Record $dest)
    {
        // cannot insert a node that has already has a place within the tree
        if ($this->isValidNode()) {
            return false;
        }
        // cannot insert as parent of root
        if ($dest->getNode()->isRoot()) {
            return false;
        }
        
        // cannot insert as parent of itself
        if (
		    $dest === $this->record ||
			($dest->exists() && $this->record->exists() && $dest->identifier() === $this->record->identifier())
		) {
            throw new Doctrine_Tree_Exception("Cannot insert node as parent of itself");

            return false;
        }

        $newLeft  = $dest->getNode()->getLeftValue();
        $newRight = $dest->getNode()->getRightValue() + 2;
        $newRoot  = $dest->getNode()->getRootValue();
		$newLevel = $dest->getNode()->getLevel();
		
		$conn = $this->record->getTable()->getConnection();
		try {
		    $conn->beginInternalTransaction();
		    
		    // Make space for new node
            $this->shiftRLValues($dest->getNode()->getRightValue() + 1, 2, $newRoot);

            // Slide child nodes over one and down one to allow new parent to wrap them
    		$componentName = $this->_tree->getBaseComponent();		
            $q = Doctrine_Core::getTable($componentName)
                ->createQuery()
                ->update();
            $q->set("$componentName.lft", "$componentName.lft + 1");
            $q->set("$componentName.rgt", "$componentName.rgt + 1");
            $q->set("$componentName.level", "$componentName.level + 1");
            $q->where("$componentName.lft >= ? AND $componentName.rgt <= ?", array($newLeft, $newRight));
    		$q = $this->_tree->returnQueryWithRootId($q, $newRoot);
    		$q->execute();

            $this->record['level'] = $newLevel;
    		$this->insertNode($newLeft, $newRight, $newRoot);
    		
    		$conn->commit();
		} catch (Exception $e) {
		    $conn->rollback();
		    throw $e;
		}
        
        return true;
    }

    /**
     * inserts node as previous sibling of dest record
     *
     * @return bool
     * @todo Wrap in transaction       
     */
    public function insertAsPrevSiblingOf(Doctrine_Record $dest)
    {
        // cannot insert a node that has already has a place within the tree
        if ($this->isValidNode()) {
            return false;
        }
        // cannot insert as sibling of itself
        if (
		    $dest === $this->record ||
			($dest->exists() && $this->record->exists() && $dest->identifier() === $this->record->identifier())
		) {
            throw new Doctrine_Tree_Exception("Cannot insert node as previous sibling of itself");

            return false;
        }

        $newLeft = $dest->getNode()->getLeftValue();
        $newRight = $dest->getNode()->getLeftValue() + 1;
        $newRoot = $dest->getNode()->getRootValue();
        
        $conn = $this->record->getTable()->getConnection();
        try {
            $conn->beginInternalTransaction();
            
            $this->shiftRLValues($newLeft, 2, $newRoot);
            $this->record['level'] = $dest['level'];
            $this->insertNode($newLeft, $newRight, $newRoot);
            // update destination left/right values to prevent a refresh
            // $dest->getNode()->setLeftValue($dest->getNode()->getLeftValue() + 2);
            // $dest->getNode()->setRightValue($dest->getNode()->getRightValue() + 2);
            
            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
                        
        return true;
    }

    /**
     * inserts node as next sibling of dest record
     *
     * @return bool
     * @todo Wrap in transaction           
     */    
    public function insertAsNextSiblingOf(Doctrine_Record $dest)
    {
        // cannot insert a node that has already has a place within the tree
        if ($this->isValidNode()) {
            return false;
        }
        // cannot insert as sibling of itself
        if (
		    $dest === $this->record ||
			($dest->exists() && $this->record->exists() && $dest->identifier() === $this->record->identifier())
		) {
            throw new Doctrine_Tree_Exception("Cannot insert node as next sibling of itself");

            return false;
        }

        $newLeft = $dest->getNode()->getRightValue() + 1;
        $newRight = $dest->getNode()->getRightValue() + 2;
        $newRoot = $dest->getNode()->getRootValue();

        $conn = $this->record->getTable()->getConnection();
        try {
            $conn->beginInternalTransaction();
            
            $this->shiftRLValues($newLeft, 2, $newRoot);
            $this->record['level'] = $dest['level'];
            $this->insertNode($newLeft, $newRight, $newRoot);
            // update destination left/right values to prevent a refresh
            // no need, node not affected
            
            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }

        return true;
    }

    /**
     * inserts node as first child of dest record
     *
     * @return bool
     * @todo Wrap in transaction         
     */
    public function insertAsFirstChildOf(Doctrine_Record $dest)
    {
        // cannot insert a node that has already has a place within the tree
        if ($this->isValidNode()) {
            return false;
        }
        // cannot insert as child of itself
        if (
		    $dest === $this->record ||
			($dest->exists() && $this->record->exists() && $dest->identifier() === $this->record->identifier())
		) {
            throw new Doctrine_Tree_Exception("Cannot insert node as first child of itself");

            return false;
        }

        $newLeft = $dest->getNode()->getLeftValue() + 1;
        $newRight = $dest->getNode()->getLeftValue() + 2;
        $newRoot = $dest->getNode()->getRootValue();

        $conn = $this->record->getTable()->getConnection();
        try {
            $conn->beginInternalTransaction();
            
            $this->shiftRLValues($newLeft, 2, $newRoot);
            $this->record['level'] = $dest['level'] + 1;
            $this->insertNode($newLeft, $newRight, $newRoot);
            
            // update destination left/right values to prevent a refresh
            // $dest->getNode()->setRightValue($dest->getNode()->getRightValue() + 2);
            
            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }

        return true;
    }

    /**
     * inserts node as last child of dest record
     *
     * @return bool
     * @todo Wrap in transaction            
     */
    public function insertAsLastChildOf(Doctrine_Record $dest)
    {
        // cannot insert a node that has already has a place within the tree
        if ($this->isValidNode()) {
            return false;
        }
        // cannot insert as child of itself
        if (
		    $dest === $this->record ||
			($dest->exists() && $this->record->exists() && $dest->identifier() === $this->record->identifier())
		) {
            throw new Doctrine_Tree_Exception("Cannot insert node as last child of itself");

            return false;
        }

        $newLeft = $dest->getNode()->getRightValue();
        $newRight = $dest->getNode()->getRightValue() + 1;
        $newRoot = $dest->getNode()->getRootValue();

        $conn = $this->record->getTable()->getConnection();
        try {
            $conn->beginInternalTransaction();
            
            $this->shiftRLValues($newLeft, 2, $newRoot);
            $this->record['level'] = $dest['level'] + 1;
            $this->insertNode($newLeft, $newRight, $newRoot);

            // update destination left/right values to prevent a refresh
            // $dest->getNode()->setRightValue($dest->getNode()->getRightValue() + 2);
            
            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
        
        return true;
    }

    /**
     * Accomplishes moving of nodes between different trees.
     * Used by the move* methods if the root values of the two nodes are different.
     *
     * @param Doctrine_Record $dest
     * @param unknown_type $newLeftValue
     * @param unknown_type $moveType
     * @todo Better exception handling/wrapping
     */
    private function _moveBetweenTrees(Doctrine_Record $dest, $newLeftValue, $moveType)
    {
        $conn = $this->record->getTable()->getConnection();
            
        try {
            $conn->beginInternalTransaction();

            // Move between trees: Detach from old tree & insert into new tree
            $newRoot = $dest->getNode()->getRootValue();
            $oldRoot = $this->getRootValue();
            $oldLft = $this->getLeftValue();
            $oldRgt = $this->getRightValue();
            $oldLevel = $this->record['level'];

            // Prepare target tree for insertion, make room
            $this->shiftRlValues($newLeftValue, $oldRgt - $oldLft - 1, $newRoot);

            // Set new root id for this node
            $this->setRootValue($newRoot);
            $this->record->save();

            // Insert this node as a new node
            $this->setRightValue(0);
            $this->setLeftValue(0);

            switch ($moveType) {
                case 'moveAsPrevSiblingOf':
                    $this->insertAsPrevSiblingOf($dest);
                break;
                case 'moveAsFirstChildOf':
                    $this->insertAsFirstChildOf($dest);
                break;
                case 'moveAsNextSiblingOf':
                    $this->insertAsNextSiblingOf($dest);
                break;
                case 'moveAsLastChildOf':
                    $this->insertAsLastChildOf($dest);
                break;
                default:
                    throw new Doctrine_Node_Exception("Unknown move operation: $moveType.");
            }

            $diff = $oldRgt - $oldLft;
            $this->setRightValue($this->getLeftValue() + ($oldRgt - $oldLft));
            $this->record->save();

            $newLevel = $this->record['level'];
            $levelDiff = $newLevel - $oldLevel;

            // Relocate descendants of the node
            $diff = $this->getLeftValue() - $oldLft;
            $componentName = $this->_tree->getBaseComponent();
            $rootColName = $this->_tree->getAttribute('rootColumnName');

            // Update lft/rgt/root/level for all descendants
            $q = Doctrine_Core::getTable($componentName)
                ->createQuery()
                ->update()
                ->set($componentName . '.lft', $componentName.'.lft + ?', $diff)
                ->set($componentName . '.rgt', $componentName.'.rgt + ?', $diff)
                ->set($componentName . '.level', $componentName.'.level + ?', $levelDiff)
                ->set($componentName . '.' . $rootColName, '?', $newRoot)
                ->where($componentName . '.lft > ? AND ' . $componentName . '.rgt < ?', array($oldLft, $oldRgt));
            $q = $this->_tree->returnQueryWithRootId($q, $oldRoot);
            $q->execute();

            // Close gap in old tree
            $first = $oldRgt + 1;
            $delta = $oldLft - $oldRgt - 1;
            $this->shiftRLValues($first, $delta, $oldRoot);

            $conn->commit();
     
	        return true;
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
        
        return false;
    }

    /**
     * moves node as prev sibling of dest record
     * 
     */     
    public function moveAsPrevSiblingOf(Doctrine_Record $dest)
    {
        if (
		    $dest === $this->record ||
			($dest->exists() && $this->record->exists() && $dest->identifier() === $this->record->identifier())
		) {
            throw new Doctrine_Tree_Exception("Cannot move node as previous sibling of itself");

			return false;
		}

        if ($dest->getNode()->getRootValue() != $this->getRootValue()) {
            // Move between trees
            return $this->_moveBetweenTrees($dest, $dest->getNode()->getLeftValue(), __FUNCTION__);
        } else {
            // Move within the tree
            $oldLevel = $this->record['level'];
            $this->record['level'] = $dest['level'];
            $this->updateNode($dest->getNode()->getLeftValue(), $this->record['level'] - $oldLevel);
        }
        
        return true;
    }

    /**
     * moves node as next sibling of dest record
     *        
     */
    public function moveAsNextSiblingOf(Doctrine_Record $dest)
    {
        if (
		    $dest === $this->record ||
			($dest->exists() && $this->record->exists() && $dest->identifier() === $this->record->identifier())
		) {
            throw new Doctrine_Tree_Exception("Cannot move node as next sibling of itself");
            
            return false;
        }

        if ($dest->getNode()->getRootValue() != $this->getRootValue()) {
            // Move between trees
            return $this->_moveBetweenTrees($dest, $dest->getNode()->getRightValue() + 1, __FUNCTION__);
        } else {
            // Move within tree
            $oldLevel = $this->record['level'];
            $this->record['level'] = $dest['level'];
            $this->updateNode($dest->getNode()->getRightValue() + 1, $this->record['level'] - $oldLevel);
        }
        
        return true;
    }

    /**
     * moves node as first child of dest record
     *            
     */
    public function moveAsFirstChildOf(Doctrine_Record $dest)
    {
        if (
		    $dest === $this->record || $this->isAncestorOf($dest) ||
			($dest->exists() && $this->record->exists() && $dest->identifier() === $this->record->identifier())
		) {
            throw new Doctrine_Tree_Exception("Cannot move node as first child of itself or into a descendant");

			return false;
		}

		if ($dest->getNode()->getRootValue() != $this->getRootValue()) {
            // Move between trees
            return $this->_moveBetweenTrees($dest, $dest->getNode()->getLeftValue() + 1, __FUNCTION__);
        } else {
            // Move within tree
            $oldLevel = $this->record['level'];
            $this->record['level'] = $dest['level'] + 1;
            $this->updateNode($dest->getNode()->getLeftValue() + 1, $this->record['level'] - $oldLevel);
        }

        return true;
    }

    /**
     * moves node as last child of dest record
     *        
     */
    public function moveAsLastChildOf(Doctrine_Record $dest)
    {
        if (
		    $dest === $this->record || $this->isAncestorOf($dest) ||
			($dest->exists() && $this->record->exists() && $dest->identifier() === $this->record->identifier())
		) {
            throw new Doctrine_Tree_Exception("Cannot move node as last child of itself or into a descendant");

			return false;
		}

        if ($dest->getNode()->getRootValue() != $this->getRootValue()) {
            // Move between trees
            return $this->_moveBetweenTrees($dest, $dest->getNode()->getRightValue(), __FUNCTION__);
        } else {
            // Move within tree
            $oldLevel = $this->record['level'];
            $this->record['level'] = $dest['level'] + 1;
            $this->updateNode($dest->getNode()->getRightValue(), $this->record['level'] - $oldLevel);
        }
        
        return true;
    }

    /**
     * Makes this node a root node. Only used in multiple-root trees.
     *
     * @todo Exception handling/wrapping
     */
    public function makeRoot($newRootId)
    {
        // TODO: throw exception instead?
        if ($this->getLeftValue() == 1 || ! $this->_tree->getAttribute('hasManyRoots')) {
            return false;
        }
        
        $oldRgt = $this->getRightValue();
        $oldLft = $this->getLeftValue();
        $oldRoot = $this->getRootValue();
        $oldLevel = $this->record['level'];
        
        $conn = $this->record->getTable()->getConnection();
        try {
            $conn->beginInternalTransaction();
            
            // Update descendants lft/rgt/root/level values
            $diff = 1 - $oldLft;
            $newRoot = $newRootId;
            $componentName = $this->_tree->getBaseComponent();
            $rootColName = $this->_tree->getAttribute('rootColumnName');
            $q = Doctrine_Core::getTable($componentName)
                ->createQuery()
                ->update()
                ->set($componentName . '.lft', $componentName.'.lft + ?', array($diff))
                ->set($componentName . '.rgt', $componentName.'.rgt + ?', array($diff))
                ->set($componentName . '.level', $componentName.'.level - ?', array($oldLevel))
                ->set($componentName . '.' . $rootColName, '?', array($newRoot))
                ->where($componentName . '.lft > ? AND ' . $componentName . '.rgt < ?', array($oldLft, $oldRgt));
            $q = $this->_tree->returnQueryWithRootId($q, $oldRoot);
            $q->execute();
            
            // Detach from old tree (close gap in old tree)
            $first = $oldRgt + 1;
            $delta = $oldLft - $oldRgt - 1;
            $this->shiftRLValues($first, $delta, $this->getRootValue());
            
            // Set new lft/rgt/root/level values for root node
            $this->setLeftValue(1);
            $this->setRightValue($oldRgt - $oldLft + 1);
            $this->setRootValue($newRootId);
            $this->record['level'] = 0;
            
            $this->record->save();
            
            $conn->commit();
            
            return true;
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
        
        return false;
    }

    /**
     * adds node as last child of record
     *        
     */
    public function addChild(Doctrine_Record $record)
    {
        $record->getNode()->insertAsLastChildOf($this->getRecord());
    }

    /**
     * determines if node is leaf
     *
     * @return bool            
     */
    public function isLeaf()
    {
        return (($this->getRightValue() - $this->getLeftValue()) == 1);
    }

    /**
     * determines if node is root
     *
     * @return bool            
     */
    public function isRoot()
    {
        return ($this->getLeftValue() == 1);
    }

    /**
     * determines if node is equal to subject node
     *
     * @return bool            
     */    
    public function isEqualTo(Doctrine_Record $subj)
    {
        return (($this->getLeftValue() == $subj->getNode()->getLeftValue()) &&
                ($this->getRightValue() == $subj->getNode()->getRightValue()) && 
                ($this->getRootValue() == $subj->getNode()->getRootValue())
                );
    }

    /**
     * determines if node is child of subject node
     *
     * @return bool
     */
    public function isDescendantOf(Doctrine_Record $subj)
    {
        return (($this->getLeftValue() > $subj->getNode()->getLeftValue()) &&
                ($this->getRightValue() < $subj->getNode()->getRightValue()) &&
                ($this->getRootValue() == $subj->getNode()->getRootValue()));
    }

    /**
     * determines if node is child of or sibling to subject node
     *
     * @return bool            
     */
    public function isDescendantOfOrEqualTo(Doctrine_Record $subj)
    {
        return (($this->getLeftValue() >= $subj->getNode()->getLeftValue()) &&
                ($this->getRightValue() <= $subj->getNode()->getRightValue()) &&
                ($this->getRootValue() == $subj->getNode()->getRootValue()));
    }

    /**
     * determines if node is ancestor of subject node
     *
     * @return bool            
     */
    public function isAncestorOf(Doctrine_Record $subj)
    {
        return (($subj->getNode()->getLeftValue() > $this->getLeftValue()) &&
                ($subj->getNode()->getRightValue() < $this->getRightValue()) &&
                ($subj->getNode()->getRootValue() == $this->getRootValue()));
    }

    /**
     * determines if node is valid
     *
     * @return bool
     */
    public function isValidNode($record = null)
    {
        if ($record === null) {
            return ($this->getRightValue() > $this->getLeftValue());
        } else if ( $record instanceof Doctrine_Record ) {
            return ($record->getNode()->getRightValue() > $record->getNode()->getLeftValue());
        } else {
            return false;
        }
    }
    
    /**
     * Detaches the node from the tree by invalidating it's lft & rgt values
     * (they're set to 0).
     */
    public function detach()
    {
        $this->setLeftValue(0);
        $this->setRightValue(0);
    }

    /**
     * deletes node and it's descendants
     * @todo Delete more efficiently. Wrap in transaction if needed.      
     */
    public function delete()
    {
        $conn = $this->record->getTable()->getConnection();
        try {
            $conn->beginInternalTransaction();
            
            // TODO: add the setting whether or not to delete descendants or relocate children
            $oldRoot = $this->getRootValue();
            $q = $this->_tree->getBaseQuery();

            $baseAlias = $this->_tree->getBaseAlias();
            $componentName = $this->_tree->getBaseComponent();

            $q = $q->addWhere("$baseAlias.lft >= ? AND $baseAlias.rgt <= ?", array($this->getLeftValue(), $this->getRightValue()));

            $q = $this->_tree->returnQueryWithRootId($q, $oldRoot);

            $coll = $q->execute();

            $coll->delete();

            $first = $this->getRightValue() + 1;
            $delta = $this->getLeftValue() - $this->getRightValue() - 1;
            $this->shiftRLValues($first, $delta, $oldRoot);
            
            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
        
        return true; 
    }

    /**
     * sets node's left and right values and save's it
     *
     * @param int     $destLeft     node left value
     * @param int        $destRight    node right value
     */    
    private function insertNode($destLeft = 0, $destRight = 0, $destRoot = 1)
    {
        $this->setLeftValue($destLeft);
        $this->setRightValue($destRight);
        $this->setRootValue($destRoot);
        $this->record->save();    
    }

    /**
     * move node's and its children to location $destLeft and updates rest of tree
     *
     * @param int     $destLeft    destination left value
     * @todo Wrap in transaction
     */
    private function updateNode($destLeft, $levelDiff)
    { 
        $componentName = $this->_tree->getBaseComponent();
        $left = $this->getLeftValue();
        $right = $this->getRightValue();
        $rootId = $this->getRootValue();

        $treeSize = $right - $left + 1;

        $conn = $this->record->getTable()->getConnection();
        try {
            $conn->beginInternalTransaction();
            
            // Make room in the new branch
            $this->shiftRLValues($destLeft, $treeSize, $rootId);

            if ($left >= $destLeft) { // src was shifted too?
                $left += $treeSize;
                $right += $treeSize;
            }

            // update level for descendants
            $q = Doctrine_Core::getTable($componentName)
                ->createQuery()
                ->update()
                ->set($componentName . '.level', $componentName.'.level + ?', array($levelDiff))
                ->where($componentName . '.lft > ? AND ' . $componentName . '.rgt < ?', array($left, $right));
            $q = $this->_tree->returnQueryWithRootId($q, $rootId);
            $q->execute();

            // now there's enough room next to target to move the subtree
            $this->shiftRLRange($left, $right, $destLeft - $left, $rootId);

            // correct values after source (close gap in old tree)
            $this->shiftRLValues($right + 1, -$treeSize, $rootId);

            $this->record->save();
            $this->record->refresh();
            
            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
        
        return true;
    }

    /**
     * adds '$delta' to all Left and Right values that are >= '$first'. '$delta' can also be negative.
     *
     * Note: This method does wrap its database queries in a transaction. This should be done
     * by the invoking code.
     *
     * @param int $first         First node to be shifted
     * @param int $delta         Value to be shifted by, can be negative
     */    
    private function shiftRlValues($first, $delta, $rootId = 1)
    {
        // shift left columns
        $componentName = $this->_tree->getBaseComponent();

        $qLeft  = Doctrine_Core::getTable($componentName)
            ->createQuery()
            ->update($componentName);

        $qRight = Doctrine_Core::getTable($componentName)
            ->createQuery()
            ->update($componentName);

        $qLeft = $qLeft->set($componentName . '.lft', $componentName.'.lft + ?', $delta)
                       ->where($componentName . '.lft >= ?', $first);
        $qLeft = $this->_tree->returnQueryWithRootId($qLeft, $rootId);

        $resultLeft = $qLeft->execute();

        // shift right columns
        $qRight = $qRight->set($componentName . '.rgt', $componentName.'.rgt + ?', $delta)
                         ->where($componentName . '.rgt >= ?', $first);

        $qRight = $this->_tree->returnQueryWithRootId($qRight, $rootId);

        $resultRight = $qRight->execute();
    }

    /**
     * adds '$delta' to all Left and Right values that are >= '$first' and <= '$last'. 
     * '$delta' can also be negative.
     *
     * Note: This method does wrap its database queries in a transaction. This should be done
     * by the invoking code.
     *
     * @param int $first     First node to be shifted (L value)
     * @param int $last     Last node to be shifted (L value)
     * @param int $delta         Value to be shifted by, can be negative
     */ 
    private function shiftRlRange($first, $last, $delta, $rootId = 1)
    {
        $componentName = $this->_tree->getBaseComponent();

        $qLeft  = Doctrine_Core::getTable($componentName)
            ->createQuery()
            ->update();

        $qRight = Doctrine_Core::getTable($componentName)
            ->createQuery()
            ->update();

        // shift left column values
        $qLeft = $qLeft->set($componentName . '.lft', $componentName.'.lft + ?', $delta)
                       ->where($componentName . '.lft >= ? AND ' . $componentName . '.lft <= ?', array($first, $last));
        
        $qLeft = $this->_tree->returnQueryWithRootId($qLeft, $rootId);

        $resultLeft = $qLeft->execute();
        
        // shift right column values
        $qRight = $qRight->set($componentName . '.rgt', $componentName.'.rgt + ?', $delta)
                        ->where($componentName . '.rgt >= ? AND ' . $componentName . '.rgt <= ?', array($first, $last));

        $qRight = $this->_tree->returnQueryWithRootId($qRight, $rootId);

        $resultRight = $qRight->execute();
    }

    /**
     * gets record's left value
     *
     * @return int            
     */     
    public function getLeftValue()
    {
        return $this->record->get('lft');
    }

    /**
     * sets record's left value
     *
     * @param int            
     */     
    public function setLeftValue($lft)
    {
        $this->record->set('lft', $lft);        
    }

    /**
     * gets record's right value
     *
     * @return int            
     */     
    public function getRightValue()
    {
        return $this->record->get('rgt');        
    }

    /**
     * sets record's right value
     *
     * @param int            
     */    
    public function setRightValue($rgt)
    {
        $this->record->set('rgt', $rgt);         
    }

    /**
     * gets level (depth) of node in the tree
     *
     * @return int            
     */    
    public function getLevel()
    {
        if ( ! isset($this->record['level'])) {
            $baseAlias = $this->_tree->getBaseAlias();
            $componentName = $this->_tree->getBaseComponent();
            $q = $this->_tree->getBaseQuery();
            $q = $q->addWhere("$baseAlias.lft < ? AND $baseAlias.rgt > ?", array($this->getLeftValue(), $this->getRightValue()));

            $q = $this->_tree->returnQueryWithRootId($q, $this->getRootValue());
            
            $coll = $q->execute();

            $this->record['level'] = count($coll) ? count($coll) : 0;
        }
        return $this->record['level'];
    }

    /**
     * get records root id value
     *            
     */     
    public function getRootValue()
    {
        if ($this->_tree->getAttribute('hasManyRoots')) {
            return $this->record->get($this->_tree->getAttribute('rootColumnName'));
        }
        return 1;
    }

    /**
     * sets records root id value
     *
     * @param int            
     */
    public function setRootValue($value)
    {
        if ($this->_tree->getAttribute('hasManyRoots')) {
            $this->record->set($this->_tree->getAttribute('rootColumnName'), $value);   
        }    
    }
}
