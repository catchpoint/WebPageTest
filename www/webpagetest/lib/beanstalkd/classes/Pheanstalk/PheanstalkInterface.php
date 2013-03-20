<?php

interface Pheanstalk_PheanstalkInterface {
    const DEFAULT_PORT = 11300;
    const DEFAULT_DELAY = 0; // no delay
    const DEFAULT_PRIORITY = 1024; // most urgent: 0, least urgent: 4294967295
    const DEFAULT_TTR = 60; // 1 minute
    const DEFAULT_TUBE = 'default';

    /**
     * @param Pheanstalk_Connection
     * @chainable
     */
    public function setConnection(Pheanstalk_Connection $connection);

    /**
     * The internal connection object.
     * Not required for general usage.
     * @return Pheanstalk_Connection
     */
    public function getConnection();

    // ----------------------------------------

    /**
     * Puts a job into a 'buried' state, revived only by 'kick' command.
     *
     * @param Pheanstalk_Job $job
     * @return void
     */
    public function bury($job, $priority = self::DEFAULT_PRIORITY);

    /**
     * Permanently deletes a job.
     *
     * @param object $job Pheanstalk_Job
     * @chainable
     */
    public function delete($job);

    /**
     * Remove the specified tube from the watchlist.
     *
     * Does not execute an IGNORE command if the specified tube is not in the
     * cached watchlist.
     *
     * @param string $tube
     * @chainable
     */
    public function ignore($tube);

    /**
     * Kicks buried or delayed jobs into a 'ready' state.
     * If there are buried jobs, it will kick up to $max of them.
     * Otherwise, it will kick up to $max delayed jobs.
     *
     * @param int $max The maximum jobs to kick
     * @return int Number of jobs kicked
     */
    public function kick($max);

    /**
     * The names of all tubes on the server.
     *
     * @return array
     */
    public function listTubes();

    /**
     * The names of the tubes being watched, to reserve jobs from.
     *
     * Returns the cached watchlist if $askServer is false (the default),
     * or queries the server for the watchlist if $askServer is true.
     *
     * @param bool $askServer
     * @return array
     */
    public function listTubesWatched($askServer = false);

    /**
     * The name of the current tube used for publishing jobs to.
     *
     * Returns the cached value if $askServer is false (the default),
     * or queries the server for the currently used tube if $askServer
     * is true.
     *
     * @param bool $askServer
     * @return string
     */
    public function listTubeUsed($askServer = false);

    /**
     * Temporarily prevent jobs being reserved from the given tube.
     *
     * @param string $tube The tube to pause
     * @param int $delay Seconds before jobs may be reserved from this queue.
     * @chainable
     */
    public function pauseTube($tube, $delay);

    /**
     * Inspect a job in the system, regardless of what tube it is in.
     *
     * @param int $jobId
     * @return object Pheanstalk_Job
     */
    public function peek($jobId);

    /**
     * Inspect the next ready job in the specified tube. If no tube is
     * specified, the currently used tube in used.
     *
     * @param string $tube
     * @return object Pheanstalk_Job
     */
    public function peekReady($tube = null);

    /**
     * Inspect the shortest-remaining-delayed job in the specified tube. If no
     * tube is specified, the currently used tube in used.
     *
     * @param string $tube
     * @return object Pheanstalk_Job
     */
    public function peekDelayed($tube = null);

    /**
     * Inspect the next job in the list of buried jobs of the specified tube.
     * If no tube is specified, the currently used tube in used.
     *
     * @param string $tube
     * @return object Pheanstalk_Job
     */
    public function peekBuried($tube = null);

    /**
     * Puts a job on the queue.
     *
     * @param string $data The job data
     * @param int $priority From 0 (most urgent) to 0xFFFFFFFF (least urgent)
     * @param int $delay Seconds to wait before job becomes ready
     * @param int $ttr Time To Run: seconds a job can be reserved for
     * @return int The new job ID
     */
    public function put($data, $priority = self::DEFAULT_PRIORITY, $delay = self::DEFAULT_DELAY, $ttr = self::DEFAULT_TTR);

