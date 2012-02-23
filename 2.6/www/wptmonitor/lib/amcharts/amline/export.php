<?php
// amcharts.com export to image utility
// set image type (gif/png/jpeg)
$imgtype = 'jpeg';

// set image quality (from 0 to 100, not applicable to gif)
$imgquality = 100;

// get data from $_REQUEST or $_REQUEST ?
$data = &$_REQUEST;

// get image dimensions
$width  = (int) $data['width'];
$height = (int) $data['height'];

// create image object
$img = imagecreatetruecolor($width, $height);

// populate image with pixels
for ($y = 0; $y < $height; $y++) {
  // innitialize
  $x = 0;
  
  // get row data
  $row = explode(',', $data['r'.$y]);
  
  // place row pixels
  $cnt = sizeof($row);
  for ($r = 0; $r < $cnt; $r++) {
    // get pixel(s) data
    $pixel = explode(':', $row[$r]);
    
    // get color
    $pixel[0] = str_pad($pixel[0], 6, '0', STR_PAD_LEFT);
    $cr = hexdec(substr($pixel[0], 0, 2));
    $cg = hexdec(substr($pixel[0], 2, 2));
    $cb = hexdec(substr($pixel[0], 4, 2));
    
    // allocate color
    $color = imagecolorallocate($img, $cr, $cg, $cb);
    
    // place repeating pixels
    $repeat = isset($pixel[1]) ? (int) $pixel[1] : 1;
    for ($c = 0; $c < $repeat; $c++) {
      // place pixel
      imagesetpixel($img, $x, $y, $color);
      
      // iterate column
      $x++;
    }
  }
}

// set proper content type
header('Content-type: image/'.$imgtype);
header('Content-Disposition: attachment; filename="chart.'.$imgtype.'"');

// stream image
$function = 'image'.$imgtype;
if ($imgtype == 'gif') {
  $function($img);
}
else {
  $function($img, null, $imgquality);
}

// destroy
imagedestroy($img);
?>
