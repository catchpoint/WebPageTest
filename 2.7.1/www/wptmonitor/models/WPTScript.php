<?php

class WPTScript extends Doctrine_Record {
  public function setTableDefinition() {
    $this->setTableName('WPTScript');

    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('UserId', 'integer', 8, array('type' => 'integer', 'length' => 8));
    $this->hasColumn('WPTScriptFolderId', 'integer', 8);
    $this->hasColumn('Label', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Description', 'string');
    $this->hasColumn('URL', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('URLScript', 'string');
    $this->hasColumn('NavigationScript', 'string');
    // Send basic auth
    $this->hasColumn('Authenticate', 'boolean');
    $this->hasColumn('AuthUser', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('AuthPassword', 'string', 255, array('type' => 'string', 'length' => 255));
    // Is this a multi step/page test
//    $this->hasColumn('MultiStep', 'boolean');
    // Apply validation rule
    $this->hasColumn('Validate', 'boolean');
    // REGEX of http request to use for validation of result. Copied to result table at time of job execution
    $this->hasColumn('ValidationRequest', 'string', 255, array('type' => 'string', 'length' => 255));
    // The type of validation. 0 - Contains 1 - Does Not Contain ... ( Copied to result table at time of job execution )
    $this->hasColumn('ValidationType', 'integer', 2, array('unsigned' => 'true', 'default' => '0'));
    // What to mark the result if ValidationRequest evaluates true against ValidationType. 0 - Valid 1 - Invalid 2 - Needs Review
    // Copied to result table at time of job execution
    $this->hasColumn('ValidationMarkAs',     'integer', 2, array('unsigned' => 'true', 'default' => '0'));
    $this->hasColumn('ValidationMarkAsElse', 'integer', 2, array('unsigned' => 'true', 'default' => '0'));
//    $this->hasColumn('WPTBandwidthDown', 'integer', 8);
//    $this->hasColumn('WPTBandwidthUp', 'integer', 8);
//    $this->hasColumn('WPTBandwidthLatency', 'integer', 8);
//    $this->hasColumn('WPTBandwidthPacketLoss', 'integer', 8);
  }

  public function setUp() {
    $this->hasOne('User', array(
      'local' => 'UserId',
      'foreign' => 'Id'
    )
    );
    $this->hasOne('WPTScriptFolder', array(
      'local' => 'WPTScriptFolderId',
      'foreign' => 'id'
    ));

  }
}

?>