<?php
require( "login/login.php" );
include 'monitor.inc';
global $wptResultStatusCodes;
date_default_timezone_set( $_SESSION[ 'ls_timezone' ] );

//$_REQUEST['folderId'];
$user_id = getCurrentUserId();

// Defaults
$resultsFilterField = "";
$resultsFilterValue = "";

// Handle resultsFilter settings
// TODO: Refactor filter feature into common code. It's duplicated
if ( isset( $_REQUEST[ 'clearFilter' ] ) ) {
  unset( $_SESSION[ 'resultsFilterField' ] );
  unset( $_SESSION[ 'resultsFilterValue' ] );
  unset( $_SESSION[ 'resultsFilterStartDateTime' ] );
  unset( $_SESSION[ 'resultsFilterEndDateTime' ] );
} else {
  if ( isset( $_REQUEST[ 'filterField' ] ) && $resultsFilterField = $_REQUEST[ 'filterField' ] ) {
    $_SESSION[ 'resultsFilterField' ] = $resultsFilterField;
  }
  if ( isset( $_REQUEST[ 'filterValue' ] ) && $resultsFilterValue = $_REQUEST[ 'filterValue' ] ) {
    $_SESSION[ 'resultsFilterValue' ] = $resultsFilterValue;
  }
}
if ( isset( $_SESSION[ 'resultsFilterField' ] ) ) {
  $resultsFilterField = $_SESSION[ 'resultsFilterField' ];
}
if ( isset( $_SESSION[ 'resultsFilterValue' ] ) ) {
  $resultsFilterValue = $_SESSION[ 'resultsFilterValue' ];
}
if ( isset( $_REQUEST[ 'startDateTime' ] ) ) {
  $startDateTime = $_REQUEST[ 'startDateTime' ];
} else {
  if ( isset( $_REQUEST[ 'startMonth' ] ) ) {
    $startDateTime = mktime( $_REQUEST[ 'startHour' ], $_REQUEST[ 'startMinute' ], 0, $_REQUEST[ 'startMonth' ], $_REQUEST[ 'startDay' ], $_REQUEST[ 'startYear' ] );
  } else if ( isset( $_SESSION[ 'resultsFilterStartDateTime' ] ) ) {
    $startDateTime = $_SESSION[ 'resultsFilterStartDateTime' ];
  }
}
if ( isset( $_REQUEST[ 'endDateTime' ] ) ) {
  $endDateTime = $_REQUEST[ 'endDateTime' ];
} else {
  if ( isset( $_REQUEST[ 'endMonth' ] ) ) {
    $endDateTime = mktime( $_REQUEST[ 'endHour' ], $_REQUEST[ 'endMinute' ], 0, $_REQUEST[ 'endMonth' ], $_REQUEST[ 'endDay' ], $_REQUEST[ 'endYear' ] )+120;
  } else if ( isset( $_SESSION[ 'resultsFilterEndDateTime' ] ) ) {
    $endDateTime = $_SESSION[ 'resultsFilterEndDateTime' ];
  }
}

if ( !isset( $startDateTime ) && !isset( $_SESSION[ 'resultsFilterStartDateTime' ] ) ) {
  $startDateTime = time() - 86400;
}
if ( !isset( $endDateTime ) && !isset( $_SESSION[ 'resultsFilterEndDateTime' ] ) ) {
  $endDateTime = time();
}

$_SESSION[ 'resultsFilterStartDateTime' ] = $startDateTime;
$_SESSION[ 'resultsFilterEndDateTime' ] = $endDateTime;

$smarty->assign( 'startTime', $startDateTime );
$smarty->assign( 'endTime', $endDateTime );

if ( isset( $_REQUEST[ 'job_id' ] ) ) {
  $job_id = $_REQUEST[ 'job_id' ];
  $ownerId = getOwnerIdFor( $job_id, 'WPTJob' );
} else {
  $ownerId = null;
}

// If a job_id is passed in, set the filter to show only results for that job_id
if ( isset( $job_id ) ) {
  $_SESSION[ 'resultsFilterField' ] = "WPTJob.Id";
  $_SESSION[ 'resultsFilterValue' ] = $job_id[ 0 ];
}

if ( isset( $_REQUEST[ 'showResultsThumbs' ] ) && $showThumbs = $_REQUEST[ 'showResultsThumbs' ] ) {
  $_SESSION[ 'showResultsThumbs' ] = $showThumbs;
} else if ( !isset( $_SESSION[ 'showResultsThumbs' ] ) ) {
  $_SESSION[ 'showResultsThumbs' ] = 'false';
}
$smarty->assign( 'showResultsThumbs', $_SESSION[ 'showResultsThumbs' ] );

if ( isset( $_REQUEST[ 'showWaterfallThumbs' ] ) && $showWaterfallThumbs = $_REQUEST[ 'showWaterfallThumbs' ] ) {
  $_SESSION[ 'showWaterfallThumbs' ] = $showWaterfallThumbs;
} else if ( !isset( $_SESSION[ 'showWaterfallThumbs' ] ) ) {
  $_SESSION[ 'showWaterfallThumbs' ] = 'false';
}

