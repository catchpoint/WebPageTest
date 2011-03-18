<?php

class WPTJob_Alert extends Doctrine_Record {
  public function setTableDefinition() {
    $this->setTableName('WPTJob_Alert');

    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('AlertId', 'integer',8);
    $this->hasColumn('WPTJobId', 'integer', 8);
  }

  public function setUp() {

  }
}
?>