    /**
     * Puts a job on the queue using specified tube.
     *
     * Using this method is equivalent to calling useTube() then put(), with
     * the added benefit that it will not execute the USE command if the client
     * is already using the specified tube.
     *
     * @param string $tube The tube to use
     * @param string $data The job data
     * @param int $priority From 0 (most urgent) to 0xFFFFFFFF (least urgent)
     * @param int $delay Seconds to wait before job becomes ready
     * @param int $ttr Time To Run: seconds a job can be reserved for
     * @return int The new job ID
     */
    public function putInTube($tube, $data, $priority = self::DEFAULT_PRIORITY, $delay = self::DEFAULT_DELAY, $ttr = self::DEFAULT_TTR);

    /**
     * Puts a reserved job back into the ready queue.
     *
     * Marks the jobs state as "ready" to be run by any client.
     * It is normally used when the job fails because of a transitory error.
     *
     * @param object $job Pheanstalk_Job
     * @param int $priority From 0 (most urgent) to 0xFFFFFFFF (least urgent)
     * @param int $delay Seconds to wait before job becomes ready
     * @chainable
     */
    public function release($job, $priority = self::DEFAULT_PRIORITY, $delay = self::DEFAULT_DELAY);

    /**
     * Reserves/locks a ready job in a watched tube.
     *
     * A non-null timeout uses the 'reserve-with-timeout' instead of 'reserve'.
     *
     * A timeout value of 0 will cause the server to immediately return either a
     * response or TIMED_OUT.  A positive value of timeout will limit the amount of
     * time the client will block on the reserve request until a job becomes
     * available.
     *
     * @param int $timeout
     * @return object Pheanstalk_Job
     */
    public function reserve($timeout = null);

    /**
     * Reserves/locks a ready job from the specified tube.
     *
     * A non-null timeout uses the 'reserve-with-timeout' instead of 'reserve'.
     *
     * A timeout value of 0 will cause the server to immediately return either a
     * response or TIMED_OUT.  A positive value of timeout will limit the amount of
     * time the client will block on the reserve request until a job becomes
     * available.
     *
     * Using this method is equivalent to calling watch(), ignore() then 
     * reserve(), with the added benefit that it will not execute uneccessary
     * WATCH or IGNORE commands if the client is already watching the
     * specified tube.
     *
     * @param string $tube
     * @param int $timeout
     * @return object Pheanstalk_Job
     */
    public function reserveFromTube($tube, $timeout = null);

    /**
     * Gives statistical information about the specified job if it exists.
     *
     * @param Pheanstalk_Job or int $job
     * @return object
     */
    public function statsJob($job);

    /**
     * Gives statistical information about the specified tube if it exists.
     *
     * @param string $tube
     * @return object
     */
    public function statsTube($tube);

    /**
     * Gives statistical information about the beanstalkd system as a whole.
     *
     * @return object
     */
    public function stats();

    /**
     * Allows a worker to request more time to work on a job.
     *
     * This is useful for jobs that potentially take a long time, but you still want
     * the benefits of a TTR pulling a job away from an unresponsive worker.  A worker
     * may periodically tell the server that it's still alive and processing a job
     * (e.g. it may do this on DEADLINE_SOON).
     *
     * @param Pheanstalk_Job $job
     * @chainable
     */
    public function touch($job);

    /**
     * Change to the specified tube name for publishing jobs to.
     * This method would be called 'use' if it were not a PHP reserved word.
     *
     * Does not execute a USE command if the client is already using the
     * specified tube.
     *
     * @param string $tube
     * @chainable
     */
    public function useTube($tube);

    /**
     * Add the specified tube to the watchlist, to reserve jobs from.
     *
     * Does not execute a WATCH command if the client is already watching the
     * specified tube.
     *
     * @param string $tube
     * @chainable
     */
    public function watch($tube);

    /**
     * Adds the specified tube to the watchlist, to reserve jobs from, and
     * ignores any other tubes remaining on the watchlist.
     *
     * @param string $tube
     * @chainable
     */
    public function watchOnly($tube);
}

