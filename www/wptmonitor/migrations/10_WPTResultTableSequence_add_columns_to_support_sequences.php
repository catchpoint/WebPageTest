<?php
include 'bootstrap.php';

class UpdateWPTResult1 extends Doctrine_Migration_Base
{
    public function up()
    {
      $this->addColumn('WPTResult', 'WPTLocationId','integer', 8);
      $this->addColumn('WPTResult', 'SequenceNumber','integer', 8);
      $this->addColumn('WPTResult', 'URLScript','string', 255);
      $this->addColumn('WPTResult', 'WPTEventName','string', 255);
      $this->addColumn('WPTResult', 'WPTPageTitle','string', 255);
      $this->addColumn('WPTResult', 'TimeToLoadTitle','integer', 12);
      $this->addColumn('WPTResult', 'TimeToLoadTitleRepeatView','integer', 12);
    }

    public function down()
    {
      $this->removeColumn('WPTResult', 'WPTLocationId');
      $this->removeColumn('WPTResult', 'SequenceNumber');
      $this->removeColumn('WPTResult', 'URLScript');
      $this->removeColumn('WPTResult', 'WPTEventName');
      $this->removeColumn('WPTResult', 'WPTPageTitle');
      $this->removeColumn('WPTResult', 'TimeToLoadTitle');
      $this->removeColumn('WPTResult', 'TimeToLoadTitleRepeatView');

    }
}
?>
