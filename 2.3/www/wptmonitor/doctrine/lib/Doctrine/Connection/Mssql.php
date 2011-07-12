<?php
/*
 *  $Id: Mssql.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Connection_Mssql
 *
 * @package     Doctrine
 * @subpackage  Connection
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Lukas Smith <smith@pooteeweet.org> (PEAR MDB2 library)
 * @version     $Revision: 7490 $
 * @link        www.doctrine-project.org
 * @since       1.0
 */
class Doctrine_Connection_Mssql extends Doctrine_Connection_Common
{
    /**
     * @var string $driverName                  the name of this connection driver
     */
    protected $driverName = 'Mssql';

    /**
     * the constructor
     *
     * @param Doctrine_Manager $manager
     * @param PDO $pdo                          database handle
     */
    public function __construct(Doctrine_Manager $manager, $adapter)
    {
        // initialize all driver options
        $this->supported = array(
                          'sequences'             => 'emulated',
                          'indexes'               => true,
                          'affected_rows'         => true,
                          'transactions'          => true,
                          'summary_functions'     => true,
                          'order_by_text'         => true,
                          'current_id'            => 'emulated',
                          'limit_queries'         => 'emulated',
                          'LOBs'                  => true,
                          'replace'               => 'emulated',
                          'sub_selects'           => true,
                          'auto_increment'        => true,
                          'primary_key'           => true,
                          'result_introspection'  => true,
                          'prepared_statements'   => 'emulated',
                          );

        parent::__construct($manager, $adapter);
    }

    /**
     * quoteIdentifier
     * Quote a string so it can be safely used as a table / column name
     *
     * Quoting style depends on which database driver is being used.
     *
     * @param string $identifier    identifier name to be quoted
     * @param bool   $checkOption   check the 'quote_identifier' option
     *
     * @return string  quoted identifier string
     */
    public function quoteIdentifier($identifier, $checkOption = false)
    {
        if ($checkOption && ! $this->getAttribute(Doctrine_Core::ATTR_QUOTE_IDENTIFIER)) {
            return $identifier;
        }
        
        if (strpos($identifier, '.') !== false) { 
            $parts = explode('.', $identifier); 
            $quotedParts = array(); 
            foreach ($parts as $p) { 
                $quotedParts[] = $this->quoteIdentifier($p); 
            }
            
            return implode('.', $quotedParts); 
        }
        
        return '[' . str_replace(']', ']]', $identifier) . ']';
    }

