<script type="text/javascript">
  function changeTimeZone(zone) {
    idx = zone.selectedIndex;
    document.getElementById('timeZoneForm').submit();
  }
</script>
<form id="timeZoneForm" action="">
  <?php
    include_once 'utils.inc';
    if (array_key_exists('edited_user_timezone', $_REQUEST) && !empty($_REQUEST['edited_user_timezone'])) {
      $_SESSION['ls_timezone'] = $_REQUEST['edited_user_timezone'];
    } else {
      if (!isset($_SESSION['ls_timezone'])){
        $_SESSION['ls_timezone'] = 'GMT';
      }
    }

  date_default_timezone_set($_SESSION['ls_timezone']);

  print date('m/d/Y H:i:s') . "<br>Timezone: ";
  print get_tz_options(date_default_timezone_get(), "edited_user_timezone", "Timezone", "", "changeTimeZone(this);");
  ?>
</form>