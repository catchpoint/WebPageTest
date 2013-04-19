<?php
require_once('bootstrap.php');
echo "Executing migration scripts...";
$migration = new Doctrine_Migration('migrations');
$migration->migrate();
?>