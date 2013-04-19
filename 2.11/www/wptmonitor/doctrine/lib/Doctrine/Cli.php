<?php
/*
 *  $Id: Cli.php 2761 2007-10-07 23:42:29Z zYne $
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
 * Command line interface class
 * 
 * Interface for easily executing Doctrine_Task classes from a command line interface
 *
 * @package     Doctrine
 * @subpackage  Cli
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 2761 $
 * @author      Jonathan H. Wage <jwage@mac.com>
 */
class Doctrine_Cli
{
    /**
     * The name of the Doctrine Task base class
     * 
     * @var string
     */
    const TASK_BASE_CLASS = 'Doctrine_Task';

    /**
     * @var string
     */
    protected $_scriptName   = null;

    /**
     * @var array
     */
    private $_config;

    /**
     * @var object Doctrine_Cli_Formatter
     */
    private $_formatter;

    /**
     * An array, keyed on class name, containing task instances
     * 
     * @var array
     */
    private $_registeredTask = array();

    /**
     * @var object Doctrine_Task
     */
    private $_taskInstance;

    /**
     * __construct
     *
     * @param array [$config=array()]
     * @param object|null [$formatter=null] Doctrine_Cli_Formatter
     */
    public function __construct(array $config = array(), Doctrine_Cli_Formatter $formatter = null)
    {
        $this->setConfig($config);
        $this->setFormatter($formatter ? $formatter : new Doctrine_Cli_AnsiColorFormatter());
        $this->includeAndRegisterTaskClasses();
    }

    /**
     * @param array $config
     */
    public function setConfig(array $config)
    {
        $this->_config = $config;
    }

    /**
     * @return array
     */
    public function getConfig()
    {
        return $this->_config;
    }

    /**
     * @param object $formatter Doctrine_Cli_Formatter
     */
    public function setFormatter(Doctrine_Cli_Formatter $formatter)
    {
        $this->_formatter = $formatter;
    }

    /**
     * @return object Doctrine_Cli_Formatter
     */
    public function getFormatter()
    {
        return $this->_formatter;
    }

    /**
     * Returns the specified value from the config, or the default value, if specified
     * 
     * @param string $name
     * @return mixed
     * @throws OutOfBoundsException If the element does not exist in the config
     */
    public function getConfigValue($name/*, $defaultValue*/)
    {
        if (! isset($this->_config[$name])) {
            if (func_num_args() > 1) {
                return func_get_arg(1);
            }

            throw new OutOfBoundsException("The element \"{$name}\" does not exist in the config");
        }

        return $this->_config[$name];
    }

    /**
     * Returns TRUE if the element in the config has the specified value, or FALSE otherwise
     * 
     * If $value is not passed, this method will return TRUE if the specified element has _any_ value, or FALSE if the
     * element is not set
     * 
     * For strict checking, set $strict to TRUE - the default is FALSE
     * 
     * @param string $name
     * @param mixed [$value=null]
     * @param bool [$strict=false]
     * @return bool
     */
    public function hasConfigValue($name, $value = null, $strict = false)
    {
        if (isset($this->_config[$name])) {
            if (func_num_args() < 2) {
                return true;
            }

            if ($strict) {
                return $this->_config[$name] === $value;
            }

            return $this->_config[$name] == $value;
        }

        return false;
    }

    /**
     * Sets the array of registered tasks
     * 
     * @param array $registeredTask
     */
    public function setRegisteredTasks(array $registeredTask)
    {
        $this->_registeredTask = $registeredTask;
    }

    /**
     * Returns an array containing the registered tasks
     * 
     * @return array
     */
    public function getRegisteredTasks()
    {
        return $this->_registeredTask;
    }

    /**
     * Returns TRUE if the specified Task-class is registered, or FALSE otherwise
     * 
     * @param string $className
     * @return bool
     */
    public function taskClassIsRegistered($className)
    {
        return isset($this->_registeredTask[$className]);
    }

    /**
     * Returns TRUE if a task with the specified name is registered, or FALSE otherwise
     * 
     * If a matching task is found, $className is set with the name of the implementing class
     * 
     * @param string $taskName
     * @param string|null [&$className=null]
     * @return bool
     */
    public function taskNameIsRegistered($taskName, &$className = null)
    {
        foreach ($this->getRegisteredTasks() as $currClassName => $task) {
            if ($task->getTaskName() == $taskName) {
                $className = $currClassName;
                return true;
            }
        }

        return false;
    }

