<?php

class WPTJob_WPTLocation extends Doctrine_Record {
  public function setTableDefinition() {
    $this->setTableName('WPTJob_WPTLocation');

    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('WPTLocationId', 'integer',8);
    $this->hasColumn('WPTJobId', 'integer', 8);

    $this->index('wptjob_wptjoblocation_index_wptjobid', array(
         'fields' => array('WPTJobId')
       ));
  }

  public function setUp() {
    $this->hasOne('WPTLocation', array(
      'local' => 'WPTLocationId',
      'foreign' => 'Id')
    );
  }
}
?>