$smarty->assign( 'showWaterfallThumbs', $_SESSION[ 'showWaterfallThumbs' ] );

// Handle pager settings
if ( isset( $_REQUEST[ 'currentPage' ] ) ) {
  $_SESSION[ 'resultsCurrentPage' ] = $_REQUEST[ 'currentPage' ];
}
if ( !isset( $_SESSION[ 'resultsCurrentPage' ] ) ) {
  $_SESSION[ 'resultsCurrentPage' ] = 1;
}
$resultsCurrentPage = $_SESSION[ 'resultsCurrentPage' ];

// Order by direction
if ( isset( $_REQUEST[ 'orderByDir' ] ) && ( $orderByDir = $_REQUEST[ 'orderByDir' ] ) ) {
  $_SESSION[ 'orderResultsByDirection' ] = $orderByDir;
} else {
  if ( !isset( $_SESSION[ 'orderResultsByDirection' ] ) ) {
    $_SESSION[ 'orderResultsByDirection' ] = "DESC";
  }
}
if ( $_SESSION[ 'orderResultsByDirection' ] == "ASC" ) {
  $orderByDirInv = "DESC";
} else {
  $orderByDirInv = "ASC";
}

// Order by
if ( !isset( $_REQUEST[ 'orderBy' ] ) ) {
  if ( !isset( $_SESSION[ 'orderResultsBy' ] ) ) {
    $orderBy = "Date";
  } else {
    $orderBy = $_SESSION[ 'orderResultsBy' ];
  }
} else {
  $orderBy = $_REQUEST[ 'orderBy' ];
}
$_SESSION[ 'orderResultsBy' ] = $orderBy;

$smarty->assign( 'orderResultsBy', $_SESSION[ 'orderResultsBy' ] );
$smarty->assign( 'orderResultsByDirection', $_SESSION[ 'orderResultsByDirection' ] );
$smarty->assign( 'orderResultsByDirectionInv', $orderByDirInv );
$smarty->assign( 'resultsFilterField', $resultsFilterField );
$smarty->assign( 'resultsFilterValue', $resultsFilterValue );

$orderBy = 'r.' . $_SESSION[ 'orderResultsBy' ] . ' ' . $_SESSION[ 'orderResultsByDirection' ];
// Get list of job folders that this user has at least read rights to
$folderShares = getFolderShares( $user_id, 'WPTJob', $ownerId );
$folderIds = array();
foreach ( $folderShares as $key => $folderShare ) {
  foreach ( $folderShare as $k => $share ) {
    $folderIds[ ] = $k;
  }
}
try
{
  $q = Doctrine_Query::create()->from( 'WPTResult r, r.WPTJob j' )->orderBy( $orderBy );

  if ( $folderIds ) {
    $q->whereIn( 'r.WPTJob.WPTJobFolderId', $folderIds );
  } else {
    // $q->andWhere('s.UserId = ?', $user_id);
    $q->andWhere( 'r.WPTJob.UserId = ?', $user_id );
  }

  if ( $resultsFilterField && $resultsFilterValue ) {
    if ( $resultsFilterField == "WPTJob.Id" ) {
      // 2012/01/21: Added sequence support
      if (($idx = strrpos($resultsFilterValue,":")) > 0){
        $sequenceNumber = substr($resultsFilterValue,$idx+1);
        $resultsFilterValue = substr($resultsFilterValue,0,$idx);
        $q->andWhere( 'r.SequenceNumber = ?', $sequenceNumber);
      }
      $q->andWhere( 'r.' . $resultsFilterField . '= ?', $resultsFilterValue )
              ->andWhere( 'r.Date < ?', $endDateTime )
              ->andWhere( 'r.Date > ?', $startDateTime );
    } else {
      $q->andWhere( 'r.' . $resultsFilterField . ' LIKE ?', '%' . $resultsFilterValue . '%' )
              ->andWhere( 'r.Date < ?', $endDateTime )
              ->andWhere( 'r.Date > ?', $startDateTime );
    }
  } else {
    $q->andWhere( 'r.Date < ?', $endDateTime )
            ->andWhere( 'r.Date > ?', $startDateTime );
  }
  $q->orderBy('r.WPTResultId');
  $pager = new Doctrine_Pager( $q, $resultsCurrentPage, $resultsPerPage );
  $result = $pager->execute();
  $smarty->assign( 'wptResultURL', $wptResult );
  $smarty->assign( 'currentPage', $resultsCurrentPage );
  $smarty->assign( 'maxpages', $pager->getLastPage() );
  $smarty->assign( 'result', $result );
  $smarty->assign( 'statusCodes', $wptResultStatusCodes );

}
catch ( Exception $e )
{
  if ( !isset($wptResultId)){
    $wptResultId="NULL";
  }
  error_log( "[WPTMonitor] Failed while Listing jobs: " . $wptResultId . " message: " . $e->getMessage() );
  print 'Exception : ' . $e->getMessage();
}
unset( $pager );
unset( $result );
$smarty->display( 'job/listResults.tpl' );

?>