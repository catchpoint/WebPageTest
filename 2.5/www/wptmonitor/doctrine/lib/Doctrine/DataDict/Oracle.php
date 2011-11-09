<?php
/*
 *  $Id: Oracle.php 7490 2010-03-29 19:53:27Z jwage $
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
 * @package     Doctrine
 * @subpackage  DataDict
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @version     $Revision: 7490 $
 * @link        www.doctrine-project.org
 * @since       1.0
 */
class Doctrine_DataDict_Oracle extends Doctrine_DataDict
{
    /**
     * Obtain DBMS specific SQL code portion needed to declare an text type
     * field to be used in statements like CREATE TABLE.
     *
     * @param array $field  associative array with the name of the properties
     *      of the field being declared as array indexes. Currently, the types
     *      of supported field properties are as follows:
     *
     *      length
     *          Integer value that determines the maximum length of the text
     *          field. If this argument is missing the field should be
     *          declared to have the longest length allowed by the DBMS.
     *
     *      default
     *          Text value to be used as default for this field.
     *
     *      notnull
     *          Boolean flag that indicates whether this field is constrained
     *          to not be set to null.
     * @return string  DBMS specific SQL code portion that should be used to
     *      declare the specified field.
     */
    public function getNativeDeclaration(array $field)
    {
        if ( ! isset($field['type'])) {
            throw new Doctrine_DataDict_Exception('Missing column type.');
        }
        switch ($field['type']) {
            case 'enum':
                $field['length'] = isset($field['length']) && $field['length'] ? $field['length']:255;
            case 'string':
            case 'array':
            case 'object':
            case 'gzip':
            case 'char':
            case 'varchar':
                $length = !empty($field['length']) ? $field['length'] : false;

                $fixed  = ((isset($field['fixed']) && $field['fixed']) || $field['type'] == 'char') ? true : false;
                
                $unit = $this->conn->getParam('char_unit');
                $unit = ! is_null($unit) ? ' '.$unit : '';

                if ($length && $length <= $this->conn->getParam('varchar2_max_length')) {
                    return $fixed ? 'CHAR('.$length.$unit.')' : 'VARCHAR2('.$length.$unit.')';
                }
            case 'clob':
                return 'CLOB';
            case 'blob':
                return 'BLOB';
            case 'integer':
            case 'int':
            	$length = (!empty($field['length'])) ? $field['length'] : false;
            	if ( $length && $length <= $this->conn->number_max_precision)  {
            		if ($length <= 1) {
            			return 'NUMBER(3)'; // TINYINT, unsigned max. 256
            		} elseif ($length == 2) {
            			return 'NUMBER(5)'; // SMALLINT, unsigend max. 65.536
            		} elseif ($length == 3) {
            			return 'NUMBER(8)'; // MEDIUMINT, unsigned max. 16.777.216
            		} elseif ($length == 4) {
            			return 'NUMBER(10)'; // INTEGER, unsigend max. 4.294.967.296
            		} elseif ($length <= 8) {
            			return 'NUMBER(20)'; // BIGINT, unsigend max. 18.446.744.073.709.551.616
            		} else {
            			return 'INTEGER';
            		}
            	}
                return 'INTEGER';
            case 'boolean':
                return 'NUMBER(1)';
            case 'date':
            case 'time':
            case 'timestamp':
                return 'DATE';
            case 'float':
            case 'double':
                return 'NUMBER';
            case 'decimal':
                $scale = !empty($field['scale']) ? $field['scale'] : $this->conn->getAttribute(Doctrine_Core::ATTR_DECIMAL_PLACES);
                return 'NUMBER(*,'.$scale.')';
            default:
        }
        return $field['type'] . (isset($field['length']) ? '('.$field['length'].')':null);
    }

    /**
     * Maps a native array description of a field to a doctrine datatype and length
     *
     * @param array  $field native field description
     * @return array containing the various possible types, length, sign, fixed
     * @throws Doctrine_DataDict_Oracle_Exception
     */
    public function getPortableDeclaration(array $field)
    {
        if ( ! isset($field['data_type'])) {
            throw new Doctrine_DataDict_Exception('Native oracle definition must have a data_type key specified');
        }
        
        $dbType = strtolower($field['data_type']);
        $type = array();
        $length = $unsigned = $fixed = null;
        if ( ! empty($field['data_length'])) {
            $length = (int)$field['data_length'];
        }

        if ( ! isset($field['column_name'])) {
            $field['column_name'] = '';
        }

        switch ($dbType) {
            case 'integer':
            case 'pls_integer':
            case 'binary_integer':
                $type[] = 'integer';
                if ($length == '1') {
                    $type[] = 'boolean';
                    if (preg_match('/^(is|has)/i', $field['column_name'])) {
                        $type = array_reverse($type);
                    }
                }
                break;
            case 'varchar':
            case 'varchar2':
            case 'nvarchar2':
                $fixed = false;
            case 'char':
            case 'nchar':
                $type[] = 'string';
                if ($length == '1') {
                    $type[] = 'boolean';
                    if (preg_match('/^(is|has)/i', $field['column_name'])) {
                        $type = array_reverse($type);
                    }
                }
                if ($fixed !== false) {
                    $fixed = true;
                }
                break;
            case 'date':
            case 'timestamp':
                $type[] = 'timestamp';
                $length = null;
                break;
            case 'float':
                $type[] = 'float';
                break;
            case 'number':
                if ( ! empty($field['data_scale'])) {
                    $type[] = 'decimal';
                } else {
                    $type[] = 'integer';
                    if ((int)$length == '1') {
                        $type[] = 'boolean';
                        if (preg_match('/^(is|has)/i', $field['column_name'])) {
                            $type = array_reverse($type);
                        } else {
                            $length = 1; //TINYINT
                        }
                    } elseif ( ! is_null($length) && (int)$length <= 3) { // TINYINT
                        $length = 1;
                    } elseif ( ! is_null($length) && (int)$length <= 5) { // SMALLINT
                        $length = 2;
                    } elseif ( ! is_null($length) && (int)$length <= 8) { // MEDIUMINT
                        $length = 3;
                    } elseif ( ! is_null($length) && (int)$length <= 10) { // INT
                        $length = 4;
                    } elseif ( ! is_null($length) && (int)$length <= 20) { //BIGINT
                        $length = 8;
                    }
                }
                break;
            case 'long':
                $type[] = 'string';
            case 'clob':
            case 'nclob':
                $type[] = 'clob';
                break;
            case 'blob':
            case 'raw':
            case 'long raw':
            case 'bfile':
                $type[] = 'blob';
                $length = null;
            break;
            case 'rowid':
            case 'urowid':
            default:
                $type[] = $field['type'];
                $length = isset($field['length']) ? $field['length']:null;
        }

        return array('type'     => $type,
                     'length'   => $length,
                     'unsigned' => $unsigned,
                     'fixed'    => $fixed);
    }
}
