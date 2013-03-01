<?php
/*
 *  $Id: Diff.php 1080 2007-02-10 18:17:08Z jwage $
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
 * Doctrine_Migration_Diff - class used for generating differences and migration
 * classes from 'from' and 'to' schema information.
 *
 * @package     Doctrine
 * @subpackage  Migration
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 1080 $
 * @author      Jonathan H. Wage <jonwage@gmail.com>
 */
class Doctrine_Migration_Diff
{
    protected $_from,
              $_to,
              $_changes = array('created_tables'      =>  array(),
                                'dropped_tables'      =>  array(),
                                'created_foreign_keys'=>  array(),
                                'dropped_foreign_keys'=>  array(),
                                'created_columns'     =>  array(),
                                'dropped_columns'     =>  array(),
                                'changed_columns'     =>  array(),
                                'created_indexes'     =>  array(),
                                'dropped_indexes'     =>  array()),
              $_migration,
              $_startingModelFiles = array(),
              $_tmpPath;

    protected static $_toPrefix   = 'ToPrfx',
                     $_fromPrefix = 'FromPrfx';

    /**
     * Instantiate new Doctrine_Migration_Diff instance
     *
     * <code>
     * $diff = new Doctrine_Migration_Diff('/path/to/old_models', '/path/to/new_models', '/path/to/migrations');
     * $diff->generateMigrationClasses();
     * </code>
     *
     * @param string $from      The from schema information source
     * @param string $to        The to schema information source
     * @param mixed  $migration Instance of Doctrine_Migration or path to migration classes
     * @return void
     */
    public function __construct($from, $to, $migration)
    {
        $this->_from = $from;
        $this->_to = $to;
        $this->_startingModelFiles = Doctrine_Core::getLoadedModelFiles();
        $this->setTmpPath(sys_get_temp_dir() . DIRECTORY_SEPARATOR . getmypid());

        if ($migration instanceof Doctrine_Migration) {
            $this->_migration = $migration;
        } else if (is_dir($migration)) {
            $this->_migration = new Doctrine_Migration($migration);
        }
    }

    /**
     * Set the temporary path to store the generated models for generating diffs
     *
     * @param string $tmpPath
     * @return void
     */
    public function setTmpPath($tmpPath)
    {
        if ( ! is_dir($tmpPath)) {
            mkdir($tmpPath, 0777, true);
        }
        $this->_tmpPath = $tmpPath;
    }

    /**
     * Get unique hash id for this migration instance
     *
     * @return string $uniqueId
     */
    protected function getUniqueId()
    {
        return md5($this->_from . $this->_to);
    }

    /**
     * Generate an array of changes found between the from and to schema information.
     *
     * @return array $changes
     */
    public function generateChanges()
    {
        $this->_cleanup();

        $from = $this->_generateModels(self::$_fromPrefix, $this->_from);
        $to = $this->_generateModels(self::$_toPrefix, $this->_to);

        return $this->_diff($from, $to);
    }

    /**
     * Generate a migration class for the changes in this diff instance
     *
     * @return array $changes
     */
    public function generateMigrationClasses()
    {
        $builder = new Doctrine_Migration_Builder($this->_migration);

        return $builder->generateMigrationsFromDiff($this);
    }

    /**
     * Initialize some Doctrine models at a given path.
     *
     * @param string $path 
     * @return array $models
     */
    protected function _initializeModels($path)
    {
        $manager = Doctrine_Manager::getInstance();
        $modelLoading = $manager->getAttribute(Doctrine_Core::ATTR_MODEL_LOADING);
        if ($modelLoading === Doctrine_Core::MODEL_LOADING_PEAR) {
            $orig = Doctrine_Core::getModelsDirectory();
            Doctrine_Core::setModelsDirectory($path);
            $models = Doctrine_Core::initializeModels(Doctrine_Core::loadModels($path));
            Doctrine_Core::setModelsDirectory($orig);
        } else {
            $models = Doctrine_Core::initializeModels(Doctrine_Core::loadModels($path));
        }
        return $models;
    }

    /**
     * Generate a diff between the from and to schema information
     *
     * @param  string $from     Path to set of models to migrate from
     * @param  string $to       Path to set of models to migrate to
     * @return array  $changes
     */
    protected function _diff($from, $to)
    {
        // Load the from and to models
        $fromModels = $this->_initializeModels($from);
        $toModels = $this->_initializeModels($to);

        // Build schema information for the models
        $fromInfo = $this->_buildModelInformation($fromModels);
        $toInfo = $this->_buildModelInformation($toModels);

        // Build array of changes between the from and to information
        $changes = $this->_buildChanges($fromInfo, $toInfo);

        $this->_cleanup();

        return $changes;
    }

