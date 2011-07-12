<?php

class WPTMonitorConfig extends Doctrine_Record{
  public function setTableDefinition() {
    $this->setTableName('WPTMonitorConfig');
    $this->hasColumn('EnableRegistration', 'boolean');
    $this->hasColumn('SiteName', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('SiteContact', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('SiteContactEmailAddress', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('SiteHomePageMessage', 'string');
    $this->hasColumn('SiteAlertFromName', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('SiteAlertFromEmailAddress', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('SiteAlertMessage', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('JobProcessorAuthenticationKey', 'string', 255, array('type' => 'string', 'length' => 255));
    $this->hasColumn('DefaultJobsPerMonth', 'integer', 9, array('unsigned' => 'true'));
  }

  public function setUp() {
  }
}

?>