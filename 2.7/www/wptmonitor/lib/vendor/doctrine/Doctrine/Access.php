<?php
/*
 *  $Id: Access.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Provides array access and property overload interface for Doctrine subclasses
 *
 * @package     Doctrine
 * @subpackage  Access
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
abstract class Doctrine_Access extends Doctrine_Locator_Injectable implements ArrayAccess
{
    /**
     * Set an entire aray to the data
     *
     * @param   array $array An array of key => value pairs
     * @return  Doctrine_Access
     */
    public function setArray(array $array)
    {
        foreach ($array as $k => $v) {
            $this->set($k, $v);
        }

        return $this;
    }

    /**
     * Set key and value to data
     *
     * @see     set, offsetSet
     * @param   $name
     * @param   $value
     * @return  void
     */
    public function __set($name, $value)
    {
        $this->set($name, $value);
    }

    /**
     * Get key from data
     *
     * @see     get, offsetGet
     * @param   mixed $name
     * @return  mixed
     */
    public function __get($name)
    {
        return $this->get($name);
    }

    /**
     * Check if key exists in data
     *
     * @param   string $name
     * @return  boolean whether or not this object contains $name
     */
    public function __isset($name)
    {
        return $this->contains($name);
    }

    /**
     * Remove key from data
     *
     * @param   string $name
     * @return  void
     */
    public function __unset($name)
    {
        return $this->remove($name);
    }

    /**
     * Check if an offset axists
     *
     * @param   mixed $offset
     * @return  boolean Whether or not this object contains $offset
     */
    public function offsetExists($offset)
    {
        return $this->contains($offset);
    }

    /**
     * An alias of get()
     *
     * @see     get, __get
     * @param   mixed $offset
     * @return  mixed
     */
    public function offsetGet($offset)
    {
        return $this->get($offset);
    }

    /**
     * Sets $offset to $value
     *
     * @see     set, __set
     * @param   mixed $offset
     * @param   mixed $value
     * @return  void
     */
    public function offsetSet($offset, $value)
    {
        if ( ! isset($offset)) {
            $this->add($value);
        } else {
            $this->set($offset, $value);
        }
    }

    /**
     * Unset a given offset
     *
     * @see   set, offsetSet, __set
     * @param mixed $offset
     */
    public function offsetUnset($offset)
    {
        return $this->remove($offset);
    }

    /**
     * Remove the element with the specified offset
     *
     * @param mixed $offset The offset to remove
     * @return boolean True if removed otherwise false
     */
    public function remove($offset)
    {
        throw new Doctrine_Exception('Remove is not supported for ' . get_class($this));
    }

    /**
     * Return the element with the specified offset
     *
     * @param mixed $offset     The offset to return
     * @return mixed
     */
    public function get($offset)
    {
        throw new Doctrine_Exception('Get is not supported for ' . get_class($this));
    }

    /**
     * Set the offset to the value
     *
     * @param mixed $offset The offset to set
     * @param mixed $value The value to set the offset to
     *
     */
    public function set($offset, $value)
    {
        throw new Doctrine_Exception('Set is not supported for ' . get_class($this));
    }

    /**
     * Check if the specified offset exists 
     * 
     * @param mixed $offset The offset to check
     * @return boolean True if exists otherwise false
     */
    public function contains($offset)
    {
        throw new Doctrine_Exception('Contains is not supported for ' . get_class($this));
    }

    /**
     * Add the value  
     * 
     * @param mixed $value The value to add 
     * @return void
     */
    public function add($value)
    {
        throw new Doctrine_Exception('Add is not supported for ' . get_class($this));
    }
}
