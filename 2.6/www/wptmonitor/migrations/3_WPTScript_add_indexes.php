<?php
include 'bootstrap.php';

class WPTSCriptTable_add_indexes extends Doctrine_Migration_Base
{
    public function up()
    {
        $idIndexOptions = array('fields' => array('Id' => array()));

        $this->addIndex('WPTResult', 'wptscript_index_id', $idIndexOptions);
      }

    public function down()
    {
      $this->removeIndex('User', 'wptresult_index_id');
    }
}
?>