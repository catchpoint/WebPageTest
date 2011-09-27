<?php
include 'bootstrap.php';

class WPTResultTable_add_indexes extends Doctrine_Migration_Base
{
    public function up()
    {
        $dateIndexOptions = array('fields' => array('Date' => array()));
        $statusIndexOptions = array('fields' => array('Status' => array()));
        $runLabelIndexOptions = array('fields' => array('RunLabel' => array()));

        $this->addIndex('WPTResult', 'wptresult_index_date', $dateIndexOptions);
        $this->addIndex('WPTResult', 'wptresult_index_status', $statusIndexOptions);
        $this->addIndex('WPTResult', 'wptresult_index_runlabel', $runLabelIndexOptions);
      }

    public function down()
    {
      $this->removeIndex('User', 'wptresult_index_date');
      $this->removeIndex('User', 'wptresult_index_status');
      $this->removeIndex('User', 'wptresult_index_runlabel');
    }
}
?>