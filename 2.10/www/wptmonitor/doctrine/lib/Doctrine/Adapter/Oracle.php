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
 * Custom Doctrine connection adapter for oracle
 *
 * @package     Doctrine
 * @subpackage  Adapter
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 * @author      vadik56
 * @author      Miloslav Kmet <adrive-nospam@hip-hop.sk>
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision$
 */

class Doctrine_Adapter_Oracle implements Doctrine_Adapter_Interface
{
    /**
     *    execution mode
     */
    protected $executeMode = OCI_COMMIT_ON_SUCCESS;

    /**
     * Resource representing connection to database
     */
    protected $connection = false;


    protected $attributes = array(Doctrine_Core::ATTR_DRIVER_NAME    => "oci8",
                                  Doctrine_Core::ATTR_ERRMODE        => Doctrine_Core::ERRMODE_SILENT);

    /**
     * User-provided configuration.
     *
     * Basic keys are:
     *
     * username => (string) Connect to the database as this username.
     * password => (string) Password associated with the username.
     * dbname   => Either the name of the local Oracle instance, or the
     *             name of the entry in tnsnames.ora to which you want to connect.
     *
     * @var array
     */
    protected $config = array(
        'dbname'     => null,
        'username'   => null,
        'password'   => null,
        'charset'    => null,
        'persistent' => false
    );

    /**
     * Doctrine Oracle adapter constructor
     *
     * <code>
     * $conn = new Doctrine_Adapter_Oracle(array('dbname'=>'db','username'=>'usr','password'=>'pass'));
     * </code>
     *
     * or
     *
     * <code>
     * Doctrine_Manager::connection(array('oracle:dbname=SID;charset=NLS_CHARACTERSET;persistent=true','usr', 'pass'),"doctrine_connection_name")
     * </code>
     *
     * @param string $name
     * @return void
     */
    public function __construct($config = array(), $username = null, $password = null)
    {
        if (is_string($config))
        {
            $config = str_replace("oracle:","",$config);
            $parts = explode(";", $config);
            foreach($parts as $part) {
                $e = explode("=", $part);
                $key = array_shift($e);
                $this->config[$key] = implode('=', $e);
            }

            if ($username) {
                $this->config['username'] = $username;
            }
            if ($password) {
                $this->config['password'] = $password;
            }
        } else {
            if ( ! isset($config['password']) || ! isset($config['username'])) {
                throw new Doctrine_Adapter_Exception('config array must have at least a username and a password');
            }

            $this->config['username'] = $config['username'];
            $this->config['password'] = $config['password'];
            $this->config['dbname']   = $config['dbname'];

            if (isset($config['charset'])) { 
                $this->config['charset']  = $config['charset']; 
            } 
 
            if (isset($config['persistent'])) { 
                $this->config['persistent']  = $config['persistent']; 
            }
        }


        if ($this->config['persistent'] == 'true'){ 
            $this->connection = @oci_pconnect($this->config['username'], $this->config['password'], 
                $this->config['dbname'], $this->config['charset']); 
        } else { 
            $this->connection = @oci_new_connect($this->config['username'], $this->config['password'], 
                $this->config['dbname'], $this->config['charset']); 
        }

        if ($this->connection === false) {
            throw new Doctrine_Adapter_Exception(sprintf("Unable to Connect to :'%s' as '%s'", $this->config['dbname'], $this->config['username']));
        }
    }

    /**
     * Prepare a query statement
     *
     * @param string $query Query to prepare
     * @return Doctrine_Adapter_Statement_Oracle $stmt prepared statement
     */
    public function prepare($query)
    {
        $stmt = new Doctrine_Adapter_Statement_Oracle($this, $query, $this->executeMode);

        return $stmt;
    }

    /**
     * Execute query and return results as statement object
     *
     * @param string $query
     * @return Doctrine_Adapter_Statement_Oracle $stmt
     */
    public function query($query)
    {
        $stmt = new Doctrine_Adapter_Statement_Oracle($this, $query, $this->executeMode);
        $stmt->execute();

        return $stmt;
    }

    /**
     * Quote a value for the dbms
     *
     * @param string $input
     * @return string $quoted
     */
    public function quote($input)
    {
        return "'" . str_replace("'","''",$input) . "'";
    }

    /**
     * Execute a raw sql statement
     *
     * @param string $statement
     * @return void
     */
    public function exec($statement)
    {
        $stmt = new Doctrine_Adapter_Statement_Oracle($this, $statement, $this->executeMode);
        $stmt->execute();
        $count = $stmt->rowCount();

        return $count;
    }

    /**
     * Get the id of the last inserted record
     *
     * @return integer $id
     */
    public function lastInsertId()
    {
        throw new Doctrine_Adapter_Exception("unsupported");
    }

    /**
     * Begin a transaction
     *
     * @return boolean
     */
    public function beginTransaction()
    {
       $this->executeMode = OCI_DEFAULT;
       return true;
    }

    /**
     * Commit a transaction
     *
     * @return void
     */
    public function commit()
    {
        return @oci_commit($this->connection);
    }

    /**
     * Rollback a transaction
     *
     * @return boolean
     */
    public function rollBack()
    {
        return @oci_rollback($this->connection);
    }

    /**
     * Set connection attribute
     *
     * @param integer $attribute
     * @param mixed $value                  the value of given attribute
     * @return boolean                      Returns TRUE on success or FALSE on failure.
     */
    public function setAttribute($attribute, $value)
    {
        switch ($attribute) {
            case Doctrine_Core::ATTR_DRIVER_NAME:
                //TODO throw an error since driver name can not be changed
            case Doctrine_Core::ATTR_ERRMODE:
            break;
            case Doctrine_Core::ATTR_CASE:
                if ($value == Doctrine_Core::CASE_NATURAL) {
                    break;
                } else {
                    throw new Doctrine_Adapter_Exception("Unsupported Option for ATTR_CASE: $value");
                }
            default:
                throw new Doctrine_Adapter_Exception("Unsupported Attribute: $attribute");
                return false;
        }
        $this->attributes[$attribute] = $value;
        return true;
    }

    /**
     * Retrieve a statement attribute
     *
     * @param integer $attribute
     * @see Doctrine_Core::ATTR_* constants
     * @return mixed                        the attribute value
     */
    public function getAttribute($attribute)
    {
        return $this->attributes[$attribute];
    }

    /**
     * Returns established OCI connection handler
     *
     * @return resource OCI connection handler
     */
    public function getConnection()
    {
        return $this->connection;
    }
    
    /**
     * Returns current user name
     * 
     * @return string current user name
     */
    public function getUserName()
    {
       return $this->config['username']; 
    }

    public function errorCode()
    {
        if (is_resource($this->connection)) {
            $error = @oci_error($this->connection);
        } else {
            $error = @oci_error();
        }
        return $error['code'];
    }

    public function errorInfo()
    {
        if (is_resource($this->connection)) {
            $error = @oci_error($this->connection);
        } else {
            $error = @oci_error();
        }
        return $error['message'];
    }

    public function __destruct() 
    {  
        if (is_resource($this->connection)) {  
            @oci_rollback($this->connection);  
            @oci_close($this->connection);  
        } 
    }
}