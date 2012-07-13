<?php
include 'bootstrap.php';

class UpdateWPTResult extends Doctrine_Migration_Base
{
    public function up()
    {
      $this->addColumn('WPTResult', 'WPTBandwidthDown', 'integer', 8);
      $this->addColumn('WPTResult', 'WPTBandwidthUp', 'integer', 8);
      $this->addColumn('WPTResult', 'WPTBandwidthLatency', 'integer', 8);
      $this->addColumn('WPTResult', 'WPTBandwidthPacketLoss', 'integer', 8);

    }

    public function down()
    {
      $this->removeColumn('WPTResult', 'WPTBandwidthDown');
      $this->removeColumn('WPTResult', 'WPTBandwidthUp');
      $this->removeColumn('WPTResult', 'WPTBandwidthLatency');
      $this->removeColumn('WPTResult', 'WPTBandwidthPacketLoss');
    }
}
?>