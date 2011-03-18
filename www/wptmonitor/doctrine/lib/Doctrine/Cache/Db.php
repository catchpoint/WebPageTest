<?php
/*
 *  $Id: Db.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Database cache driver
 *
 * @package     Doctrine
 * @subpackage  Cache
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Jonathan H. Wage <jonwage@gmail.com>
 */
class Doctrine_Cache_Db extends Doctrine_Cache_Driver
{
    /**
     * Configure Database cache driver. Specify instance of Doctrine_Connection
     * and tableName to store cache in
     *
     * @param array $_options      an array of options
     */
    public function __construct($options = array())
    {
        if ( ! isset($options['connection']) ||
             ! ($options['connection'] instanceof Doctrine_Connection)) {

            throw new Doctrine_Cache_Exception('Connection option not set.');
        }

        if ( ! isset($options['tableName']) ||
             ! is_string($options['tableName'])) {

             throw new Doctrine_Cache_Exception('Table name option not set.');
        }


        $this->_options = $options;
    }

    /**
     * Get the connection object associated with this cache driver
     *
     * @return Doctrine_Connection $connection
     */
    public function getConnection()
    {
        return $this->_options['connection'];
    }

    /**
     * Fetch a cache record from this cache driver instance
     *
     * @param string $id cache id
     * @param boolean $testCacheValidity        if set to false, the cache validity won't be tested
     * @return mixed  Returns either the cached data or false
     */
    protected function _doFetch($id, $testCacheValidity = true)
    {
        $sql = 'SELECT data, expire FROM ' . $this->_options['tableName']
             . ' WHERE id = ?';

        if ($testCacheValidity) {
            $sql .= " AND (expire is null OR expire > '" . date('Y-m-d H:i:s') . "')";
        }

        $result = $this->getConnection()->execute($sql, array($id))->fetchAll(Doctrine_Core::FETCH_NUM);

        if ( ! isset($result[0])) {
            return false;
        }

        return unserialize($this->_hex2bin($result[0][0]));
    }

    /**
     * Test if a cache record exists for the passed id
     *
     * @param string $id cache id
     * @return mixed false (a cache is not available) or "last modified" timestamp (int) of the available cache record
     */
    protected function _doContains($id)
    {
        $sql = 'SELECT id, expire FROM ' . $this->_options['tableName']
             . ' WHERE id = ?';

        $result = $this->getConnection()->fetchOne($sql, array($id));

        if (isset($result[0] )) {
            return time();
        }
        return false;
    }

    /**
     * Save a cache record directly. This method is implemented by the cache
     * drivers and used in Doctrine_Cache_Driver::save()
     *
     * @param string $id        cache id
     * @param string $data      data to cache
     * @param int $lifeTime     if != false, set a specific lifetime for this cache record (null => infinite lifeTime)
     * @return boolean true if no problem
     */
    protected function _doSave($id, $data, $lifeTime = false, $saveKey = true)
    {
        if ($this->contains($id)) {
            //record is in database, do update
            $sql = 'UPDATE ' . $this->_options['tableName']
                . ' SET data = ?, expire=? '
                . ' WHERE id = ?';

            if ($lifeTime) {
                $expire = date('Y-m-d H:i:s', time() + $lifeTime);
            } else {
                $expire = NULL;
            }

            $params = array(bin2hex(serialize($data)), $expire, $id);
        } else {
            //record is not in database, do insert
            $sql = 'INSERT INTO ' . $this->_options['tableName']
                . ' (id, data, expire) VALUES (?, ?, ?)';

            if ($lifeTime) {
                $expire = date('Y-m-d H:i:s', time() + $lifeTime);
            } else {
                $expire = NULL;
            }

            $params = array($id, bin2hex(serialize($data)), $expire);
        }

        return $this->getConnection()->exec($sql, $params);
    }

    /**
     * Remove a cache record directly. This method is implemented by the cache
     * drivers and used in Doctrine_Cache_Driver::delete()
     *
     * @param string $id cache id
     * @return boolean true if no problem
     */
    protected function _doDelete($id)
    {
        $sql = 'DELETE FROM ' . $this->_options['tableName'] . ' WHERE id = ?';
        return $this->getConnection()->exec($sql, array($id));
    }

    /**
     * Create the cache table
     *
     * @return void
     */
    public function createTable()
    {
        $name = $this->_options['tableName'];

        $fields = array(
            'id' => array(
                'type'   => 'string',
                'length' => 255
            ),
            'data' => array(
                'type'    => 'blob'
            ),
            'expire' => array(
                'type'    => 'timestamp'
            )
        );

        $options = array(
            'primary' => array('id')
        );

        $this->getConnection()->export->createTable($name, $fields, $options);
    }

    /**
     * Convert hex data to binary data. If passed data is not hex then
     * it is returned as is.
     *
     * @param string $hex
     * @return string $binary
     */
    protected function _hex2bin($hex)
    {
        if ( ! is_string($hex)) {
            return null;
        }

        if ( ! ctype_xdigit($hex)) {
            return $hex;
        }

        return pack("H*", $hex);
    }

    /**
     * Fetch an array of all keys stored in cache
     *
     * @return array Returns the array of cache keys
     */
    protected function _getCacheKeys()
    {
        $sql = 'SELECT id FROM ' . $this->_options['tableName'];
        $keys = array();
        $results = $this->getConnection()->execute($sql)->fetchAll(Doctrine_Core::FETCH_NUM);
        for ($i = 0, $count = count($results); $i < $count; $i++) {
            $keys[] = $results[$i][0];
        }
        return $keys;
    }
}