    /**
     * @param object $task Doctrine_Task
     */
    public function setTaskInstance(Doctrine_Task $task)
    {
        $this->_taskInstance = $task;
    }

    /**
     * @return object Doctrine_Task
     */
    public function getTaskInstance()
    {
        return $this->_taskInstance;
    }

    /**
     * Called by the constructor, this method includes and registers Doctrine core Tasks and then registers all other
     * loaded Task classes
     * 
     * The second round of registering will pick-up loaded custom Tasks.  Methods are provided that will allow users to
     * register Tasks loaded after creating an instance of Doctrine_Cli.
     */
    protected function includeAndRegisterTaskClasses()
    {
        $this->includeAndRegisterDoctrineTaskClasses();

        //Always autoregister custom tasks _unless_ we've been explicitly asked not to
        if ($this->getConfigValue('autoregister_custom_tasks', true)) {
            $this->registerIncludedTaskClasses();
        }
    }

    /**
     * Includes and registers Doctrine-style tasks from the specified directory / directories
     * 
     * If no directory is given it looks in the default Doctrine/Task folder for the core tasks
     * 
     * @param mixed [$directories=null] Can be a string path or array of paths
     */
    protected function includeAndRegisterDoctrineTaskClasses($directories = null)
    {
        if (is_null($directories)) {
            $directories = Doctrine_Core::getPath() . DIRECTORY_SEPARATOR . 'Doctrine' . DIRECTORY_SEPARATOR . 'Task';
        }

        foreach ((array) $directories as $directory) {
            foreach ($this->includeDoctrineTaskClasses($directory) as $className) {
                $this->registerTaskClass($className);
            }
        }
    }

    /**
     * Attempts to include Doctrine-style Task-classes from the specified directory - and nothing more besides
     * 
     * Returns an array containing the names of Task classes included
     * 
     * This method effectively makes two assumptions:
     * - The directory contains only _Task_ class-files
     * - The class files, and the class in each, follow the Doctrine naming conventions
     * 
     * This means that a file called "Foo.php", say, will be expected to contain a Task class called
     * "Doctrine_Task_Foo".  Hence the method's name, "include*Doctrine*TaskClasses".
     * 
     * @param string $directory
     * @return array $taskClassesIncluded
     * @throws InvalidArgumentException If the directory does not exist
     */
    protected function includeDoctrineTaskClasses($directory)
    {
        if (! is_dir($directory)) {
            throw new InvalidArgumentException("The directory \"{$directory}\" does not exist");
        }

        $taskClassesIncluded = array();

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($iterator as $file) {
            $baseName = $file->getFileName();

            /*
             * Class-files must start with an uppercase letter.  This additional check will help prevent us
             * accidentally running 'executable' scripts that may be mixed-in with the class files.
             */
            $matched = (bool) preg_match('/^([A-Z].*?)\.php$/', $baseName, $matches);

            if ( ! ($matched && (strpos($baseName, '.inc') === false))) {
                continue;
            }

            $expectedClassName = self::TASK_BASE_CLASS . '_' . $matches[1];

            if ( ! class_exists($expectedClassName)) {
                require_once($file->getPathName());
            }

            //So was the expected class included, and is it a task?  If so, we'll let the calling function know.
            if (class_exists($expectedClassName, false) && $this->classIsTask($expectedClassName)) {
                $taskClassesIncluded[] = $expectedClassName;
            }
        }

        return $taskClassesIncluded;
    }

    /**
     * Registers the specified _included_ task-class
     * 
     * @param string $className
     * @throws InvalidArgumentException If the class does not exist or the task-name is blank
     * @throws DomainException If the class is not a Doctrine Task
     */
    public function registerTaskClass($className)
    {
        //Simply ignore registered classes
        if ($this->taskClassIsRegistered($className)) {
            return;
        }

        if ( ! class_exists($className/*, false*/)) {
            throw new InvalidArgumentException("The task class \"{$className}\" does not exist");
        }

        if ( ! $this->classIsTask($className)) {
            throw new DomainException("The class \"{$className}\" is not a Doctrine Task");
        }

        $this->_registeredTask[$className] = $this->createTaskInstance($className, $this);
    }

    /**
     * Returns TRUE if the specified class is a Task, or FALSE otherwise
     * 
     * @param string $className
     * @return bool
     */
    protected function classIsTask($className)
    {
        $reflectionClass = new ReflectionClass($className);
        return (bool) $reflectionClass->isSubClassOf(self::TASK_BASE_CLASS);
    }