    /**
     * Build array of changes between the from and to array of schema information
     *
     * @param array $from  Array of schema information to generate changes from
     * @param array $to    Array of schema information to generate changes for
     * @return array $changes
     */
    protected function _buildChanges($from, $to)
    {
        // Loop over the to schema information and compare it to the from
        foreach ($to as $className => $info) {
            // If the from doesn't have this class then it is a new table
            if ( ! isset($from[$className])) {
                $names = array('type', 'charset', 'collate', 'indexes', 'foreignKeys', 'primary');
                $options = array();
                foreach ($names as $name) {
                    if (isset($info['options'][$name]) && $info['options'][$name]) {
                        $options[$name] = $info['options'][$name];
                    }
                }

                $table = array('tableName' => $info['tableName'],
                               'columns'   => $info['columns'],
                               'options'   => $options);
                $this->_changes['created_tables'][$info['tableName']] = $table;
            }
            // Check for new and changed columns
            foreach ($info['columns'] as $name => $column) {
                // If column doesn't exist in the from schema information then it is a new column
                if (isset($from[$className]) && ! isset($from[$className]['columns'][$name])) {
                    $this->_changes['created_columns'][$info['tableName']][$name] = $column;
                }
                // If column exists in the from schema information but is not the same then it is a changed column
                if (isset($from[$className]['columns'][$name]) && $from[$className]['columns'][$name] != $column) {
                    $this->_changes['changed_columns'][$info['tableName']][$name] = $column;
                }
            }
            // Check for new foreign keys
            foreach ($info['options']['foreignKeys'] as $name => $foreignKey) {
                $foreignKey['name'] = $name;
                // If foreign key doesn't exist in the from schema information then we need to add a index and the new fk
                if ( ! isset($from[$className]['options']['foreignKeys'][$name])) {
                    $this->_changes['created_foreign_keys'][$info['tableName']][$name] = $foreignKey;
                    $indexName = Doctrine_Manager::connection()->generateUniqueIndexName($info['tableName'], $foreignKey['local']);
                    $this->_changes['created_indexes'][$info['tableName']][$indexName] = array('fields' => array($foreignKey['local']));
                // If foreign key does exist then lets see if anything has changed with it
                } else if (isset($from[$className]['options']['foreignKeys'][$name])) {
                    $oldForeignKey = $from[$className]['options']['foreignKeys'][$name];
                    $oldForeignKey['name'] = $name;
                    // If the foreign key has changed any then we need to drop the foreign key and readd it
                    if ($foreignKey !== $oldForeignKey) {
                        $this->_changes['dropped_foreign_keys'][$info['tableName']][$name] = $oldForeignKey;
                        $this->_changes['created_foreign_keys'][$info['tableName']][$name] = $foreignKey;
                    }
                }
            }
            // Check for new indexes
            foreach ($info['options']['indexes'] as $name => $index) {
                // If index doesn't exist in the from schema information
                if ( ! isset($from[$className]['options']['indexes'][$name])) {
                    $this->_changes['created_indexes'][$info['tableName']][$name] = $index;
                }
            }
        }
        // Loop over the from schema information and compare it to the to schema information
        foreach ($from as $className => $info) {
            // If the class exists in the from but not in the to then it is a dropped table
            if ( ! isset($to[$className])) {
                $table = array('tableName' => $info['tableName'],
                               'columns'   => $info['columns'],
                               'options'   => array('type'        => $info['options']['type'],
                                                    'charset'     => $info['options']['charset'],
                                                    'collate'     => $info['options']['collate'],
                                                    'indexes'     => $info['options']['indexes'],
                                                    'foreignKeys' => $info['options']['foreignKeys'],
                                                    'primary'     => $info['options']['primary']));
                $this->_changes['dropped_tables'][$info['tableName']] = $table;
            }
            // Check for removed columns
            foreach ($info['columns'] as $name => $column) {
                // If column exists in the from but not in the to then we need to remove it
                if (isset($to[$className]) && ! isset($to[$className]['columns'][$name])) {
                    $this->_changes['dropped_columns'][$info['tableName']][$name] = $column;
                }
            }
            // Check for dropped foreign keys
            foreach ($info['options']['foreignKeys'] as $name => $foreignKey) {
                // If the foreign key exists in the from but not in the to then we need to drop it
                if ( ! isset($to[$className]['options']['foreignKeys'][$name])) {
                    $this->_changes['dropped_foreign_keys'][$info['tableName']][$name] = $foreignKey;
                }
            }
            // Check for removed indexes
            foreach ($info['options']['indexes'] as $name => $index) {
                // If the index exists in the from but not the to then we need to remove it
                if ( ! isset($to[$className]['options']['indexes'][$name])) {
                    $this->_changes['dropped_indexes'][$info['tableName']][$name] = $index;
                }
            }
        }

        return $this->_changes;
    }

