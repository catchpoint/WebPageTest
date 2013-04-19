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
 * Base abstract class for defining templates which are the base of all behaviors that can be attached
 * to your Doctrine models
 *
 * @package     Doctrine
 * @subpackage  Template
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision$
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
abstract class Doctrine_Template extends Doctrine_Record_Abstract
{
    /**
     * @var Doctrine_Record $_invoker     the record that invoked the last delegated call
     */
    protected $_invoker;

    /**
     * @var Doctrine_Record_Generator $_plugin
     */
    protected $_plugin;

    /**
     * @var array $_options Template options
     */
    protected $_options = array();

    /**
     * __construct
     *
     * @param string $array 
     * @return void
     */
    public function __construct(array $options = array())
    {
        $this->_options = Doctrine_Lib::arrayDeepMerge($this->_options, $options);
    }

    /**
     * Set the table object that this Template belongs to
     *
     * @var Doctrine_Table $table        the table object this Template belongs to
     */
    public function setTable(Doctrine_Table $table)
    {
        $this->_table = $table;
    }

    /**
     * returns the associated table object
     *
     * @return Doctrine_Table               the associated table object
     */
    public function getTable()
    {
        return $this->_table;
    }

    /**
     * sets the last used invoker
     *
     * @param Doctrine_Record $invoker      the record that invoked the last delegated call
     * @return Doctrine_Template            this object
     */
    public function setInvoker(Doctrine_Record_Abstract $invoker)
    {
        $this->_invoker = $invoker;
    }

    /**
     * returns the last used invoker
     *
     * @return Doctrine_Record              the record that invoked the last delegated call
     */
    public function getInvoker()
    {
        return $this->_invoker;
    }

    /**
     * Adds a plugin as a child to this plugin
     * 
     * @param Doctrine_Template $template 
     * @return Doctrine_Template. Chainable.
     */
    public function addChild(Doctrine_Template $template)
    {
        $this->_plugin->addChild($template);
        
        return $this;
    }

    /**
     * Get plugin instance 
     * 
     * @return void
     */
    public function getPlugin()
    {
        return $this->_plugin;
    }

    /**
     * Check if this template has a generator plugin
     *
     * @return boolean
     */
    public function hasPlugin()
    {
        return isset($this->_plugin) ? true : false;
    }

    /**
     * getOptions
     * returns all options of this template and the associated values
     *
     * @return array    all options and their values
     */
    public function getOptions()
    {
        return $this->_options;
    }

    /**
     * getOption
     * returns the value of given option
     *
     * @param string $name   the name of the option
     * @param mixed $default default value if option is not found
     * @return mixed         the value of given option
     */
    public function getOption($name, $default = null)
    {
        if (isset($this->_options[$name])) {
            return $this->_options[$name];
        }
        return $default;
    }

    /**
     * get 
     * 
     * @param mixed $name 
     * @return void
     */
    public function get($name) 
    {
        throw new Doctrine_Exception("Templates doesn't support accessors.");
    }

    /**
     * set 
     * 
     * @param mixed $name 
     * @param mixed $value 
     * @return void
     */
    public function set($name, $value)
    {
        throw new Doctrine_Exception("Templates doesn't support accessors.");
    }

    /**
     * Blank method for template setup 
     * 
     * @return void
     */
    public function setUp()
    {

    }

    /**
     * Blank method for template table definition
     * 
     * @return void
     */
    public function setTableDefinition()
    {

    }
}