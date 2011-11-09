<?php
/*
 *  $Id: Iterator.php 3884 2008-02-22 18:26:35Z jwage $
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
 * Doctrine_Collection_OnDemand
 * iterates through Doctrine_Records hydrating one at a time
 *
 * @package     Doctrine
 * @subpackage  Collection
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.1
 * @version     $Revision$
 * @author      Geoff Davis <geoff.davis@gmedia.com.au>
 */
class Doctrine_Collection_OnDemand implements Iterator
{
    protected $_stmt;
    protected $_current;
    protected $_tableAliasMap;
    protected $_hydrator;
    protected $index;

    public function __construct($stmt, $hydrator, $tableAliasMap)
    {
        $this->_stmt = $stmt;
        $this->_hydrator = $hydrator;
        $this->_tableAliasMap = $tableAliasMap;
        $this->_current = null;
        $this->index = 0;

        $this->_hydrateCurrent();
    }

    private function _hydrateCurrent()
    {
        $record = $this->_hydrator->hydrateResultSet($this->_stmt);
        if ($record instanceof Doctrine_Collection) {
            $this->_current = $record->getFirst();
        } else if (is_array($record) && count($record) == 0) {
            $this->_current = null;
        } else if (is_array($record) && isset($record[0])) {
            $this->_current = $record[0];
        } else {
            $this->_current = $record;
        }
    }

    public function rewind()
    {
        $this->index = 0;
        $this->_stmt->closeCursor();
        $this->_stmt->execute();
        $this->_hydrator->onDemandReset();
        $this->_hydrateCurrent();
    }

    public function key()
    {
        return $this->index;
    }

    public function current()
    {
        return $this->_current;
    }

    public function next()
    {
        $this->_current = null;
        $this->index++;
        $this->_hydrateCurrent();
    }

    public function valid()
    {
        if ( ! is_null($this->_current) && $this->_current !== false) {
            return true;
        }
        return false;
    }
}