<?php

class Alert extends Doctrine_Record {
  public function setTableDefinition() {
    $this->setTableName('Alert');

    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('AlertFolderId', 'integer', 8);

    $this->hasColumn('Active', 'boolean');
    $this->hasColumn('UserId', 'integer', 8, array('type' => 'integer', 'length' => 8));
    $this->hasColumn('Label', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Description', 'string');
    $this->hasColumn('EmailAddresses', 'string');
    $this->hasColumn('AlertOnType', 'enum', null,
      array('values' => array('Response Code', 'Response Time', 'Validation Code')));
    $this->hasColumn('AlertOn', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('AlertOnComparator', 'enum', null,
      array('values' => array('equals', 'not equals', 'greater than', 'less than')));
    $this->hasColumn('AlertOnValue', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('AlertThreshold', 'integer', 8, array('type' => 'integer', 'length' => 8));
    $this->hasColumn('LastAlertTime', 'timestamp');
  }

  public function setUp() {
    $this->hasOne('User', array(
      'local' => 'UserId',
      'foreign' => 'Id'
    )
    );
    $this->hasOne('AlertFolder', array(
      'local' => 'AlertFolderId',
      'foreign' => 'id'
    ));
  }
}

?>