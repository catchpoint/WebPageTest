<?php
require_once('bootstrap.php');

$migration = new Doctrine_Migration('migrations');
$migration->migrate();
?>