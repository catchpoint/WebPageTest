<?php

class WPTJobFolder extends Doctrine_Record {
  public function setTableDefinition() {
    $this->setTableName('WPTJobFolder');
    $this->hasColumn('root_id', 'integer', 8);
    $this->hasColumn('Label', 'string', 255);
  }

  public function setUp() {
    $options = array(
            'hasManyRoots'     => true,
            'rootColumnName'   => 'root_id'
        );
    $this->actAs('NestedSet',$options);

    $this->hasMany('WPTJob', array(
      'local' => 'Id',
      'foreign' => 'WPTJobFolderId'
    )
    );
  }
}

?>