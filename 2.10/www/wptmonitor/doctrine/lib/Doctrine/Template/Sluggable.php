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
 * Doctrine_Template_Sluggable
 *
 * Easily create a slug for each record based on a specified set of fields
 *
 * @package     Doctrine
 * @subpackage  Template
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision$
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Template_Sluggable extends Doctrine_Template
{
    /**
     * Array of Sluggable options
     *
     * @var string
     */
    protected $_options = array(
        'name'          =>  'slug',
        'alias'         =>  null,
        'type'          =>  'string',
        'length'        =>  255,
        'unique'        =>  true,
        'options'       =>  array(),
        'fields'        =>  array(),
        'uniqueBy'      =>  array(),
        'uniqueIndex'   =>  true,
        'canUpdate'     =>  false,
        'builder'       =>  array('Doctrine_Inflector', 'urlize'),
        'provider'      =>  null,
        'indexName'     =>  null
    );

    /**
     * Set table definition for Sluggable behavior
     *
     * @return void
     */
    public function setTableDefinition()
    {
        $name = $this->_options['name'];
        if ($this->_options['alias']) {
            $name .= ' as ' . $this->_options['alias'];
        }
        if ($this->_options['indexName'] === null) {
            $this->_options['indexName'] = $this->getTable()->getTableName().'_sluggable';
        }
        $this->hasColumn($name, $this->_options['type'], $this->_options['length'], $this->_options['options']);
        
        if ($this->_options['unique'] == true && $this->_options['uniqueIndex'] == true) {
            $indexFields = array($this->_options['name']);
            $indexFields = array_merge($indexFields, $this->_options['uniqueBy']);
            $this->index($this->_options['indexName'], array('fields' => $indexFields,
                                                             'type' => 'unique'));
        }

        $this->addListener(new Doctrine_Template_Listener_Sluggable($this->_options));
    }
}