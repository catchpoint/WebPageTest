<?php
/*
 * $Id: Schema.php 1838 2007-06-26 00:58:21Z nicobn $
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
 * Doctrine_Export_Schema
 * 
 * Used for exporting a schema to a yaml file
 *
 * @package     Doctrine
 * @subpackage  Export
 * @link        www.doctrine-project.org
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @version     $Revision: 1838 $
 * @author      Nicolas Bérard-Nault <nicobn@gmail.com>
 * @author      Jonathan H. Wage <jwage@mac.com>
 */
class Doctrine_Export_Schema
{    
    /**
     * buildSchema
     * 
     * Build schema array that can be dumped to file
     *
     * @param string $directory  The directory of models to build the schema from
     * @param array $models      The array of model names to build the schema for
     * @param integer $modelLoading The model loading strategy to use to load the models from the passed directory
     * @return void
     */
    public function buildSchema($directory = null, $models = array(), $modelLoading = null)
    {
        if ($directory !== null) {
            $loadedModels = Doctrine_Core::filterInvalidModels(Doctrine_Core::loadModels($directory, $modelLoading));
        } else {
            $loadedModels = Doctrine_Core::getLoadedModels();
        }
        
        $array = array();
        
        $parent = new ReflectionClass('Doctrine_Record');

        $sql = array();
        $fks = array();

        // we iterate through the diff of previously declared classes
        // and currently declared classes
        foreach ($loadedModels as $className) {
            if ( ! empty($models) && !in_array($className, $models)) {
                continue;
            }

            $recordTable = Doctrine_Core::getTable($className);
            
            $data = $recordTable->getExportableFormat();
            
            $table = array();
            $table['connection'] = $recordTable->getConnection()->getName();
            $remove = array('ptype', 'ntype', 'alltypes');
            // Fix explicit length in schema, concat it to type in this format: type(length)
            foreach ($data['columns'] AS $name => $column) {
                if (isset($column['length']) && $column['length'] && isset($column['scale']) && $column['scale']) {
                    $data['columns'][$name]['type'] = $column['type'] . '(' . $column['length'] . ', ' . $column['scale'] . ')';
                    unset($data['columns'][$name]['length'], $data['columns'][$name]['scale']);
                } else {
                    $data['columns'][$name]['type'] = $column['type'] . '(' . $column['length'] . ')';
                    unset($data['columns'][$name]['length']);
                }
                // Strip out schema information which is not necessary to be dumped to the yaml schema file
                foreach ($remove as $value) {
                    if (isset($data['columns'][$name][$value])) {
                        unset($data['columns'][$name][$value]);
                    }
                }
                
                // If type is the only property of the column then lets abbreviate the syntax
                // columns: { name: string(255) }
                if (count($data['columns'][$name]) === 1 && isset($data['columns'][$name]['type'])) {
                    $type = $data['columns'][$name]['type'];
                    unset($data['columns'][$name]);
                    $data['columns'][$name] = $type;
                }
            }
            $table['tableName'] = $data['tableName'];
            $table['columns'] = $data['columns'];
            
            $relations = $recordTable->getRelations();
            foreach ($relations as $key => $relation) {
                $relationData = $relation->toArray();
                
                $relationKey = $relationData['alias'];
                
                if (isset($relationData['refTable']) && $relationData['refTable']) {
                    $table['relations'][$relationKey]['refClass'] = $relationData['refTable']->getComponentName();
                }
                
                if (isset($relationData['class']) && $relationData['class'] && $relation['class'] != $relationKey) {
                    $table['relations'][$relationKey]['class'] = $relationData['class'];
                }
 
                $table['relations'][$relationKey]['local'] = $relationData['local'];
                $table['relations'][$relationKey]['foreign'] = $relationData['foreign'];
                
                if ($relationData['type'] === Doctrine_Relation::ONE) {
                    $table['relations'][$relationKey]['type'] = 'one';
                } else if ($relationData['type'] === Doctrine_Relation::MANY) {
                    $table['relations'][$relationKey]['type'] = 'many';
                } else {
                    $table['relations'][$relationKey]['type'] = 'one';
                }
            }
            
            $array[$className] = $table;
        }
        
        return $array;
    }

    /**
     * exportSchema
     *
     * @param  string $schema 
     * @param  string $directory 
     * @param string $string of data in the specified format
     * @param integer $modelLoading The model loading strategy to use to load the models from the passed directory
     * @return void
     */
    public function exportSchema($schema, $format = 'yml', $directory = null, $models = array(), $modelLoading = null)
    {
        $array = $this->buildSchema($directory, $models, $modelLoading);
        
        if (is_dir($schema)) {
          $schema = $schema . DIRECTORY_SEPARATOR . 'schema.' . $format;
        }
        
        return Doctrine_Parser::dump($array, $format, $schema);
    }
}