    /**
     * Creates, and returns, a new instance of the specified Task class
     * 
     * Displays a message, and returns FALSE, if there were problems instantiating the class
     * 
     * @param string $className
     * @param object $cli Doctrine_Cli
     * @return object Doctrine_Task
     */
    protected function createTaskInstance($className, Doctrine_Cli $cli)
    {
        return new $className($cli);
    }

    /**
     * Registers all loaded classes - by default - or the specified loaded Task classes
     * 
     * This method will skip registered task classes, so it can be safely called many times over
     */
    public function registerIncludedTaskClasses()
    {
        foreach (get_declared_classes() as $className) {
            if ($this->classIsTask($className)) {
                $this->registerTaskClass($className);
            }
        }
    }

    /**
     * Notify the formatter of a message
     *
     * @param string $notification  The notification message
     * @param string $style         Style to format the notification with(INFO, ERROR)
     * @return void
     */
    public function notify($notification = null, $style = 'HEADER')
    {
        $formatter = $this->getFormatter();

        echo(
            $formatter->format($this->getTaskInstance()->getTaskName(), 'INFO') . ' - ' .
            $formatter->format($notification, $style) . "\n"
        );
    }

    /**
     * Formats, and then returns, the message in the specified exception
     *
     * @param  Exception $exception
     * @return string
     */
    protected function formatExceptionMessage(Exception $exception)
    {
        $message = $exception->getMessage();

        if (Doctrine_Core::debug()) {
            $message .= "\n" . $exception->getTraceAsString();
        }

        return $this->getFormatter()->format($message, 'ERROR') . "\n";
    }

    /**
     * Notify the formatter of an exception
     * 
     * N.B. This should really only be called by Doctrine_Cli::run().  Exceptions should be thrown when errors occur:
     * it's up to Doctrine_Cli::run() to determine how those exceptions are reported.
     *
     * @param  Exception $exception
     * @return void
     */
    protected function notifyException(Exception $exception)
    {
        echo $this->formatExceptionMessage($exception);
    }

    /**
     * Public function to run the loaded task with the passed arguments
     *
     * @param  array $args
     * @return void
     * @throws Doctrine_Cli_Exception
     * @todo Should know more about what we're attempting to run so feedback can be improved. Continue refactoring.
     */
    public function run(array $args)
    {
        try {
            $this->_run($args);
        } catch (Exception $exception) {
            //Do not rethrow exceptions by default
            if ($this->getConfigValue('rethrow_exceptions', false)) {
                throw new $exception($this->formatExceptionMessage($exception));
            }

            $this->notifyException($exception);

            //User error
            if ($exception instanceof Doctrine_Cli_Exception) {
                $this->printTasks();
            }
        }
    }

    /**
     * Run the actual task execution with the passed arguments
     *
     * @param  array $args Array of arguments for this task being executed
     * @return void
     * @throws Doctrine_Cli_Exception If the requested task has not been registered or if required arguments are missing
     * @todo Continue refactoring for testing
     */
    protected function _run(array $args)
    {        
        $this->_scriptName = $args[0];
        
        $requestedTaskName = isset($args[1]) ? $args[1] : null;
        
        if ( ! $requestedTaskName || $requestedTaskName == 'help') {
            $this->printTasks(null, $requestedTaskName == 'help' ? true : false);
            return;
        }
        
        if ($requestedTaskName && isset($args[2]) && $args[2] === 'help') {
            $this->printTasks($requestedTaskName, true);
            return;
        }

        if (! $this->taskNameIsRegistered($requestedTaskName, $taskClassName)) {
            throw new Doctrine_Cli_Exception("The task \"{$requestedTaskName}\" has not been registered");
        }

        $taskInstance = $this->createTaskInstance($taskClassName, $this);
        $this->setTaskInstance($taskInstance);
        $this->executeTask($taskInstance, $this->prepareArgs(array_slice($args, 2)));
    }

    /**
     * Executes the task with the specified _prepared_ arguments
     * 
     * @param object $task Doctrine_Task
     * @param array $preparedArguments
     * @throws Doctrine_Cli_Exception If required arguments are missing
     */
    protected function executeTask(Doctrine_Task $task, array $preparedArguments)
    {
        $task->setArguments($preparedArguments);

        if (! $task->validate()) {
            throw new Doctrine_Cli_Exception('Required arguments missing');
        }

        $task->execute();
    }

