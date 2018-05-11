<?php
/**
 * The browser a test ran in.
 * User: nkuhn
 * Date: 2017-11-24
 */
class Browser
{
    private $name;
    private $version;

    public function __construct($name, $version)
    {
        $this->name = $name;
        $this->version = $version;
    }

    public function getName()
    {
        return $this->name;
    }

    public function getVersion()
    {
        return $this->version;
    }


}