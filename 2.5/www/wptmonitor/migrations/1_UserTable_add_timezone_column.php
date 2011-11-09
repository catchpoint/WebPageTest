<?php
include 'bootstrap.php';

class UpdateUser extends Doctrine_Migration_Base
{
    public function up()
    {
        $this->addColumn('User', 'timezone', 'string', 60);

    }

    public function down()
    {
      $this->removeColumn('User', 'timezone');
    }
}
?>