    /**
     * Prepare the raw arguments for execution. Combines with the required and optional argument
     * list in order to determine a complete array of arguments for the task
     *
     * @param  array $args      Array of raw arguments
     * @return array $prepared  Array of prepared arguments
     * @todo Continue refactoring for testing
     */
    protected function prepareArgs(array $args)
    {
        $taskInstance = $this->getTaskInstance();
        
        $args = array_values($args);
        
        // First lets load populate an array with all the possible arguments. required and optional
        $prepared = array();
        
        $requiredArguments = $taskInstance->getRequiredArguments();
        foreach ($requiredArguments as $key => $arg) {
            $prepared[$arg] = null;
        }
        
        $optionalArguments = $taskInstance->getOptionalArguments();
        foreach ($optionalArguments as $key => $arg) {
            $prepared[$arg] = null;
        }
        
        // If we have a config array then lets try and fill some of the arguments with the config values
        foreach ($this->getConfig() as $key => $value) {
            if (array_key_exists($key, $prepared)) {
                $prepared[$key] = $value;
            }
        }
        
        // Now lets fill in the entered arguments to the prepared array
        $copy = $args;
        foreach ($prepared as $key => $value) {
            if ( ! $value && !empty($copy)) {
                $prepared[$key] = $copy[0];
                unset($copy[0]);
                $copy = array_values($copy);
            }
        }
        
        return $prepared;
    }

    /**
     * Prints an index of all the available tasks in the CLI instance
     * 
     * @param string|null [$taskName=null]
     * @param bool [$full=false]
     * @todo Continue refactoring for testing
     */
    public function printTasks($taskName = null, $full = false)
    {
        $formatter = $this->getFormatter();
        $config = $this->getConfig();

        $taskIndex = $formatter->format('Doctrine Command Line Interface', 'HEADER') . "\n\n";

        foreach ($this->getRegisteredTasks() as $task) {
            if ($taskName && (strtolower($taskName) != strtolower($task->getTaskName()))) {
                continue;
            }

            $taskIndex .= $formatter->format($this->_scriptName . ' ' . $task->getTaskName(), 'INFO');

            if ($full) {
                $taskIndex .= ' - ' . $task->getDescription() . "\n";

                $args = '';
                $args .= $this->assembleArgumentList($task->getRequiredArgumentsDescriptions(), $config, $formatter);
                $args .= $this->assembleArgumentList($task->getOptionalArgumentsDescriptions(), $config, $formatter);

                if ($args) {
                    $taskIndex .= "\n" . $formatter->format('Arguments:', 'HEADER') . "\n" . $args;
                }
            }
            
            $taskIndex .= "\n";
        }

        echo $taskIndex;
    }

    /**
     * @param array $argumentsDescriptions
     * @param array $config
     * @param object $formatter Doctrine_Cli_Formatter
     * @return string
     */
    protected function assembleArgumentList(array $argumentsDescriptions, array $config, Doctrine_Cli_Formatter $formatter)
    {
        $argumentList = '';

        foreach ($argumentsDescriptions as $name => $description) {
            $argumentList .= $formatter->format($name, 'ERROR') . ' - ';
            
            if (isset($config[$name])) {
                $argumentList .= $formatter->format($config[$name], 'COMMENT');
            } else {
                $argumentList .= $description;
            }

            $argumentList .= "\n";
        }

        return $argumentList;
    }

    /**
     * Used by Doctrine_Cli::loadTasks() and Doctrine_Cli::getLoadedTasks() to re-create their pre-refactoring behaviour
     * 
     * @ignore
     * @param array $registeredTask
     * @return array
     */
    private function createOldStyleTaskList(array $registeredTask)
    {
        $taskNames = array();

        foreach ($registeredTask as $className => $task) {
            $taskName = $task->getTaskName();
            $taskNames[$taskName] = $taskName;
        }

        return $taskNames;
    }

    /**
     * Old method retained for backwards compatibility
     * 
     * @deprecated
     */
    public function loadTasks($directory = null)
    {
        $this->includeAndRegisterDoctrineTaskClasses($directory);
        return $this->createOldStyleTaskList($this->getRegisteredTasks());
    }

    /**
     * Old method retained for backwards compatibility
     * 
     * @deprecated
     */
    protected function _getTaskClassFromArgs(array $args)
    {
        return self::TASK_BASE_CLASS . '_' . Doctrine_Inflector::classify(str_replace('-', '_', $args[1]));
    }

    /**
     * Old method retained for backwards compatibility
     * 
     * @deprecated
     */
    public function getLoadedTasks()
    {
        return $this->createOldStyleTaskList($this->getRegisteredTasks());
    }
}