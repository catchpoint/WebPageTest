PHP file test
$foo is <?=$foo?>
<br> Test functions
<? echo trim($foo,"'");?>
<br>Test objects
<?=$person->setName('Paul')->setAge(39)->introduce()?>
<br>Test Arrays
<?=$array['a']['aa']?> <?=$array['b']?>
<br>function time 
<? echo time();?>
<br>nocache function time 
<? echo '<? echo time();?>';?>
<br>DONE
