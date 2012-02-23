<?php
include 'bootstrap.php';

class UpdateWPTJob extends Doctrine_Migration_Base
{
    public function up()
    {
        $this->addColumn('WPTJob', 'WPTJobFolderId', 'integer', 8);

    }

    public function down()
    {
      $this->removeColumn('WPTJob', 'WPTJobFolderId');
    }
}
?>