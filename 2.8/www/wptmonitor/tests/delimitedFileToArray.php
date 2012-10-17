<?php
include '../wpt_functions.inc';

//  $id = submitRequest("http://wpt.mtvly.com/runtest.php", "http://www.yahoo.com", "Yahoo", "Sydney_Au", "1", "1", "on");
//  echo $id;


$data = file_get_contents("wpt_raw_page_data.tsv");
$a = delimitedToArray($data,"\t", true);
print_r($a);
print_r(getArrayFor($a,'Load Time (ms)'));
print_r(array_sum(getArrayFor($a,'Load Time (ms)')));

//function delimitedToArray($data, $delimiter, $header=false){
//  $results = array();
//  $lines = explode("\n",$data);
//  $headers = array();
//  if ( $header ){
//    $heads = explode($delimiter,$lines[0]);
//    foreach ($heads as $key=>$h){
//      $headers[] = trim($h);
//    }
//  }
//  foreach($lines as $key=>$line){
//    if ( $header && $key == 0 ){
//      continue;
//    }
//    $items = explode($delimiter,$line);
//    foreach($items as $key=>$item){
//      $label = $headers[$key];
//      $result[$label] = $item;
//    }
//    $results[]=$result;
//  }
//  return $results;
//}
?>