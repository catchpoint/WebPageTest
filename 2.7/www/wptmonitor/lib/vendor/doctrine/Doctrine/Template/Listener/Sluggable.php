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
class Doctrine_Template_Listener_Sluggable extends Doctrine_Record_Listener
{
    /**
     * Array of sluggable options
     *
     * @var string
     */
    protected $_options = array();

    /**
     * __construct
     *
     * @param string $array
     * @return void
     */
    public function __construct(array $options)
    {
        $this->_options = $options;
    }

    /**
     * Set the slug value automatically when a record is inserted
     *
     * @param Doctrine_Event $event
     * @return void
     */
    public function preInsert(Doctrine_Event $event)
    {
        $record = $event->getInvoker();
        $name = $record->getTable()->getFieldName($this->_options['name']);

        if ( ! $record->$name) {
            $record->$name = $this->buildSlugFromFields($record);
        }
    }

    /**
     * Set the slug value automatically when a record is updated if the options are configured
     * to allow it
     *
     * @param Doctrine_Event $event
     * @return void
     */
    public function preUpdate(Doctrine_Event $event)
    {
        if (false !== $this->_options['unique']) {
            $record = $event->getInvoker();
            $name = $record->getTable()->getFieldName($this->_options['name']);

            if ( ! $record->$name || (
                false !== $this->_options['canUpdate'] &&
                ! array_key_exists($name, $record->getModified())
            )) {
                $record->$name = $this->buildSlugFromFields($record);
            } else if ( ! empty($record->$name) &&
                false !== $this->_options['canUpdate'] &&
                array_key_exists($name, $record->getModified()
            )) {
                $record->$name = $this->buildSlugFromSlugField($record);
            }
        }
    }

    /**
     * Generate the slug for a given Doctrine_Record based on the configured options
     *
     * @param Doctrine_Record $record
     * @return string $slug
     */
    protected function buildSlugFromFields($record)
    {
        if (empty($this->_options['fields'])) {
            if (is_callable($this->_options['provider'])) {
            	$value = call_user_func($this->_options['provider'], $record);
            } else if (method_exists($record, 'getUniqueSlug')) {
                $value = $record->getUniqueSlug($record);
            } else {
                $value = (string) $record;
            }
        } else {
            $value = '';
            foreach ($this->_options['fields'] as $field) {
                $value .= $record->$field . ' ';
            }
            $value = substr($value, 0, -1);
        }

    	if ($this->_options['unique'] === true) {
    		return $this->getUniqueSlug($record, $value);
    	}

        return call_user_func_array($this->_options['builder'], array($value, $record));
    }

    /**
     * Generate the slug for a given Doctrine_Record slug field
     *
     * @param Doctrine_Record $record
     * @return string $slug
     */
    protected function buildSlugFromSlugField($record)
    {
        $name = $record->getTable()->getFieldName($this->_options['name']);
        $value = $record->$name;

        if ($this->_options['unique'] === true) {
            return $this->getUniqueSlug($record, $value);
        }

        return call_user_func_array($this->_options['builder'], array($value, $record));
    }

    /**
     * Creates a unique slug for a given Doctrine_Record. This function enforces the uniqueness by
     * incrementing the values with a postfix if the slug is not unique
     *
     * @param Doctrine_Record $record
     * @param string $slugFromFields
     * @return string $slug
     */
    public function getUniqueSlug($record, $slugFromFields)
    {
        /* fix for use with Column Aggregation Inheritance */
        if ($record->getTable()->getOption('inheritanceMap')) {
          $parentTable = $record->getTable()->getOption('parents');
          $i = 0;
          // Be sure that you do not instanciate an abstract class;
          $reflectionClass = new ReflectionClass($parentTable[$i]);
          while ($reflectionClass->isAbstract()) {
            $i++;
            $reflectionClass = new ReflectionClass($parentTable[$i]);
          }
          $table = Doctrine::getTable($parentTable[$i]);
        } else {
          $table = $record->getTable();
        }

        $name = $table->getFieldName($this->_options['name']);
        $proposal =  call_user_func_array($this->_options['builder'], array($slugFromFields, $record));
        $slug = $proposal;

        $whereString = 'r.' . $name . ' LIKE ?';
        $whereParams = array($proposal.'%');

        if ($record->exists()) {
            $identifier = $record->identifier();
            $whereString .= ' AND r.' . implode(' != ? AND r.', $table->getIdentifierColumnNames()) . ' != ?';
            $whereParams = array_merge($whereParams, array_values($identifier));
        }

        foreach ($this->_options['uniqueBy'] as $uniqueBy) {
            if (is_null($record->$uniqueBy)) {
                $whereString .= ' AND r.'.$uniqueBy.' IS NULL';
            } else {
                $whereString .= ' AND r.'.$uniqueBy.' = ?';
                $value = $record->$uniqueBy;
                if ($value instanceof Doctrine_Record) {
                    $value = current((array) $value->identifier());
                }
                $whereParams[] =  $value;
            }
        }

        // Disable indexby to ensure we get all records
        $originalIndexBy = $table->getBoundQueryPart('indexBy');
        $table->bindQueryPart('indexBy', null);

        $query = $table->createQuery('r')
            ->select('r.' . $name)
            ->where($whereString , $whereParams)
            ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);

        // We need to introspect SoftDelete to check if we are not disabling unique records too
        if ($table->hasTemplate('Doctrine_Template_SoftDelete')) {
	        $softDelete = $table->getTemplate('Doctrine_Template_SoftDelete');

	        // we have to consider both situations here
            if ($softDelete->getOption('type') == 'boolean') {
                $conn = $query->getConnection();

                $query->addWhere(
                    '(r.' . $softDelete->getOption('name') . ' = ' . $conn->convertBooleans(true) .
                    ' OR r.' . $softDelete->getOption('name') . ' = ' . $conn->convertBooleans(false) . ')'
                );
            } else {
                $query->addWhere('(r.' . $softDelete->getOption('name') . ' IS NOT NULL OR r.' . $softDelete->getOption('name') . ' IS NULL)');
            }
        }

        $similarSlugResult = $query->execute();
        $query->free();

        // Change indexby back
        $table->bindQueryPart('indexBy', $originalIndexBy);

        $similarSlugs = array();
        foreach ($similarSlugResult as $key => $value) {
            $similarSlugs[$key] = strtolower($value[$name]);
        }

        $i = 1;
        while (in_array(strtolower($slug), $similarSlugs)) {
            $slug = call_user_func_array($this->_options['builder'], array($proposal.'-'.$i, $record));
            $i++;
        }

        // If slug is longer then the column length then we need to trim it
        // and try to generate a unique slug again
        $length = $table->getFieldLength($this->_options['name']);
        if (strlen($slug) > $length) {
            $slug = substr($slug, 0, $length - (strlen($i) + 1));
            $slug = $this->getUniqueSlug($record, $slug);
        }

        return  $slug;
    }
}