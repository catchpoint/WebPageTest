<script type="text/javascript">
  function changeTimeZone(zone){
    idx = zone.selectedIndex;
    document.getElementById('timeZoneForm').submit();
  }
</script>
  <form id="timeZoneForm" action="">
<?php
  include_once 'utils.inc';

  if ($timezone=$_REQUEST['edited_user_timezone']){
    $_SESSION['ls_timezone'] = $timezone;
  }
    date_default_timezone_set($_SESSION['ls_timezone']);

  print date('m/d/Y H:i:s')."<br>Timezone: ";
  print get_tz_options(date_default_timezone_get(),"edited_user_timezone","Timezone","","changeTimeZone(this);");
?>
</form>