    /**
     * Adds an adapter-specific LIMIT clause to the SELECT statement.
     * [ original code borrowed from Zend Framework ]
     *
     * License available at: http://framework.zend.com/license
     *
     * Copyright (c) 2005-2008, Zend Technologies USA, Inc.
     * All rights reserved.
     * 
     * Redistribution and use in source and binary forms, with or without modification,
     * are permitted provided that the following conditions are met:
     * 
     *     * Redistributions of source code must retain the above copyright notice,
     *       this list of conditions and the following disclaimer.
     * 
     *     * Redistributions in binary form must reproduce the above copyright notice,
     *       this list of conditions and the following disclaimer in the documentation
     *       and/or other materials provided with the distribution.
     * 
     *     * Neither the name of Zend Technologies USA, Inc. nor the names of its
     *       contributors may be used to endorse or promote products derived from this
     *       software without specific prior written permission.
     * 
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
     * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
     * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
     * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
     * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
     * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
     * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
     * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
     * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
     * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
     *
     * @param string $query
     * @param mixed $limit
     * @param mixed $offset
     * @link http://lists.bestpractical.com/pipermail/rt-devel/2005-June/007339.html
     * @return string
     */
    public function modifyLimitQuery($query, $limit = false, $offset = false, $isManip = false, $isSubQuery = false)
    {
        if ($limit > 0) {
            $count = intval($limit);
            $offset = intval($offset);

            if ($offset < 0) {
                throw new Doctrine_Connection_Exception("LIMIT argument offset=$offset is not valid");
            }

            $orderby = stristr($query, 'ORDER BY');

            if ($orderby !== false) {
                // Ticket #1835: Fix for ORDER BY alias
                // Ticket #2050: Fix for multiple ORDER BY clause
                $order = str_ireplace('ORDER BY', '', $orderby);
                $orders = explode(',', $order);

                for ($i = 0; $i < count($orders); $i++) {
                    $sorts[$i] = (stripos($orders[$i], ' desc') !== false) ? 'DESC' : 'ASC';
                    $orders[$i] = trim(preg_replace('/\s+(ASC|DESC)$/i', '', $orders[$i]));

                    // find alias in query string
                    $helper_string = stristr($query, $orders[$i]);

                    $from_clause_pos = strpos($helper_string, ' FROM ');
                    $fields_string = substr($helper_string, 0, $from_clause_pos + 1);

                    $field_array = explode(',', $fields_string);
                    $field_array = array_shift($field_array);
                    $aux2 = spliti(' as ', $field_array);
                    $aux2 = explode('.', end($aux2));

                    $aliases[$i] = trim(end($aux2));
                }
            }

            // Ticket #1259: Fix for limit-subquery in MSSQL
            $selectRegExp = 'SELECT\s+';
            $selectReplace = 'SELECT ';

            if (preg_match('/^SELECT(\s+)DISTINCT/i', $query)) {
                $selectRegExp .= 'DISTINCT\s+';
                $selectReplace .= 'DISTINCT ';
            }

            $fields_string = substr($query, strlen($selectReplace), strpos($query, ' FROM ') - strlen($selectReplace));
            $field_array = explode(',', $fields_string);
            $field_array = array_shift($field_array);
            $aux2 = spliti(' as ', $field_array);
            $aux2 = explode('.', end($aux2));
            $key_field = trim(end($aux2));

            $query = preg_replace('/^'.$selectRegExp.'/i', $selectReplace . 'TOP ' . ($count + $offset) . ' ', $query);

            if ($isSubQuery === true) {
                $query = 'SELECT TOP ' . $count . ' ' . $this->quoteIdentifier('inner_tbl') . '.' . $key_field . ' FROM (' . $query . ') AS ' . $this->quoteIdentifier('inner_tbl');
            } else {
                $query = 'SELECT * FROM (SELECT TOP ' . $count . ' * FROM (' . $query . ') AS ' . $this->quoteIdentifier('inner_tbl');
            }

            if ($orderby !== false) {
                $query .= ' ORDER BY '; 

                for ($i = 0, $l = count($orders); $i < $l; $i++) { 
                    if ($i > 0) { // not first order clause 
                        $query .= ', '; 
                    } 

                    $query .= $this->quoteIdentifier('inner_tbl') . '.' . $aliases[$i] . ' '; 
                    $query .= (stripos($sorts[$i], 'asc') !== false) ? 'DESC' : 'ASC';
                }
            }

            if ($isSubQuery !== true) {
                $query .= ') AS ' . $this->quoteIdentifier('outer_tbl');

                if ($orderby !== false) {
                    $query .= ' ORDER BY ';

                    for ($i = 0, $l = count($orders); $i < $l; $i++) {
                        if ($i > 0) { // not first order clause
                            $query .= ', ';
                        }

                        $query .= $this->quoteIdentifier('outer_tbl') . '.' . $aliases[$i] . ' ' . $sorts[$i];
                    }
                }
            }
        }

        return $query;
    }

    /**
     * Creates dbms specific LIMIT/OFFSET SQL for the subqueries that are used in the
     * context of the limit-subquery algorithm.
     *
     * @return string
     */
    public function modifyLimitSubquery(Doctrine_Table $rootTable, $query, $limit = false, $offset = false, $isManip = false)
    {
        return $this->modifyLimitQuery($query, $limit, $offset, $isManip, true);
    }
    
