<?php
/*
 *  $Id: Expression.php 7490 2010-03-29 19:53:27Z jwage $
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
 * Doctrine_Expression memorizes a dql expression that use a db function.
 *
 * This class manages abstractions of dql expressions like query parts 
 * that use CONCAT(), MIN(), SUM().
 *
 * @package     Doctrine
 * @subpackage  Expression
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision: 7490 $
 * @author      Konsta Vesterinen <kvesteri@cc.hut.fi>
 */
class Doctrine_Expression
{
    protected $_expression;
    protected $_conn;
    protected $_tokenizer;

    /**
     * Creates an expression.
     *
     * The constructor needs the dql fragment that contains one or more dbms 
     * functions.
     * <code>
     * $e = new Doctrine_Expression("CONCAT('some', 'one')");
     * </code>
     * 
     * @param string $expr                  sql fragment
     * @param Doctrine_Connection $conn     the connection (optional)
     */
    public function __construct($expr, $conn = null)
    {
        if ($conn !== null) {
            $this->_conn = $conn;
        }
        $this->_tokenizer = new Doctrine_Query_Tokenizer();
        $this->setExpression($expr);
    }

    /**
     * Retrieves the connection associated to this expression at creation,
     * or the current connection used if it was not specified. 
     * 
     * @return Doctrine_Connection The connection
     */
    public function getConnection()
    {
        if ( ! isset($this->_conn)) {
            return Doctrine_Manager::connection();
        }

        return $this->_conn;
    }

    /**
     * Sets the contained expression assuring that it is parsed.
     * <code>
     * $e->setExpression("CONCAT('some', 'one')");
     * </code>
     * 
     * @param string $clause The expression to set
     * @return void
     */
    public function setExpression($clause)
    {
        $this->_expression = $this->parseClause($clause);
    }

    /**
     * Parses a single expressions and substitutes dql abstract functions 
     * with their concrete sql counterparts for the given connection.
     *
     * @param string $expr The expression to parse
     * @return string
     */
    public function parseExpression($expr)
    {
        $pos  = strpos($expr, '(');
        $quoted = (substr($expr, 0, 1) === "'" && substr($expr, -1) === "'");
        if ($pos === false || $quoted) {
            return $expr;
        }

        // get the name of the function
        $name   = substr($expr, 0, $pos);
        $argStr = substr($expr, ($pos + 1), -1);

        // parse args
        foreach ($this->_tokenizer->bracketExplode($argStr, ',') as $arg) {
           $args[] = $this->parseClause($arg);
        }

        return call_user_func_array(array($this->getConnection()->expression, $name), $args);
    }

    /**
     * Parses a set of expressions at once. 
     * @see parseExpression()
     * 
     * @param string $clause    The clause. Can be complex and parenthesised.
     * @return string           The parsed clause.
     */
    public function parseClause($clause)
    {
        $e = $this->_tokenizer->bracketExplode($clause, ' ');

        foreach ($e as $k => $expr) {
            $e[$k] = $this->parseExpression($expr);
        }
        
        return implode(' ', $e);
    }

    /**
     * Gets the sql fragment represented.
     * 
     * @return string
     */
    public function getSql()
    {
        return $this->_expression;
    }

    /**
     * Magic method.
     * 
     * Returns a string representation of this object. Proxies to @see getSql().
     * 
     * @return string
     */
    public function __toString()
    {
        return $this->getSql();
    }
}