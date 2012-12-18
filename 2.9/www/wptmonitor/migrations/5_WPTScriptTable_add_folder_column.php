<?php
include 'bootstrap.php';

class UpdateWPTScript extends Doctrine_Migration_Base
{
    public function up()
    {
        $this->addColumn('WPTScript', 'WPTScriptFolderId', 'integer', 8);

    }

    public function down()
    {
      $this->removeColumn('WPTScript', 'WPTScriptFolderId');
    }
}
?>