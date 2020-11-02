<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
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