    /**
     * return version information about the server
     *
     * @param bool   $native  determines if the raw version string should be returned
     * @return array    version information
     */
    public function getServerVersion($native = false)
    {
        if ($this->serverInfo) {
            $serverInfo = $this->serverInfo;
        } else {
            $query      = 'SELECT @@VERSION';
            $serverInfo = $this->fetchOne($query);
        }
        // cache server_info
        $this->serverInfo = $serverInfo;
        if ( ! $native) {
            if (preg_match('/([0-9]+)\.([0-9]+)\.([0-9]+)/', $serverInfo, $tmp)) {
                $serverInfo = array(
                    'major' => $tmp[1],
                    'minor' => $tmp[2],
                    'patch' => $tmp[3],
                    'extra' => null,
                    'native' => $serverInfo,
                );
            } else {
                $serverInfo = array(
                    'major' => null,
                    'minor' => null,
                    'patch' => null,
                    'extra' => null,
                    'native' => $serverInfo,
                );
            }
        }
        return $serverInfo;
    }

    /**
     * Checks if there's a sequence that exists.
     *
     * @param  string $seq_name     The sequence name to verify.
     * @return boolean              The value if the table exists or not
     */
    public function checkSequence($seqName)
    {
        $query = 'SELECT * FROM ' . $seqName;
        try {
            $this->exec($query);
        } catch(Doctrine_Connection_Exception $e) {
            if ($e->getPortableCode() == Doctrine_Core::ERR_NOSUCHTABLE) {
                return false;
            }

            throw $e;
        }
        return true;
    }

    /**
     * execute
     * @param string $query     sql query
     * @param array $params     query parameters
     *
     * @return PDOStatement|Doctrine_Adapter_Statement
     */
    public function execute($query, array $params = array())
    {
        if(! empty($params)) {
            $query = $this->replaceBoundParamsWithInlineValuesInQuery($query, $params);
        }

        return parent::execute($query, array());
    }

    /**
     * execute
     * @param string $query     sql query
     * @param array $params     query parameters
     *
     * @return PDOStatement|Doctrine_Adapter_Statement
     */
    public function exec($query, array $params = array())
    {
        if(! empty($params)) {
            $query = $this->replaceBoundParamsWithInlineValuesInQuery($query, $params);
        }

        return parent::exec($query, array());
    }

    /**
     * Replaces bound parameters and their placeholders with explicit values.
     *
     * Workaround for http://bugs.php.net/36561
     *
     * @param string $query
     * @param array $params
     */
    protected function replaceBoundParamsWithInlineValuesInQuery($query, array $params) {

        foreach($params as $key => $value) {
            if(is_null($value)) {
                $value = 'NULL';
            }
            else {
                $value = $this->quote($value);
            }

            $re = '/([=,\(][^\\\']*)(\?)/iuU';

            $query = preg_replace($re, "\\1 {$value}", $query, 1);

        }

        return $query;

    }

    /**
     * Inserts a table row with specified data.
     *
     * @param Doctrine_Table $table     The table to insert data into.
     * @param array $values             An associative array containing column-value pairs.
     *                                  Values can be strings or Doctrine_Expression instances.
     * @return integer                  the number of affected rows. Boolean false if empty value array was given,
     */
    public function insert(Doctrine_Table $table, array $fields)
    {
        $identifiers = $table->getIdentifierColumnNames();

        $settingNullIdentifier = false;
        $fields = array_change_key_case($fields);
        foreach($identifiers as $identifier) {
            $lcIdentifier = strtolower($identifier);

            if(array_key_exists($lcIdentifier, $fields)) {
                if(is_null($fields[$lcIdentifier])) {
                    $settingNullIdentifier = true;
                    unset($fields[$lcIdentifier]);
                }
            }
        }

        // MSSQL won't allow the setting of identifier columns to null, so insert a default record and then update it
        if ($settingNullIdentifier) {
            $count = $this->exec('INSERT INTO ' . $this->quoteIdentifier($table->getTableName()) . ' DEFAULT VALUES');

            if(! $count) {
                return $count;
            }

            $id = $this->lastInsertId($table->getTableName());

            return $this->update($table, $fields, array($id));
        }

        return parent::insert($table, $fields);
    }
}