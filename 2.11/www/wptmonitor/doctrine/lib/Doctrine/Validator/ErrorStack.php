<?php
/*
 *  $Id: ErrorStack.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Validator_ErrorStack
 *
 * @package     Doctrine
 * @subpackage  Validator
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Roman Borschel <roman@code-factory.org>
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 */
class Doctrine_Validator_ErrorStack extends Doctrine_Access implements Countable, IteratorAggregate
{
    /**
     * The errors of the error stack.
     *
     * @var array
     */
    protected $_errors = array();

    /**
     * Array of validators that failed
     *
     * @var array
     */
    protected $_validators = array();

    /**
     * Get model class name for the error stack
     *
     * @var string
     */
    protected $_className;

    /**
     * Constructor
     *
     */
    public function __construct($className)
    {
        $this->_className = $className;
    }

    /**
     * Adds an error to the stack.
     *
     * @param string $invalidFieldName
     * @param string $errorType
     */
    public function add($invalidFieldName, $errorCode = 'general')
    {
        if (is_object($errorCode)) {
            if ( ! ($errorCode instanceof Doctrine_Validator_Driver)) {
                throw new Doctrine_Exception('Validators must be an instance of Doctrine_Validator_Driver');
            }
            $validator = $errorCode;
            $this->_validators[$invalidFieldName][] = $validator;
            $errorCode = (string) $validator;
        }

        $this->_errors[$invalidFieldName][] = $errorCode;
    }

    /**
     * Removes all existing errors for the specified field from the stack.
     *
     * @param string $fieldName
     */
    public function remove($fieldName)
    {
        if (isset($this->_errors[$fieldName])) {
            unset($this->_errors[$fieldName]);
            if (isset($this->_validators[$fieldName])) {
                unset($this->_validators[$fieldName]);
            }
        }
    }

    /**
     * Get errors for field
     *
     * @param string $fieldName
     * @return mixed
     */
    public function get($fieldName)
    {
        return isset($this->_errors[$fieldName]) ? $this->_errors[$fieldName] : null;
    }

    /**
     * Alias for add()
     *
     * @param string $fieldName
     * @param string $errorCode
     * @return void
     */
    public function set($fieldName, $errorCode)
    {
        $this->add($fieldName, $errorCode);
    }

    /**
     * Check if a field has an error
     *
     * @param string $fieldName
     * @return boolean
     */
    public function contains($fieldName)
    {
        return array_key_exists($fieldName, $this->_errors);
    }

    /**
     * Removes all errors from the stack.
     *
     * @return void
     */
    public function clear()
    {
        $this->_errors = array();
        $this->_validators = array();
    }

    /**
     * Enter description here...
     *
     * @return unknown
     */
    public function getIterator()
    {
        return new ArrayIterator($this->_errors);
    }

    public function toArray()
    {
        return $this->_errors;
    }

    /**
     * Count the number of errors
     *
     * @return integer
     */
    public function count()
    {
        return count($this->_errors);
    }

    /**
     * Get the classname where the errors occured
     *
     * @return string
     */
    public function getClassname()
    {
        return $this->_className;
    }

    /**
     * Get array of failed validators
     *
     * @return array
     */
    public function getValidators()
    {
        return $this->_validators;
    }
}