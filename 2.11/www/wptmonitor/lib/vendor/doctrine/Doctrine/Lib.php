<?php
/*
 *  $Id: Lib.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Lib has not commonly used static functions, mostly for debugging purposes
 *
 * @package     Doctrine
 * @subpackage  Lib
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Lib
{
    /**
     * Generates a human readable representation of a record's state.
     *
     * This method translates a Doctrine_Record state (integer constant) 
     * in an english string.
     * @see Doctrine_Record::STATE_* constants
     *
     * @param integer $state    the state of record
     * @return string           description of given state
     */
    public static function getRecordStateAsString($state)
    {
        switch ($state) {
            case Doctrine_Record::STATE_PROXY:
                return "proxy";
                break;
            case Doctrine_Record::STATE_CLEAN:
                return "persistent clean";
                break;
            case Doctrine_Record::STATE_DIRTY:
                return "persistent dirty";
                break;
            case Doctrine_Record::STATE_TDIRTY:
                return "transient dirty";
                break;
            case Doctrine_Record::STATE_TCLEAN:
                return "transient clean";
                break;
        }
    }

    /**
     * Dumps a record.
     *
     * This method returns an html representation of a given
     * record, containing keys, state and data.
     *
     * @param Doctrine_Record $record
     * @return string
     */
    public static function getRecordAsString(Doctrine_Record $record)
    {
        $r[] = '<pre>';
        $r[] = 'Component  : ' . $record->getTable()->getComponentName();
        $r[] = 'ID         : ' . Doctrine_Core::dump($record->identifier());
        $r[] = 'References : ' . count($record->getReferences());
        $r[] = 'State      : ' . Doctrine_Lib::getRecordStateAsString($record->state());
        $r[] = 'OID        : ' . $record->getOID();
        $r[] = 'data       : ' . Doctrine_Core::dump($record->getData(), false);
        $r[] = '</pre>';

        return implode("\n",$r)."<br />";
    }

    /**
     * Generates a human readable representation of a connection's state.
     *
     * This method translates a Doctrine_Connection state (integer constant)
     * in a english description.
     * @see Doctrine_Transaction::STATE_* constants
     * @param integer $state    state of the connection as a string
     * @return string
     */
    public static function getConnectionStateAsString($state)
    {
        switch ($state) {
            case Doctrine_Transaction::STATE_SLEEP:
                return "open";
                break;
            case Doctrine_Transaction::STATE_BUSY:
                return "busy";
                break;
            case Doctrine_Transaction::STATE_ACTIVE:
                return "active";
                break;
        }
    }

    /**
     * Generates a string representation of a connection.
     *
     * This method returns an html dump of a connection, containing state, open
     * transactions and loaded tables.
     *
     * @param Doctrine_Connection $connection
     * @return string
     */
    public static function getConnectionAsString(Doctrine_Connection $connection)
    {
        $r[] = '<pre>';
        $r[] = 'Doctrine_Connection object';
        $r[] = 'State               : ' . Doctrine_Lib::getConnectionStateAsString($connection->transaction->getState());
        $r[] = 'Open Transactions   : ' . $connection->transaction->getTransactionLevel();
        $r[] = 'Table in memory     : ' . $connection->count();
        $r[] = 'Driver name         : ' . $connection->getAttribute(Doctrine_Core::ATTR_DRIVER_NAME);
        $r[] = "</pre>";
        
        return implode("\n",$r)."<br>";
    }

    /**
     * Generates a string representation of a table.
     *
     * This method returns an html dump of a table, containing component name
     * and table physical name.
     * @param Doctrine_Table $table
     * @return string
     */
    public static function getTableAsString(Doctrine_Table $table)
    {
        $r[] = "<pre>";
        $r[] = "Component   : ".$table->getComponentName();
        $r[] = "Table       : ".$table->getTableName();
        $r[] = "</pre>";
        
        return implode("\n",$r)."<br>";
    }

    /**
     * Generates a colored sql query. 
     *
     * This methods parses a plain text query and generates the html needed
     * for visual formatting.
     * 
     * @todo: What about creating a config varialbe for the color?
     * @param string $sql   plain text query
     * @return string       the formatted sql code
     */
    public static function formatSql($sql)
    {
        $e = explode("\n",$sql);
        $color = "367FAC";
        $l = $sql;
        $l = str_replace("SELECT ", "<font color='$color'><b>SELECT </b></font><br \>  ",$l);
        $l = str_replace("FROM ", "<font color='$color'><b>FROM </b></font><br \>",$l);
        $l = str_replace(" LEFT JOIN ", "<br \><font color='$color'><b> LEFT JOIN </b></font>",$l);
        $l = str_replace(" INNER JOIN ", "<br \><font color='$color'><b> INNER JOIN </b></font>",$l);
        $l = str_replace(" WHERE ", "<br \><font color='$color'><b> WHERE </b></font>",$l);
        $l = str_replace(" GROUP BY ", "<br \><font color='$color'><b> GROUP BY </b></font>",$l);
        $l = str_replace(" HAVING ", "<br \><font color='$color'><b> HAVING </b></font>",$l);
        $l = str_replace(" AS ", "<font color='$color'><b> AS </b></font><br \>  ",$l);
        $l = str_replace(" ON ", "<font color='$color'><b> ON </b></font>",$l);
        $l = str_replace(" ORDER BY ", "<font color='$color'><b> ORDER BY </b></font><br \>",$l);
        $l = str_replace(" LIMIT ", "<font color='$color'><b> LIMIT </b></font><br \>",$l);
        $l = str_replace(" OFFSET ", "<font color='$color'><b> OFFSET </b></font><br \>",$l);
        $l = str_replace("  ", "<dd>",$l);

        return $l;
    }

    /**
     * Generates a string representation of a collection.
     *
     * This method returns an html dump of a collection of records, containing 
     * all data.
     *
     * @param Doctrine_Collection $collection
     * @return string
     */
    public static function getCollectionAsString(Doctrine_Collection $collection)
    {
        $r[] = "<pre>";
        $r[] = get_class($collection);
        $r[] = 'data : ' . Doctrine_Core::dump($collection->getData(), false);
        //$r[] = 'snapshot : ' . Doctrine_Core::dump($collection->getSnapshot());
        $r[] = "</pre>";
        
        return implode("\n",$r);
    }

    // Code from symfony sfToolkit class. See LICENSE
    // code from php at moechofe dot com (array_merge comment on php.net)
    /*
     * arrayDeepMerge
     *
     * array arrayDeepMerge ( array array1 [, array array2 [, array ...]] )
     *
     * Like array_merge
     *
     *  arrayDeepMerge() merges the elements of one or more arrays together so
     * that the values of one are appended to the end of the previous one. It
     * returns the resulting array.
     *  If the input arrays have the same string keys, then the later value for
     * that key will overwrite the previous one. If, however, the arrays contain
     * numeric keys, the later value will not overwrite the original value, but
     * will be appended.
     *  If only one array is given and the array is numerically indexed, the keys
     * get reindexed in a continuous way.
     *
     * Different from array_merge
     *  If string keys have arrays for values, these arrays will merge recursively.
     */
     public static function arrayDeepMerge()
     {
         switch (func_num_args()) {
             case 0:
                return false;
             case 1:
                return func_get_arg(0);
             case 2:
                $args = func_get_args();
                $args[2] = array();
                
                if (is_array($args[0]) && is_array($args[1]))
                {
                    foreach (array_unique(array_merge(array_keys($args[0]),array_keys($args[1]))) as $key)
                    {
                        $isKey0 = array_key_exists($key, $args[0]);
                        $isKey1 = array_key_exists($key, $args[1]);

                        if ($isKey0 && $isKey1 && is_array($args[0][$key]) && is_array($args[1][$key]))
                        {
                            $args[2][$key] = self::arrayDeepMerge($args[0][$key], $args[1][$key]);
                        } else if ($isKey0 && $isKey1) {
                            $args[2][$key] = $args[1][$key];
                        } else if ( ! $isKey1) {
                            $args[2][$key] = $args[0][$key];
                        } else if ( ! $isKey0) {
                            $args[2][$key] = $args[1][$key];
                        }
                    }

                    return $args[2];
                } else {
                    return $args[1];
                }
            default:
                $args = func_get_args();
                $args[1] = self::arrayDeepMerge($args[0], $args[1]);
                array_shift($args);

                return call_user_func_array(array('Doctrine_Lib', 'arrayDeepMerge'), $args);
            break;
        }
    }

    /**
     * Makes the directories for a path recursively.
     * 
     * This method creates a given path issuing mkdir commands for all folders
     * that do not exist yet. Equivalent to 'mkdir -p'.
     *
     * @param string $path
     * @param integer $mode     an integer (octal) chmod parameter for the
     *                          created directories
     * @return boolean  true if succeeded
     */
    public static function makeDirectories($path, $mode = 0777)
    {
        if ( ! $path) {
          return false;
        }

        if (is_dir($path) || is_file($path)) {
          return true;
        }

        return mkdir(trim($path), $mode, true);
    }

    /**
     * Removes a non empty directory.
     *
     * This method recursively removes a directory and all its descendants.
     * Equivalent to 'rm -rf'.
     *
     * @param string $folderPath
     * @return boolean  success of the operation
     */
    public static function removeDirectories($folderPath)
    {
        if (is_dir($folderPath))
        {
            foreach (scandir($folderPath) as $value)
            {
                if ($value != '.' && $value != '..')
                {
                    $value = $folderPath . "/" . $value;

                    if (is_dir($value)) {
                        self::removeDirectories($value);
                    } else if (is_file($value)) {
                        unlink($value);
                    }
                }
            }

            return rmdir($folderPath);
        } else {
            return false;
        }
    }

    /**
     * Copy all directory content in another one.
     * 
     * This method recursively copies all $source files and subdirs in $dest.
     * If $source is a file, only it will be copied in $dest.
     *
     * @param string $source    a directory path
     * @param string $dest      a directory path
     * @return
     */
    public static function copyDirectory($source, $dest)
    {
        // Simple copy for a file
        if (is_file($source)) {
            return copy($source, $dest);
        }

        // Make destination directory
        if ( ! is_dir($dest)) {
            mkdir($dest);
        }

        // Loop through the folder
        $dir = dir($source);
        while (false !== $entry = $dir->read()) {
            // Skip pointers
            if ($entry == '.' || $entry == '..') {
                continue;
            }

            // Deep copy directories
            if ($dest !== "$source/$entry") {
                self::copyDirectory("$source/$entry", "$dest/$entry");
            }
        }

        // Clean up
        $dir->close();

        return true;
    }

    /**
     * Checks for a valid class name for Doctrine coding standards.
     * 
     * This methods tests if $className is a valid class name for php syntax 
     * and for Doctrine coding standards. $className must use camel case naming
     * and underscores for directory separation.
     *
     * @param string $classname
     * @return boolean
     */
    public static function isValidClassName($className)
    {
        if (preg_match('~(^[a-z])|(_[a-z])|([\W])|(_{2})~', $className)) {
            return false;
        }

        return true;
    }
}
