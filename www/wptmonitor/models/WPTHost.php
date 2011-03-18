<?php

class WPTHost extends Doctrine_Record {
  public function setTableDefinition() {
    $this->setTableName('WPTHost');

    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('Active', 'boolean');
    $this->hasColumn('Label', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Description', 'string');
    $this->hasColumn('HostURL', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Contact', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('ContactEmailAddress', 'string', 255, array('type' => 'string', 'length' => 255));
  }

  public function setUp() {
    $this->hasMany('WPTLocation', array(
      'local' => 'Id',
      'foreign' => 'WPTHostId'
    ));
  }
}

?>