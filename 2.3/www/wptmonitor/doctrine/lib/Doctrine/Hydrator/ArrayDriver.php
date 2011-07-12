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
 * Builds result sets in to the object graph using php arrays
 *
 * @package     Doctrine
 * @subpackage  Hydrate
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision$
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Hydrator_ArrayDriver extends Doctrine_Hydrator_Graph
{
    public function getElementCollection($component)
    {
        return array();
    }

    public function getElement(array $data, $component)
    {
        return $data;
    }

    public function registerCollection($coll)
    {

    }

    public function initRelated(&$record, $name)
    {
        if ( ! isset($record[$name])) {
            $record[$name] = array();
        }
        return true;
    }

    public function getNullPointer() 
    {
        return null;    
    }

    public function getLastKey(&$coll)
    {
        end($coll);
        return key($coll);
    }

    public function setLastElement(&$prev, &$coll, $index, $dqlAlias, $oneToOne)
    {
        if ($coll === null) {
            unset($prev[$dqlAlias]); // Ticket #1228
            return;
        }

        if ($index !== false) {
            // Link element at $index to previous element for the component
            // identified by the DQL alias $alias
            $prev[$dqlAlias] =& $coll[$index];
            return;
        }
        
        if ($coll) {
            if ($oneToOne) {
                $prev[$dqlAlias] =& $coll;
            } else {
                end($coll);
                $prev[$dqlAlias] =& $coll[key($coll)];
            }
        }
    }
}