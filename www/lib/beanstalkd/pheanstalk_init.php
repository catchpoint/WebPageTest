<?php

/**
 * Pheanstalk init script.
 * Sets up include paths based on the directory this file is in.
 * Registers an SPL class autoload function.
 *
 * @author Paul Annesley
 * @package Pheanstalk
 * @licence http://www.opensource.org/licenses/mit-license.php
 */

$pheanstalkClassRoot = dirname(__FILE__) . '/classes';
require_once($pheanstalkClassRoot . '/Pheanstalk/ClassLoader.php');

Pheanstalk_ClassLoader::register($pheanstalkClassRoot);
