<?php

namespace Domnikl\Statsd\Connection;

use Domnikl\Statsd\Connection as Connection;

/**
 * encapsulates the connection to the statsd service
 *
 * @author Dominik Liebler <liebler.dominik@googlemail.com>
 */
class Socket implements Connection
{
    /**
     * host name
     *
     * @var string
     */
    protected $_host;

    /**
     * port number
     *
     * @var int
     */
    protected $_port;

    /**
     * Socket timeout
     *
     * @var int
     */
    protected $_timeout;

    /**
     * Persistent connection
     *
     * @var bool
     */
    protected $_persistent = false;

    /**
     * the used socket resource
     *
     * @var resource
     */
    protected $_socket;

    /**
     * is sampling allowed?
     *
     * @var bool
     */
    protected $_forceSampling = false;

    /**
     * instantiates the Connection object and a real connection to statsd
     *
     * @param string $host Statsd hostname
     * @param int $port Statsd port
     * @param int $timeout Connection timeout
     * @param bool $persistent (default FALSE) Use persistent connection or not
     */
    public function __construct($host = 'localhost', $port = 8125, $timeout = null, $persistent = false)
    {
        $this->_host = (string)$host;
        $this->_port = (int)$port;
        $this->_timeout = $timeout;
        $this->_persistent = $persistent;
    }

    /**
     * connect to statsd service
     */
    protected function connect()
    {
        $errno = null;
        $errstr = null;
        if ($this->_persistent) {
            $this->_socket = pfsockopen(sprintf("udp://%s", $this->_host), $this->_port, $errno, $errstr, $this->_timeout);
        } else {
            $this->_socket = fsockopen(sprintf("udp://%s", $this->_host), $this->_port, $errno, $errstr, $this->_timeout);
        }
    }

    /**
     * sends a message to the UDP socket
     *
     * @param $message
     *
     * @return void
     */
    public function send($message)
    {
        if (!$this->_socket) {
            $this->connect();
        }
        if (0 != strlen($message) && $this->_socket) {
            try {
                // total suppression of errors
                @fwrite($this->_socket, $message);
            } catch (\Exception $e) {
                // ignore it: stats logging failure shouldn't stop the whole app
            }
        }
    }

    /**
     * @return string
     */
    public function getHost()
    {
        return $this->_host;
    }


    /**
     * @return int
     */
    public function getPort()
    {
        return $this->_port;
    }

    /**
     * @return int
     */
    public function getTimeout()
    {
        return $this->_timeout;
    }

    /**
     * @return bool
     */
    public function isPersistent()
    {
        return $this->_persistent;
    }

    /**
     * is sampling forced?
     *
     * @return boolean
     */
    public function forceSampling()
    {
        return (bool)$this->_forceSampling;
    }
}
