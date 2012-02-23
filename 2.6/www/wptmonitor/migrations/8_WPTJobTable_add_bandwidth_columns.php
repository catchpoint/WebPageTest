<?php
include 'bootstrap.php';

class UpdateWPTJob1 extends Doctrine_Migration_Base
{
    public function up()
    {
      $this->addColumn('WPTJob', 'WPTBandwidthDown', 'integer', 8);
      $this->addColumn('WPTJob', 'WPTBandwidthUp', 'integer', 8);
      $this->addColumn('WPTJob', 'WPTBandwidthLatency', 'integer', 8);
      $this->addColumn('WPTJob', 'WPTBandwidthPacketLoss', 'integer', 8);

    }

    public function down()
    {
      $this->removeColumn('WPTJob', 'WPTBandwidthDown');
      $this->removeColumn('WPTJob', 'WPTBandwidthUp');
      $this->removeColumn('WPTJob', 'WPTBandwidthLatency');
      $this->removeColumn('WPTJob', 'WPTBandwidthPacketLoss');
    }
}
?>