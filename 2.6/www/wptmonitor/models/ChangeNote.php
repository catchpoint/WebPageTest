<?php

class ChangeNote extends Doctrine_Record {
  public function setTableDefinition() {
    $this->setTableName('ChangeNote');

    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('ChangeNoteFolderId', 'integer', 8);
    
    $this->hasColumn('UserId', 'integer', 8, array('type' => 'integer', 'length' => 8));
    $this->hasColumn('Date', 'double');
    $this->hasColumn('Public', 'boolean');
    $this->hasColumn('ReleaseInfo', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Label', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Description', 'string');
  }

  public function setUp() {
    $this->hasOne('ChangeNoteFolder', array(
      'local' => 'ChangeNoteFolderId',
      'foreign' => 'id'
    ));
    $this->hasOne('User', array(
      'local' => 'UserId',
      'foreign' => 'Id'
    ));
  }
}

?>