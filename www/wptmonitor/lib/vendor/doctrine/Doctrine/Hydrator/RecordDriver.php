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
 * Builds result sets in to the object graph using Doctrine_Record instances
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
class Doctrine_Hydrator_RecordDriver extends Doctrine_Hydrator_Graph
{
    protected $_collections = array();
    private $_initializedRelations = array();

    public function getElementCollection($component)
    {
        $coll = Doctrine_Collection::create($component);
        $this->_collections[] = $coll;

        return $coll;
    }
    
    public function initRelated(&$record, $name)
    {
        if ( ! isset($this->_initializedRelations[$record->getOid()][$name])) {
            $relation = $record->getTable()->getRelation($name);
            $coll = Doctrine_Collection::create($relation->getTable()->getComponentName());
            $coll->setReference($record, $relation);
            $record[$name] = $coll;
            $this->_initializedRelations[$record->getOid()][$name] = true;
        }
        return true;
    }
    
    public function registerCollection($coll)
    {
        $this->_collections[] = $coll;
    }
    
    public function getNullPointer() 
    {
        return self::$_null;
    }
    
    public function getElement(array $data, $component)
    {
        $component = $this->_getClassNameToReturn($data, $component);

        $this->_tables[$component]->setData($data);
        $record = $this->_tables[$component]->getRecord();

        return $record;
    }

    public function getLastKey(&$coll) 
    {
        $coll->end();
        
        return $coll->key();
    }

    /**
     * sets the last element of given data array / collection
     * as previous element
     *
     * @param boolean|integer $index
     * @return void
     * @todo Detailed documentation
     */
    public function setLastElement(&$prev, &$coll, $index, $dqlAlias, $oneToOne)
    {
        if ($coll === self::$_null) {
            unset($prev[$dqlAlias]); // Ticket #1228
            return;
        }

        if ($index !== false) {
            // Link element at $index to previous element for the component
            // identified by the DQL alias $alias
            $prev[$dqlAlias] = $coll[$index];
            return;
        }
        
        if (count($coll) > 0) {
            $prev[$dqlAlias] = $coll->getLast();
        }
    }

    public function flush()
    {
        // take snapshots from all initialized collections
        foreach ($this->_collections as $key => $coll) {
            $coll->takeSnapshot();
        }
        $this->_initializedRelations = null;
        $this->_collections = null;
        $this->_tables = null;
    }
}