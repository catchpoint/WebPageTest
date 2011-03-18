<?php

class WPTLocation extends Doctrine_Record {
  public function setTableDefinition() {
    $this->setTableName('WPTLocation');
    $this->hasColumn('WPTHostId', 'integer', 8);

    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('Active', 'boolean');
    $this->hasColumn('Valid', 'boolean');
    $this->hasColumn('Location', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Label', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Browser', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('ActiveAgents', 'integer', 3, array('unsigned' => 'true'));
    $this->hasColumn('QueueThreshold', 'integer', 3, array('unsigned' => 'true'));
    $this->hasColumn('QueueThresholdGreenLimit', 'integer', 3, array('unsigned' => 'true'));
    $this->hasColumn('QueueThresholdYellowLimit', 'integer', 3, array('unsigned' => 'true'));
    $this->hasColumn('QueueThresholdRedLimit', 'integer', 3, array('unsigned' => 'true'));
  }

  public function setUp() {
    $this->hasOne('WPTHost', array(
                'local' => 'WPTHostId',
                'foreign' => 'Id'
            )
        );
  }
}

?>