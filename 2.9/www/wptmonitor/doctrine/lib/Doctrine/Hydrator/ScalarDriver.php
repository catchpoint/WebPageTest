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
 * Builds result sets in to a scalar php array
 *
 * @package     Doctrine
 * @subpackage  Hydrate
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision$
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Hydrator_ScalarDriver extends Doctrine_Hydrator_Abstract
{
    public function hydrateResultSet($stmt)
    {
        $cache = array();
        $result = array();

        while ($data = $stmt->fetch(Doctrine_Core::FETCH_ASSOC)) {
            $result[] = $this->_gatherRowData($data, $cache);
        }

        return $result;
    }

    protected function _gatherRowData($data, &$cache, $aliasPrefix = true)
    {
        $rowData = array();
        foreach ($data as $key => $value) {
            // Parse each column name only once. Cache the results.
            if ( ! isset($cache[$key])) {
                if ($key == 'DOCTRINE_ROWNUM') {
                    continue;
                }
                // cache general information like the column name <-> field name mapping
                $e = explode('__', $key);
                $columnName = strtolower(array_pop($e)); 
                $cache[$key]['dqlAlias'] = $this->_tableAliases[strtolower(implode('__', $e))];
                $table = $this->_queryComponents[$cache[$key]['dqlAlias']]['table'];
                // check whether it's an aggregate value or a regular field
                if (isset($this->_queryComponents[$cache[$key]['dqlAlias']]['agg'][$columnName])) {
                    $fieldName = $this->_queryComponents[$cache[$key]['dqlAlias']]['agg'][$columnName];
                    $cache[$key]['isAgg'] = true;
                } else {
                    $fieldName = $table->getFieldName($columnName);
                    $cache[$key]['isAgg'] = false;
                }

                $cache[$key]['fieldName'] = $fieldName;

                // cache type information
                $type = $table->getTypeOfColumn($columnName);
                if ($type == 'integer' || $type == 'string') {
                    $cache[$key]['isSimpleType'] = true;
                } else {
                    $cache[$key]['type'] = $type;
                    $cache[$key]['isSimpleType'] = false;
                }
            }

            $table = $this->_queryComponents[$cache[$key]['dqlAlias']]['table'];
            $dqlAlias = $cache[$key]['dqlAlias'];
            $fieldName = $cache[$key]['fieldName'];

            $rowDataKey = $aliasPrefix ? $dqlAlias . '_' . $fieldName:$fieldName;
            
            if ($cache[$key]['isSimpleType'] || $cache[$key]['isAgg']) {
                $rowData[$rowDataKey] = $value;
            } else {
                $rowData[$rowDataKey] = $table->prepareValue(
                        $fieldName, $value, $cache[$key]['type']);
            }
        }
        return $rowData;
    }
}