<?php

class WPTJob extends Doctrine_Record {
  public function setTableDefinition() {
    $this->setTableName('WPTJob');

    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('UserId', 'integer', 8, array('type' => 'integer', 'length' => 8));
    $this->hasColumn('WPTJobFolderId', 'integer', 8);
    $this->hasColumn('WPTScriptId', 'integer', 8, array('type' => 'integer', 'length' => 8));
    $this->hasColumn('Active', 'boolean');
    $this->hasColumn('Label', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Description', 'string');
    $this->hasColumn('URL', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('URLScript', 'string');
    $this->hasColumn('NavigationScript', 'string');
    // Do we want to send a request directly to this url before we submit the job. Someimes needed to avoid interstitial pages
    // Will default to waiting 45 seconds after priming before continuing.
    // UPDATE: NO LONGER USED
    $this->hasColumn('PrimeRequest', 'boolean');

    $this->hasColumn('Host', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Location', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('FirstViewOnly', 'boolean');
    $this->hasColumn('Video', 'boolean');
    $this->hasColumn('DownloadResultXml', 'boolean');
    $this->hasColumn('DownloadDetails', 'boolean');
    $this->hasColumn('Frequency', 'integer', 30, array('unsigned' => 'true'));
    $this->hasColumn('MaxDownloadAttempts', 'integer', 8, array('type' => 'integer', 'length' => 8, 'default' => '30'));
    $this->hasColumn('Runs', 'integer', 2, array('unsigned' => 'true', 'default' => '1'));
    $this->hasColumn('RunToUseForAverage', 'integer', 2, array('unsigned' => 'true', 'default' => '0'));
    $this->hasColumn('Lastrun', 'double');
    $this->hasColumn('WPTBandwidthDown', 'integer', 8);
    $this->hasColumn('WPTBandwidthUp', 'integer', 8);
    $this->hasColumn('WPTBandwidthLatency', 'integer', 8);
    $this->hasColumn('WPTBandwidthPacketLoss', 'integer', 8);
    $this->index('wptjob_index_id', array(
                    'fields' => array('Id')
                ));
  }

  public function setUp() {
    $this->hasMany('WPTJob_Alert', array(
      'local' => 'Id',
      'foreign' => 'WPTJobId')
    );
    
    $this->hasMany('WPTResult', array(
      'local' => 'Id',
      'foreign' => 'WPTJobId'
    )
    );
    $this->hasOne('WPTScript', array(
      'local' => 'WPTScriptId',
      'foreign' => 'Id'
    )
    );
    $this->hasOne('User', array(
      'local' => 'UserId',
      'foreign' => 'Id'
    )
    );
    $this->hasOne('WPTJobFolder', array(
      'local' => 'WPTJobFolderId',
      'foreign' => 'id'
    )
    );

  }
}

?>