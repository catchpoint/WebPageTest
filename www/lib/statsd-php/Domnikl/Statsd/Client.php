<?php

namespace Domnikl\Statsd;

/**
 * the statsd client
 *
 * @author Dominik Liebler <liebler.dominik@googlemail.com>
 */
class Client
{
    /**
     * Connection object that messages get send to
     *
     * @var Connection
     */
    protected $_connection;

    /**
     * holds all the timings that have not yet been completed
     *
     * @var array
     */
    protected $_timings = array();

    /**
     * holds all memory profiles like timings
     *
     * @var array
     */
    protected $_memoryProfiles = array();

    /**
     * global key namespace
     *
     * @var string
     */
    protected $_namespace = '';

    /**
     * stores the batch after batch processing was started
     *
     * @var array
     */
    protected $_batch = array();

    /**
     * batch mode?
     *
     * @var boolean
     */
    protected $_isBatch = false;

    /**
     * inits the Client object
     *
     * @param Connection $connection
     * @param string $namespace global key namespace
     */
    public function __construct(Connection $connection, $namespace = '')
    {
        $this->_connection = $connection;
        $this->_namespace = (string) $namespace;
    }

    /**
     * increments the key by 1
     *
     * @param string $key
     * @param int $sampleRate
     *
     * @return void
     */
    public function increment($key, $sampleRate = 1)
    {
        $this->count($key, 1, $sampleRate);
    }

    /**
     * decrements the key by 1
     *
     * @param string $key
     * @param int $sampleRate
     *
     * @return void
     */
    public function decrement($key, $sampleRate = 1)
    {
        $this->count($key, -1, $sampleRate);
    }
    /**
     * sends a count to statsd
     *
     * @param string $key
     * @param int $value
     * @param int $sampleRate (optional) the default is 1
     *
     * @return void
     */
    public function count($key, $value, $sampleRate = 1)
    {
        $this->_send($key, (int) $value, 'c', $sampleRate);
    }

    /**
     * sends a timing to statsd (in ms)
     *
     * @param string $key
     * @param int $value the timing in ms
     * @param int $sampleRate the sample rate, if < 1, statsd will send an average timing
     *
     * @return void
     */
    public function timing($key, $value, $sampleRate = 1)
    {
        $this->_send($key, (int) $value, 'ms', $sampleRate);
    }

    /**
     * starts the timing for a key
     *
     * @param string $key
     *
     * @return void
     */
    public function startTiming($key)
    {
        $this->_timings[$key] = gettimeofday(true);
    }

    /**
     * ends the timing for a key and sends it to statsd
     *
     * @param string $key
     * @param int $sampleRate (optional)
     *
     * @return void
     */
    public function endTiming($key, $sampleRate = 1)
    {
        $end = gettimeofday(true);

        if (array_key_exists($key, $this->_timings)) {
            $timing = ($end - $this->_timings[$key]) * 1000;
            $this->timing($key, $timing, $sampleRate);
            unset($this->_timings[$key]);
        }
    }

    /**
     * start memory "profiling"
     *
     * @param string $key
     *
     * @return void
     */
    public function startMemoryProfile($key)
    {
        $this->_memoryProfiles[$key] = memory_get_usage();
    }

    /**
     * ends the memory profiling and sends the value to the server
     *
     * @param string $key
     * @param int $sampleRate
     *
     * @return void
     */
    public function endMemoryProfile($key, $sampleRate = 1)
    {
        $end = memory_get_usage();

        if (array_key_exists($key, $this->_memoryProfiles)) {
            $memory = ($end - $this->_memoryProfiles[$key]);
            $this->memory($key, $memory, $sampleRate);

            unset($this->_memoryProfiles[$key]);
        }
    }

    /**
     * report memory usage to statsd. if memory was not given report peak usage
     *
     * @param string $key
     * @param int $memory
     * @param int $sampleRate
     *
     * @return void
     */
    public function memory($key, $memory = null, $sampleRate = 1)
    {
        if (null === $memory) {
            $memory = memory_get_peak_usage();
        }

        $this->count($key, (int) $memory, $sampleRate);
    }

    /**
     * executes a Closure and records it's execution time and sends it to statsd
     * returns the value the Closure returned
     *
     * @param string $key
     * @param \Closure $_block
     * @param int $sampleRate (optional) default = 1
     *
     * @return mixed
     */
    public function time($key, \Closure $_block, $sampleRate = 1)
    {
        $this->startTiming($key);
        $return = $_block();
        $this->endTiming($key, $sampleRate);

        return $return;
    }

    /**
     * sends a gauge, an arbitrary value to StatsD
     *
     * @param string $key
     * @param int $value
     * 
     * @return void
     */
    public function gauge($key, $value)
    {
        $this->_send($key, (int) $value, 'g', 1);
    }

    /**
     * sends a set member
     *
     * @param string $key
     * @param int $value
     * 
     * @return void
     */
    public function set($key, $value)
    {
        $this->_send($key, $value, 's', 1);
    }

    /**
     * actually sends a message to to the daemon and returns the sent message
     *
     * @param string $key
     * @param int $value
     * @param string $type
     * @param int $sampleRate
     *
     * @return void
     */
    protected function _send($key, $value, $type, $sampleRate)
    {
        if (0 != strlen($this->_namespace)) {
            $key = sprintf('%s.%s', $this->_namespace, $key);
        }

        $message = sprintf("%s:%d|%s", $key, $value, $type);
        $sampledData = '';

        $sample = mt_rand() / mt_getrandmax();

        if ($sample > $sampleRate) {
            return;
        }

        if ($sampleRate < 1 || $this->_connection->forceSampling()) {
            $sampledData = sprintf('%s|@%s', $message, $sampleRate);
        } else {
            $sampledData = $message;
        }

        if (!$this->_isBatch) {
            $this->_connection->send($sampledData);
        } else {
            $this->_batch[] = $sampledData;
        }
    }

    /**
     * changes the global key namespace
     *
     * @param string $namespace
     *
     * @return void
     */
    public function setNamespace($namespace)
    {
        $this->_namespace = (string) $namespace;
    }

    /**
     * gets the global key namespace
     *
     * @return string
     */
    public function getNamespace()
    {
        return $this->_namespace;
    }

    /**
     * is batch processing running?
     *
     * @return boolean
     */
    public function isBatch()
    {
        return $this->_isBatch;
    }
    
    /**
     * start batch-send-recording
     * 
     * @return void
     */
    public function startBatch()
    {
        $this->_isBatch = true;
    }
    
    /**
     * ends batch-send-recording and sends the recorded messages to the connection
     *
     * @return void
     */
    public function endBatch()
    {
        $this->_isBatch = false;
        $this->_connection->send(join("\n", $this->_batch));
        $this->_batch = array();
    }
    
    /**
     * stops batch-recording and resets the batch
     *
     * @return void
     */
    public function cancelBatch()
    {
        $this->_isBatch = false;
        $this->_batch = array();
    }
}
