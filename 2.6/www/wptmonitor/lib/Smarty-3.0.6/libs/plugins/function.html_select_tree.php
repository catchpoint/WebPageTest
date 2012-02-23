<?php
function smarty_function_html_select_tree($params, $template) {
  require_once(SMARTY_PLUGINS_DIR . 'shared.escape_special_chars.php');
  $shares = '';
  $permission = '-1';
  $tree = '';
  $output = '';
  $selected = '';
  foreach ($params as $_key => $_val) {
    switch ($_key) {
      case 'tree':
        $$_key = $_val;
        break;
      case 'shares':
        $$_key = $_val;
        break;
      case 'permission':
        $$_key = $_val;
        break;
      case 'selected':
        $$_key = $_val;
        break;
    }
  }
  $output .= '<optgroup label="My Folders">';
    foreach ($tree as $t) {
    $i = $t['level'];
    $output .= '<option value="' . $t['id'] . '"';
    if ($t['id'] == $selected) {
      $output .= ' selected="true" ';
    }
    $output .= '>';
    if ($t['level'] > 0) {
      while ($i > 0) {
        $output .= "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
        $i--;
      }
      $output .= '|__ ';
    }
    $output .= $t['Label'] . '</option>';
  }
  if ($shares) {
    $output .= '<optgroup label="Shares">';
    foreach ($shares as $key => $share) {
      foreach ($share as $k => $t) {
        if ($t['Permission'] >= $permission) {
          $output .= '<option value="' . $k . '"';
          if ($k == $selected) {
            $output .= ' selected="true" ';
          }
          $output .= '>';
          $output .= '[ ' . $key . ' ] -- ' . $t['Label'] . '</option>';
        }
      }
    }
  }
  return $output;

}

?>