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
 * Doctrine_Connection_Oracle
 *
 * @package     Doctrine
 * @subpackage  Connection
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Connection_Oracle extends Doctrine_Connection_Common
{
    /**
     * @var string $driverName                  the name of this connection driver
     */
    protected $driverName = 'Oracle';

    public function __construct(Doctrine_Manager $manager, $adapter)
    {
        $this->supported = array(
                          'sequences'            => true,
                          'indexes'              => true,
                          'summary_functions'    => true,
                          'order_by_text'        => true,
                          'current_id'           => true,
                          'affected_rows'        => true,
                          'transactions'         => true,
                          'savepoints'           => true,
                          'limit_queries'        => true,
                          'LOBs'                 => true,
                          'replace'              => 'emulated',
                          'sub_selects'          => true,
                          'auto_increment'       => false, // implementation is broken
                          'primary_key'          => true,
                          'result_introspection' => true,
                          'prepared_statements'  => true,
                          'identifier_quoting'   => true,
                          'pattern_escaping'     => true,
                          );
        
        $this->properties['sql_file_delimiter']    = "\n/\n";
        $this->properties['number_max_precision']  = 38;
        $this->properties['max_identifier_length'] = 30;

        parent::__construct($manager, $adapter);
        
        // moving properties to params to make them changeable by user
        // VARCHAR2 allowed length is 4000 BYTE. For UTF8 strings is better to use 1000 CHAR 
        $this->setParam('varchar2_max_length', 4000);
        // Oracle's default unit for char data types is BYTE. For UTF8 string it is better to use CHAR
        $this->setParam('char_unit', null);
    }

    /**
     * Sets up the date/time format
     *
     */
    public function setDateFormat($format = 'YYYY-MM-DD HH24:MI:SS')
    {
        $this->exec('ALTER SESSION SET NLS_DATE_FORMAT = "' . $format . '"');
    }

    /**
     * Adds an driver-specific LIMIT clause to the query
     *
     * @param string $query         query to modify
     * @param integer $limit        limit the number of rows
     * @param integer $offset       start reading from given offset
     * @return string               the modified query
     */
    public function modifyLimitQuery($query, $limit = false, $offset = false, $isManip = false)
    {
        return $this->_createLimitSubquery($query, $limit, $offset);
    }
    
    private function _createLimitSubquery($query, $limit, $offset, $column = null)
    {
        $limit = (int) $limit;
        $offset = (int) $offset;
        if (preg_match('/^\s*SELECT/i', $query)) {
            if ( ! preg_match('/\sFROM\s/i', $query)) {
                $query .= " FROM dual";
            }
            if ($limit > 0) {
                $max = $offset + $limit;
                $column = $column === null ? '*' : $this->quoteIdentifier($column);
                if ($offset > 0) {
                    $min = $offset + 1;
                    $query = 'SELECT b.'.$column.' FROM ( '.
                                 'SELECT a.*, ROWNUM AS doctrine_rownum FROM ( '
                                   . $query . ' ) ' . $this->quoteIdentifier('a') . ' '.
                              ' ) ' . $this->quoteIdentifier('b') . ' '.
                              'WHERE doctrine_rownum BETWEEN ' . $min .  ' AND ' . $max;
                } else {
                    $query = 'SELECT a.'.$column.' FROM ( ' . $query .' ) a WHERE ROWNUM <= ' . $max;
                }
            }
        }
        return $query;
    }
    
    /**
     * Creates the SQL for Oracle that can be used in the subquery for the limit-subquery
     * algorithm.
     */
    public function modifyLimitSubquery(Doctrine_Table $rootTable, $query, $limit = false,
            $offset = false, $isManip = false)
    {
        // NOTE: no composite key support
        $columnNames = $rootTable->getIdentifierColumnNames();
        if (count($columnNames) > 1) {
            throw new Doctrine_Connection_Exception("Composite keys in LIMIT queries are "
                    . "currently not supported.");
        }
        $column = $columnNames[0];
        return $this->_createLimitSubquery($query, $limit, $offset, $column);
    }

    public function getTmpConnection($info)
    {
        return clone $this;
    }
}