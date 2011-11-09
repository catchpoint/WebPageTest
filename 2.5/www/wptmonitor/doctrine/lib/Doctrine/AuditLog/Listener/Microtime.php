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
 * Doctrine_AuditLog_Listener
 *
 * @package     Doctrine
 * @subpackage  AuditLog
 * @license     http://www.opensource.org/licenses/lgpl-license.php LGPL
 * @link        www.doctrine-project.org
 * @since       1.0
 * @version     $Revision$
 * @author      Lukas Smith <smith@pooteeweet.org>
 */
class Doctrine_AuditLog_Listener_Microtime extends Doctrine_AuditLog_Listener
{
    /**
     * The numher of digits to use from the float microtime value
     *
     * @var int
     */
    protected $accuracy = 10;

    /**
     * Instantiate AuditLog listener and set the Doctrine_AuditLog instance to the class
     *
     * @param   Doctrine_AuditLog $auditLog
     * @return  void
     */
    public function __construct(Doctrine_AuditLog $auditLog)
    {
        parent::__construct($auditLog);
        $version = $this->_auditLog->getOption('version');
        if (!empty($version['accuracy'])) {
            $this->accuracy = $version['accuracy'];
        }
    }

    /**
     * Get the initial version number for the audit log
     *
     * @param Doctrine_Record $record
     * @return integer $initialVersion
     */
    protected function _getInitialVersion(Doctrine_Record $record)
    {
        return $this->_microtime();
    }

    /**
     * Get the next version number for the audit log
     *
     * @param Doctrine_Record $record
     * @return integer $nextVersion
     */
    protected function _getNextVersion(Doctrine_Record $record)
    {
        return $this->_microtime();
    }

    /**
     * Compute a version out of microtime(true)
     *
     * @return string $version
     */
    protected function _microtime()
    {
        $version = microtime(true) - 1073741824; // 31 bits
        $version = str_replace('.', '', (string)$version);
        return substr($version, 0, $this->accuracy);
    }

}