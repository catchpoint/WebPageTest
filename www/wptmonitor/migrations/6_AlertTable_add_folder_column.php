<?php
include 'bootstrap.php';

class UpdateAlert extends Doctrine_Migration_Base
{
    public function up()
    {
     //   $this->addColumn('Alert', 'AlertFolderId', 'integer', 8);

    }

    public function down()
    {
      $this->removeColumn('Alert', 'AlertFolderId');
    }
}
?>