<?php
/*
 *  $Id: Mssql.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Expression_Mssql
 *
 * @package     Doctrine
 * @subpackage  Expression
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Expression_Mssql extends Doctrine_Expression_Driver
{
    /**
     * Return string to call a variable with the current timestamp inside an SQL statement
     * There are three special variables for current date and time:
     * - CURRENT_TIMESTAMP (date and time, TIMESTAMP type)
     * - CURRENT_DATE (date, DATE type)
     * - CURRENT_TIME (time, TIME type)
     *
     * @return string to call a variable with the current timestamp
     * @access public
     */
    public function now($type = 'timestamp')
    {
        switch ($type) {
            case 'time':
            case 'date':
            case 'timestamp':
            default:
                return 'GETDATE()';
        }
    }

    /**
     * return string to call a function to get a substring inside an SQL statement
     *
     * @return string to call a function to get a substring
     */
    public function substring($value, $position, $length = null)
    {
        if ( ! is_null($length)) {
            return 'SUBSTRING(' . $value . ', ' . $position . ', ' . $length . ')';
        }
        return 'SUBSTRING(' . $value . ', ' . $position . ', LEN(' . $value . ') - ' . $position . ' + 1)';
    }

    /**
     * Returns string to concatenate two or more string parameters
     *
     * @param string $arg1
     * @param string $arg2
     * @param string $values...
     * @return string to concatenate two strings
     */
    public function concat()
    {
        $args = func_get_args();
        return '(' . implode(' + ', $args) . ')';
    }

    /**
     * Returns global unique identifier
     *
     * @return string to get global unique identifier
     */
    public function guid()
    {
        return 'NEWID()';
    }

    /**
     * Returns the length of a text field
     *
     * @param string $column
     *
     * @return string
     */
    public function length($column)
    {
        return 'LEN (' . $column . ')';
    }
}