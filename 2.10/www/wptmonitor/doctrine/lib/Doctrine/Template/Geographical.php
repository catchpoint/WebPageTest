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
 * Easily add longitude and latitude columns to your records and use inherited functionality for 
 * calculating distances
 *
 * @package     Doctrine
 * @subpackage  Template
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision$
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Jonathan H. Wage <jonwage@gmail.com>
 */
class Doctrine_Template_Geographical extends Doctrine_Template
{
    /**
     * Array of geographical options
     *
     * @var string
     */
    protected $_options = array('latitude' =>  array('name'     =>  'latitude',
                                                     'type'     =>  'double',
                                                     'size'     =>  null,
                                                     'options'  =>  array()),
                                'longitude' => array('name'     =>  'longitude',
                                                     'type'     =>  'double',
                                                     'size'     =>  null,
                                                     'options'  =>  array()));

    /**
     * Set table definition for Geographical behavior
     *
     * @return void
     */
    public function setTableDefinition()
    {
        $this->hasColumn($this->_options['latitude']['name'], $this->_options['latitude']['type'], $this->_options['latitude']['size'], $this->_options['latitude']['options']);
        $this->hasColumn($this->_options['longitude']['name'], $this->_options['longitude']['type'], $this->_options['longitude']['size'], $this->_options['longitude']['options']);
    }

    /**
     * Initiate and get a distance query with the select parts for the number of kilometers and miles 
     * between this record and other zipcode records in the database
     *
     * @return Doctrine_Query $query
     */
    public function getDistanceQuery()
    {
        $invoker = $this->getInvoker();
        $query = $invoker->getTable()->createQuery();

        $rootAlias = $query->getRootAlias();
        $latName = $this->_options['latitude']['name'];
        $longName = $this->_options['longitude']['name'];

        $query->addSelect($rootAlias . '.*');

        $sql = "((ACOS(SIN(%s * PI() / 180) * SIN(" . $rootAlias . "." . $latName . " * PI() / 180) + COS(%s * PI() / 180) * COS(" . $rootAlias . "." . $latName . " * PI() / 180) * COS((%s - " . $rootAlias . "." . $longName . ") * PI() / 180)) * 180 / PI()) * 60 * %s) as %s";

        $milesSql = sprintf($sql, $invoker->get($latName), $invoker->get($latName), $invoker->get($longName), '1.1515', 'miles');
        $query->addSelect($milesSql);

        $kilometersSql = sprintf($sql, $invoker->get($latName), $invoker->get($latName), $invoker->get($longName), '1.1515 * 1.609344', 'kilometers');
        $query->addSelect($kilometersSql);

        return $query;
    }

    /**
     * Get distance between this record and another
     *
     * @param string $Doctrine_Record 
     * @param string $kilometers 
     * @return integer
     */
    public function getDistance(Doctrine_Record $record, $kilometers = false)
    {
        $query = $this->getDistanceQuery($kilometers);
        
        $conditions = array();
        $values = array();
        foreach ((array) $record->getTable()->getIdentifier() as $id) {
            $conditions[] = $query->getRootAlias() . '.' . $id . ' = ?';
            $values[] = $record->get($id);
        }

        $where = implode(' AND ', $conditions);

        $query->addWhere($where, $values);

        $query->limit(1);

        $result = $query->execute()->getFirst();
        
        if (isset($result['kilometers']) && $result['miles']) {
            return $kilometers ? $result->get('kilometers'):$result->get('miles');
        } else {
            return 0;
        }
    }
}