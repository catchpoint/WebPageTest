<?php
/*
 *  $Id: Task.php 2761 2007-10-07 23:42:29Z zYne $
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
 * Doctrine_Task
 * 
 * Abstract class used for writing Doctrine Tasks
 *
 * @package     Doctrine
 * @subpackage  Task
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 2761 $
 * @author      Jonathan H. Wage <jwage@mac.com>
 */
abstract class Doctrine_Task
{
    public $dispatcher           =   null,
           $taskName             =   null,  /*Treat as protected*/
           $description          =   null,
           $arguments            =   array(),
           $requiredArguments    =   array(),
           $optionalArguments    =   array();

    /**
     * __construct
     *
     * Since this is an abstract classes that extend this must follow a patter of Doctrine_Task_{TASK_NAME}
     * This is what determines the task name for executing it.
     *
     * @return void
     */
    public function __construct($dispatcher = null)
    {
        $this->dispatcher = $dispatcher;

        $taskName = $this->getTaskName();

        //Derive the task name only if it wasn't entered at design-time
        if (! strlen($taskName)) {
            $taskName = self::deriveTaskName(get_class($this));
        }

        /*
         * All task names must be passed through Doctrine_Task::setTaskName() to make sure they're valid.  We're most
         * interested in validating manually-entered task names, which are as good as arguments.
         */
        $this->setTaskName($taskName);
    }

    /**
     * Returns the name of the task the specified class _would_ implement
     * 
     * N.B. This method does not check if the specified class is actually a Doctrine Task
     * 
     * This is public so we can easily test its reactions to fully-qualified class names, without having to add
     * PHP 5.3-specific test code
     * 
     * @param string $className
     * @return string|bool
     */
    public static function deriveTaskName($className)
    {
        $nameParts = explode('\\', $className);

        foreach ($nameParts as &$namePart) {
            $prefix = __CLASS__ . '_';
            $baseName = strpos($namePart, $prefix) === 0 ? substr($namePart, strlen($prefix)) : $namePart;
            $namePart = str_replace('_', '-', Doctrine_Inflector::tableize($baseName));
        }

        return implode('-', $nameParts);
    }

    /**
     * notify
     *
     * @param string $notification 
     * @return void
     */
    public function notify($notification = null)
    {
        if (is_object($this->dispatcher) && method_exists($this->dispatcher, 'notify')) {
            $args = func_get_args();
            
            return call_user_func_array(array($this->dispatcher, 'notify'), $args);
        } else if ( $notification !== null ) {
            return $notification;
        } else {
            return false;
        }
    }

    /**
     * ask
     *
     * @return void
     */
    public function ask()
    {
        $args = func_get_args();
        
        call_user_func_array(array($this, 'notify'), $args);
        
        $answer = strtolower(trim(fgets(STDIN)));
        
        return $answer;
    }

    /**
     * execute
     *
     * Override with each task class
     *
     * @return void
     * @abstract
     */
    abstract function execute();

    /**
     * validate
     *
     * Validates that all required fields are present
     *
     * @return bool true
     */
    public function validate()
    {
        $requiredArguments = $this->getRequiredArguments();
        
        foreach ($requiredArguments as $arg) {
            if ( ! isset($this->arguments[$arg])) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * addArgument
     *
     * @param string $name 
     * @param string $value 
     * @return void
     */
    public function addArgument($name, $value)
    {
        $this->arguments[$name] = $value;
    }

    /**
     * getArgument
     *
     * @param string $name 
     * @param string $default 
     * @return mixed
     */
    public function getArgument($name, $default = null)
    {
        if (isset($this->arguments[$name]) && $this->arguments[$name] !== null) {
            return $this->arguments[$name];
        } else {
            return $default;
        }
    }

    /**
     * getArguments
     *
     * @return array $arguments
     */
    public function getArguments()
    {
        return $this->arguments;
    }

    /**
     * setArguments
     *
     * @param array $args 
     * @return void
     */
    public function setArguments(array $args)
    {
        $this->arguments = $args;
    }

    /**
     * Returns TRUE if the specified task name is valid, or FALSE otherwise
     * 
     * @param string $taskName
     * @return bool
     */
    protected static function validateTaskName($taskName)
    {
        /*
         * This follows the _apparent_ naming convention.  The key thing is to prevent the use of characters that would
         * break a command string - we definitely can't allow spaces, for example.
         */
        return (bool) preg_match('/^[a-z0-9][a-z0-9\-]*$/', $taskName);
    }

    /**
     * Sets the name of the task, the name that's used to invoke it through a CLI
     *
     * @param string $taskName
     * @throws InvalidArgumentException If the task name is invalid
     */
    protected function setTaskName($taskName)
    {
        if (! self::validateTaskName($taskName)) {
            throw new InvalidArgumentException(
                sprintf('The task name "%s", in %s, is invalid', $taskName, get_class($this))
            );
        }

        $this->taskName = $taskName;
    }

    /**
     * getTaskName
     *
     * @return string $taskName
     */
    public function getTaskName()
    {
        return $this->taskName;
    }

    /**
     * getDescription
     *
     * @return string $description
     */
    public function getDescription()
    {
        return $this->description;
    }

    /**
     * getRequiredArguments
     *
     * @return array $requiredArguments
     */
    public function getRequiredArguments()
    {
        return array_keys($this->requiredArguments);
    }

    /**
     * getOptionalArguments
     *
     * @return array $optionalArguments
     */
    public function getOptionalArguments()
    {
        return array_keys($this->optionalArguments);
    }

    /**
     * getRequiredArgumentsDescriptions
     *
     * @return array $requiredArgumentsDescriptions
     */
    public function getRequiredArgumentsDescriptions()
    {
        return $this->requiredArguments;
    }

    /**
     * getOptionalArgumentsDescriptions
     *
     * @return array $optionalArgumentsDescriptions
     */
    public function getOptionalArgumentsDescriptions()
    {
        return $this->optionalArguments;
    }
}