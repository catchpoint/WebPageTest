<?php

class Share extends Doctrine_Record{
  public function setTableDefinition() {
    $this->setTableName('Share');
    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('Active', 'boolean');
    $this->hasColumn('UserId', 'integer', 8, array('type' => 'integer', 'length' => 8));
    $this->hasColumn('ShareWithUserId', 'integer', 8, array('type' => 'integer', 'length' => 8));
    $this->hasColumn('TheTableName', 'string', 255);
    $this->hasColumn('TableItemId', 'integer', 8);
    // 0 - Read, 1 - Update, 2 - Create/Delete, 4 - Execute
    $this->hasColumn('Permissions', 'integer', 8);
    $this->hasColumn('StartSharingDate', 'double');
    $this->hasColumn('StopSharingDate', 'double');

  }

  public function setUp() {
    $this->hasOne('User as Owner', array(
      'local' => 'UserId',
      'foreign' => 'Id'

    ));
    $this->hasOne('User as ShareWithUser', array(
        'local' => 'ShareWithUserId',
        'foreign' => 'Id'

   ));
  }
}

?>