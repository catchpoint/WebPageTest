<?php
/*
 *  $Id: Self.php 1434 2007-05-22 15:57:17Z zYne $
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
 * Doctrine_Relation_Association_Self
 *
 * @package     Doctrine
 * @subpackage  Relation
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 1434 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Relation_Nest extends Doctrine_Relation_Association
{
    public function fetchRelatedFor(Doctrine_Record $record)
    {
        $id = $record->getIncremented();

        if (empty($id) || ! $this->definition['table']->getAttribute(Doctrine_Core::ATTR_LOAD_REFERENCES)) {
            return Doctrine_Collection::create($this->getTable());
        } else {
            $q = new Doctrine_RawSql($this->getTable()->getConnection());
            $formatter = $q->getConnection()->formatter;

            $assocTable = $this->getAssociationFactory()->getTableName();
            $tableName  = $record->getTable()->getTableName();
            $identifierColumnNames = $record->getTable()->getIdentifierColumnNames();
            $identifier = $formatter->quoteIdentifier(array_pop($identifierColumnNames));

            $sub = 'SELECT ' . $formatter->quoteIdentifier($this->getForeignRefColumnName())
                 . ' FROM '  . $formatter->quoteIdentifier($assocTable)
                 . ' WHERE ' . $formatter->quoteIdentifier($this->getLocalRefColumnName())
                 . ' = ?';

            $condition[] = $formatter->quoteIdentifier($tableName) . '.' . $identifier . ' IN (' . $sub . ')';
            $joinCondition[] = $formatter->quoteIdentifier($tableName) . '.' . $identifier . ' = ' . $formatter->quoteIdentifier($assocTable) . '.' . $formatter->quoteIdentifier($this->getForeignRefColumnName());

            if ($this->definition['equal']) {
                $sub2   = 'SELECT ' . $formatter->quoteIdentifier($this->getLocalRefColumnName())
                        . ' FROM '  . $formatter->quoteIdentifier($assocTable)
                        . ' WHERE ' . $formatter->quoteIdentifier($this->getForeignRefColumnName())
                        . ' = ?';

                $condition[] = $formatter->quoteIdentifier($tableName) . '.' . $identifier . ' IN (' . $sub2 . ')';
                $joinCondition[] = $formatter->quoteIdentifier($tableName) . '.' . $identifier . ' = ' . $formatter->quoteIdentifier($assocTable) . '.' . $formatter->quoteIdentifier($this->getLocalRefColumnName());
            }
            $q->select('{'.$tableName.'.*}, {'.$assocTable.'.*}')
              ->from($formatter->quoteIdentifier($tableName) . ' INNER JOIN ' . $formatter->quoteIdentifier($assocTable) . ' ON ' . implode(' OR ', $joinCondition))
              ->where(implode(' OR ', $condition));
            if ($orderBy = $this->getOrderByStatement($tableName, true)) {
                $q->addOrderBy($orderBy);
            } else {
                $q->addOrderBy($formatter->quoteIdentifier($tableName) . '.' . $identifier . ' ASC');
            }
            $q->addComponent($tableName,  $this->getClass());

            $path = $this->getClass(). '.' . $this->getAssociationFactory()->getComponentName();
            if ($this->definition['refClassRelationAlias']) {
                $path = $this->getClass(). '.' . $this->definition['refClassRelationAlias'];
            }
            $q->addComponent($assocTable, $path);

            $params = ($this->definition['equal']) ? array($id, $id) : array($id);

            $res = $q->execute($params);

            return $res;
        }
    }
}
