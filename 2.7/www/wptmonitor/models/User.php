<?php

class User extends Doctrine_Record{
  public function setTableDefinition() {
    $this->setTableName('User');
    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('FirstName', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('LastName', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Username', 'string', 255, array( 'unique' => true,'type' => 'string', 'length' => 255));
    $this->hasColumn('EmailAddress', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Password', 'string', 255, array('type' => 'string', 'length' => 255));
    // Type 1 - Read Only
    $this->hasColumn('Type', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('IsActive', 'integer', 1, array('type' => 'integer', 'length' => 1, 'default' => '1'));
    $this->hasColumn('IsSuperAdmin', 'integer', 1, array('type' => 'integer', 'length' => 1, 'default' => '0'));
    // Maximum number of job executions per month
    // If zero the account is basically read only
    $this->hasColumn('MaxJobsPerMonth', 'integer', 8);
    $this->hasColumn('TimeZone', 'string', 60, array('type' => 'string', 'length' => 60));
  }

  public function setUp() {
    $this->hasMany('WPTJob', array(
      'local' => 'Id',
      'foreign' => 'UserId'
    )
    );
    $this->hasMany('WPTScript', array(
      'local' => 'Id',
      'foreign' => 'WPTScriptId'
    )
    );
  }
}

?>