<?php
include 'bootstrap.php';

class UpdateChangeNote extends Doctrine_Migration_Base
{
    public function up()
    {
        $this->addColumn('ChangeNote', 'ChangeNoteFolderId', 'integer', 8);

    }

    public function down()
    {
      $this->removeColumn('ChangeNote', 'ChangeNoteFolderId');
    }
}
?>