<?php
/*
 *  $Id: Hydrate.php 3192 2007-11-19 17:55:23Z romanb $
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
 * Its purpose is to populate object graphs.
 *
 *
 * @package     Doctrine
 * @subpackage  Hydrate
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 3192 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      Jonathan H. Wage <jonwage@gmail.com>
 */
class Doctrine_Hydrator
{
    protected static
        $_totalHydrationTime = 0;

    protected
        $_hydrators,
        $_rootAlias = null,
        $_hydrationMode = Doctrine_Core::HYDRATE_RECORD,
        $_queryComponents = array();

    public function __construct()
    {
        $this->_hydrators = Doctrine_Manager::getInstance()->getHydrators();
    }

    /**
     * Set the hydration mode
     *
     * @param mixed $hydrationMode  One of the Doctrine_Core::HYDRATE_* constants or 
     *                              a string representing the name of the hydration mode
     */
    public function setHydrationMode($hydrationMode)
    {
        $this->_hydrationMode = $hydrationMode;
    }

    /**
     * Get the hydration mode
     *
     * @return mixed $hydrationMode One of the Doctrine_Core::HYDRATE_* constants
     */
    public function getHydrationMode()
    {
        return $this->_hydrationMode;
    }

    /**
     * Set the array of query components
     *
     * @param array $queryComponents
     */
    public function setQueryComponents(array $queryComponents)
    {
        $this->_queryComponents = $queryComponents;
    }

    /**
     * Get the array of query components
     *
     * @return array $queryComponents
     */
    public function getQueryComponents()
    {
        return $this->_queryComponents;
    }

    /**
     * Get the name of the driver class for the passed hydration mode
     *
     * @param string $mode
     * @return string $className
     */
    public function getHydratorDriverClassName($mode = null)
    {
        if ($mode === null) {
            $mode = $this->_hydrationMode;
        }

        if ( ! isset($this->_hydrators[$mode])) {
            throw new Doctrine_Hydrator_Exception('Invalid hydration mode specified: '.$this->_hydrationMode);
        }

        return $this->_hydrators[$mode];
    }

    /**
     * Get an instance of the hydration driver for the passed hydration mode
     *
     * @param string $mode 
     * @param array $tableAliases 
     * @return object Doctrine_Hydrator_Abstract
     */
    public function getHydratorDriver($mode, $tableAliases)
    {
        $driverClass = $this->getHydratorDriverClassName($mode);
        $driver = new $driverClass($this->_queryComponents, $tableAliases, $mode);

        return $driver;
    }

    /**
     * Hydrate the query statement in to its final data structure by one of the
     * hydration drivers.
     *
     * @param object $stmt 
     * @param array $tableAliases 
     * @return mixed $result
     */
    public function hydrateResultSet($stmt, $tableAliases)
    {
        $driver = $this->getHydratorDriver($this->_hydrationMode, $tableAliases);
        $result = $driver->hydrateResultSet($stmt);

        return $result;
    }
}