    /**
     * Build all the model schema information for the passed array of models
     *
     * @param  array $models Array of models to build the schema information for
     * @return array $info   Array of schema information for all the passed models
     */
    protected function _buildModelInformation(array $models)
    {
        $info = array();
        foreach ($models as $key => $model) {
            $table = Doctrine_Core::getTable($model);
            if ($table->getTableName() !== $this->_migration->getTableName()) {
                $info[$model] = $table->getExportableFormat();
            }
        }

        $info = $this->_cleanModelInformation($info);

        return $info;
    }

    /**
     * Clean the produced model information of any potential prefix text
     *
     * @param  mixed $info  Either array or string to clean of prefixes
     * @return mixed $info  Cleaned value which is either an array or string
     */
    protected function _cleanModelInformation($info)
    {
        if (is_array($info)) {
            foreach ($info as $key => $value) {
                unset($info[$key]);
                $key = $this->_cleanModelInformation($key);
                $info[$key] = $this->_cleanModelInformation($value);
            }
            return $info;
        } else {
            $find = array(
                self::$_toPrefix,
                self::$_fromPrefix,
                Doctrine_Inflector::tableize(self::$_toPrefix) . '_',
                Doctrine_Inflector::tableize(self::$_fromPrefix) . '_',
                Doctrine_Inflector::tableize(self::$_toPrefix),
                Doctrine_Inflector::tableize(self::$_fromPrefix)
            );
            return str_replace($find, null, $info);
        }
    }

    /**
     * Get the extension of the type of file contained in a directory.
     * Used to determine if a directory contains YAML or PHP files.
     *
     * @param string $item
     * @return string $extension
     */
    protected function _getItemExtension($item)
    {
        if (is_dir($item)) {
            $files = glob($item . DIRECTORY_SEPARATOR . '*');
        } else {
            $files = array($item);
        }

        $extension = null;
        if (isset($files[0])) {
            if (is_dir($files[0])) {
                $extension = $this->_getItemExtension($files[0]);
            } else {
                $pathInfo = pathinfo($files[0]);
                $extension = $pathInfo['extension'];
            }
        }
        return $extension;
    }

    /**
     * Generate a set of models for the schema information source
     *
     * @param  string $prefix  Prefix to generate the models with
     * @param  mixed  $item    The item to generate the models from
     * @return string $path    The path where the models were generated
     * @throws Doctrine_Migration_Exception $e
     */
    protected function _generateModels($prefix, $item)
    {
        $path = $this->_tmpPath . DIRECTORY_SEPARATOR . strtolower($prefix) . '_doctrine_tmp_dirs';
        $options = array(
            'classPrefix' => $prefix,
            'generateBaseClasses' => false
        );

        if (is_string($item) && file_exists($item)) {
            $extension = $this->_getItemExtension($item);

            if ($extension === 'yml') {
                Doctrine_Core::generateModelsFromYaml($item, $path, $options);

                return $path;
            } else if ($extension === 'php') {
                Doctrine_Lib::copyDirectory($item, $path);

                return $path;
            } else {
                throw new Doctrine_Migration_Exception('No php or yml files found at path: "' . $item . '"');
            }
        } else {
            try {
                Doctrine_Core::generateModelsFromDb($path, (array) $item, $options);
                return $path;
            } catch (Exception $e) {
                throw new Doctrine_Migration_Exception('Could not generate models from connection: ' . $e->getMessage());
            }
        }
    }

    /**
     * Cleanup temporary generated models after a diff is performed
     *
     * @return void
     */
    protected function _cleanup()
    {
        $modelFiles = Doctrine_Core::getLoadedModelFiles();
        $filesToClean = array_diff($modelFiles, $this->_startingModelFiles);

        foreach ($filesToClean as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }

        // clean up tmp directories
        Doctrine_Lib::removeDirectories($this->_tmpPath . DIRECTORY_SEPARATOR . strtolower(self::$_fromPrefix) . '_doctrine_tmp_dirs');
        Doctrine_Lib::removeDirectories($this->_tmpPath . DIRECTORY_SEPARATOR . strtolower(self::$_toPrefix) . '_doctrine_tmp_dirs');
    }
}
