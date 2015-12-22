<?php

namespace Domnikl\Statsd;

/**
 * An interface for a Statsd connection implementation
 *
 * @author Derek Gallo <dgallo@avectra.com>
 */
interface Connection
{

    /**
     * sends a message to Statsd
     *
     * @param $message
     *
     * @return void
     */
    public function send($message);
    
    /**
     * is sampling forced?
     *
     * @return boolean
     */
    public function forceSampling();
}
	