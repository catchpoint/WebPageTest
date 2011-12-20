<?php

class WPTResult extends Doctrine_Record
{
  public function setTableDefinition()
  {
    $this->setTableName('WPTResult');

    $this->hasColumn('Id', 'integer', 8, array('type' => 'integer', 'length' => 8, 'primary' => true, 'autoincrement' => true));
    $this->hasColumn('Date', 'double');
    $this->hasColumn('WPTJobId', 'integer', 8);
    // Is this a multi step/page test
    $this->hasColumn('MultiStep', 'boolean');
    // Apply validation rule
    $this->hasColumn('Validate', 'boolean');
    // REGEX of http request to use for validation of result. Copied from script at time of job execution
    $this->hasColumn('ValidationRequest', 'string', 255, array('type' => 'string', 'length' => 255));
    // The type of validation. 0 - Contains 1 - Does Not Contain ... ( Copied from script at time of job execution )
    $this->hasColumn('ValidationType', 'integer', 2, array('unsigned' => 'true', 'default' => '0'));
    // What to mark the result if ValidationRequest evaluates true against ValidationType. 0 - Valid 1 - Invalid 2 - Needs Review
    // Copied from script at time of job execution
    $this->hasColumn('ValidationMarkAs', 'integer', 2, array('unsigned' => 'true', 'default' => '0'));
    $this->hasColumn('ValidationMarkAsElse', 'integer', 2, array('unsigned' => 'true', 'default' => '0'));
    // 0 - Valid 1 - Invalid 2 - Needs Review
    $this->hasColumn('ValidationState', 'integer', 2, array('unsigned' => 'true', 'default' => '0'));
    $this->hasColumn('DialerId', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('RunLabel', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('WPTHost', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('WPTResultId', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('WPTResultXMLLocation', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('Status', 'string', 10, array('type' => 'string', 'length' => 10));
    $this->hasColumn('DownloadResultXml', 'boolean');
    $this->hasColumn('DownloadDetails', 'boolean');
    $this->hasColumn('MaxDownloadAttempts', 'integer', 3);
    $this->hasColumn('DownloadAttempts', 'integer', 3);
    $this->hasColumn('Runs', 'integer', 2, array('unsigned' => 'true', 'default' => '1'));
    $this->hasColumn('RunToUseForAverage', 'integer', 2, array('unsigned' => 'true', 'default' => '0'));
    $this->hasColumn('FirstStatusUpdate', 'double');
    $this->hasColumn('LastStatusUpdate', 'double');

    $this->hasColumn('AvgFirstViewLoadTime', 'integer', 12);
    $this->hasColumn('AvgFirstViewFirstByte', 'integer', 12);
    $this->hasColumn('AvgFirstViewStartRender', 'integer', 12);
    $this->hasColumn('AvgFirstViewDocCompleteTime', 'integer', 12);
    $this->hasColumn('AvgFirstViewDocCompleteRequests', 'integer', 4);
    $this->hasColumn('AvgFirstViewDocCompleteBytesIn', 'integer', 12);
    $this->hasColumn('AvgFirstViewDomTime', 'integer', 12);
    $this->hasColumn('AvgFirstViewFullyLoadedTime', 'integer', 12);
    $this->hasColumn('AvgFirstViewFullyLoadedRequests', 'integer', 4);
    $this->hasColumn('AvgFirstViewFullyLoadedBytesIn', 'integer', 12);

//    $this->hasColumn('AvgFirstViewScoreCache', 'integer', 4);
//    $this->hasColumn('AvgFirstViewScoreCdn', 'integer', 4);
//    $this->hasColumn('AvgFirstViewScoreGzip', 'integer', 4);
//    $this->hasColumn('AvgFirstViewScoreCookies', 'integer', 4);
//    $this->hasColumn('AvgFirstViewScoreKeepAlive', 'integer', 4);
//    $this->hasColumn('AvgFirstViewScoreMinify', 'integer', 4);
//    $this->hasColumn('AvgFirstViewScoreCombine', 'integer', 4);
//    $this->hasColumn('AvgFirstViewScoreCompress', 'integer', 4);
//    $this->hasColumn('AvgFirstViewScoreEtags', 'integer', 4);

    $this->hasColumn('AvgRepeatViewLoadTime', 'integer',12);
    $this->hasColumn('AvgRepeatViewFirstByte', 'integer',12);
    $this->hasColumn('AvgRepeatViewStartRender', 'integer',12);
    $this->hasColumn('AvgRepeatViewDocCompleteTime', 'integer',12);
    $this->hasColumn('AvgRepeatViewDocCompleteRequests', 'integer', 4);
    $this->hasColumn('AvgRepeatViewDocCompleteBytesIn', 'integer', 12);
    $this->hasColumn('AvgRepeatViewDomTime', 'integer', 12);
    $this->hasColumn('AvgRepeatViewFullyLoadedTime', 'integer',12);
    $this->hasColumn('AvgRepeatViewFullyLoadedRequests', 'integer', 4);
    $this->hasColumn('AvgRepeatViewFullyLoadedBytesIn', 'integer', 12);

//    $this->hasColumn('AvgRepeatViewScoreCache', 'integer', 4);
//    $this->hasColumn('AvgRepeatViewScoreCdn', 'integer', 4);
//    $this->hasColumn('AvgRepeatViewScoreGzip', 'integer', 4);
//    $this->hasColumn('AvgRepeatViewScoreCookies', 'integer', 4);
//    $this->hasColumn('AvgRepeatViewScoreKeepAlive', 'integer', 4);
//    $this->hasColumn('AvgRepeatViewScoreMinify', 'integer', 4);
//    $this->hasColumn('AvgRepeatViewScoreCombine', 'integer', 4);
//    $this->hasColumn('AvgRepeatViewScoreCompress', 'integer', 4);
//    $this->hasColumn('AvgRepeatViewScoreEtags', 'integer', 4);
    $this->hasColumn('WPTBandwidthDown', 'integer', 8);
    $this->hasColumn('WPTBandwidthUp', 'integer', 8);
    $this->hasColumn('WPTBandwidthLatency', 'integer', 8);
    $this->hasColumn('WPTBandwidthPacketLoss', 'integer', 8);

    $this->index('wptresult_index_wptjobid', array(
      'fields' => array('WPTJobId')
    )
    );
    $this->index('wptresult_index_date', array(
      'fields' => array('Date')
    )
    );
    $this->index('wptresult_index_status', array(
      'fields' => array('Status')
    )
    );
    $this->index('wptresult_index_runlabel', array(
      'fields' => array('RunLabel')
    )
    );


  }
   public function setUp()
    {
        $this->hasOne('WPTJob', array(
                'local' => 'WPTJobId',
                'foreign' => 'Id'
            )
        );
    }
}
?>