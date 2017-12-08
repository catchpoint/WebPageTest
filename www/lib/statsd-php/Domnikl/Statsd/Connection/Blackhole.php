<?php

namespace Domnikl\Statsd\Connection;

use Domnikl\Statsd\Connection as Connection;

/**
 * drops all requests, useful for dev environments
 *
 * @author Andrei Serdeliuc <andrei@serdeliuc.ro>
 */
class Blackhole implements Connection
{ 
    /**
     * Drops any incoming messages
     *
     * @param $message
     *
     * @return void
     */
    public function send($message)
    {
        return false;
    }

    /**
     * is sampling forced?
     *
     * @return boolean
     */
    public function forceSampling()
    {
        return false;
    }
}
