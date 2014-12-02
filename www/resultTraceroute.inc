<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Traceroute test result<?php echo $testLabel; ?></title>
        <?php
            $gaTemplate = 'Traceroute Result'; 
            $page_keywords = array('Traceroute','Webpagetest','Website Speed Test','Page Speed');
            $page_description = "Traceroute result.";
            include ('head.inc');
            require_once('testStatus.inc');
        ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $nosubheader = true;
            include 'header.inc';
            ?>
            <div class="translucent">
                <h2>Traceroute to <?php echo $url;?></h2>
                From: <?php echo $test['test']['location'];?><br>
                <?php if( (int)$test['test']['runs'] > 1 ) echo 'Test runs: <b>' . $test['test']['runs'] . '</b><br>'; ?>
                <br>
                <div class="centered">
                <?php
                for( $run = 1; $run <= $test['test']['runs']; $run++ )
                {
                    echo "<br><h3>Run $run</h3>";
                    DisplayTraceroute( $testPath, $run );
                }
                ?>
                </div>
            </div>
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>

<?php
/**
* Output the data table for the traceroute
* 
* @param mixed $testPath
* @param mixed $run
*/
function DisplayTraceroute( &$testPath, $run )
{
?>
<table class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
<?php
    $rows = gz_file("$testPath/{$run}_traceroute.txt");
    if( count($rows) > 2 ) {
        $hops = array();
        $addr = '';
        foreach($rows as &$row) {
            $parseLine = str_replace(",", ", ", $row);
            $fields = explode(",", $parseLine);
            $data = array('hop' => trim($fields[0]),
                            'addr' => trim($fields[1]),
                            'time' => trim($fields[2]),
                            'name' => trim($fields[3]));
            if (array_key_exists('hop', $data) && is_numeric($data['hop'])) {
              $data['hop'] = intval($data['hop']);
              if (array_key_exists('addr', $data) && strlen($data['addr']))
                  $addr = $data['addr'];
              if (!array_key_exists('addr', $data) || !strlen($data['addr']))
                $data['addr'] = '-';
              if (!array_key_exists('time', $data) || !strlen($data['time']))
                $data['time'] = '-';
              if (!array_key_exists('name', $data) || !strlen($data['name']))
                $data['name'] = '-';
              $hops[$data['hop']] = $data;
            }
        }
        if (array_key_exists(-1, $hops) &&
            array_key_exists('addr', $hops[-1]) &&
            strlen($hops[-1]['addr']))
            $addr = $hops[-1]['addr'];
        
        $index = 0;
        foreach($hops as $hop => $data) {
            if( $hop > 0 ) {
                $index++;
                if( $index == 1 ) {
                    echo "<caption>Traceroute #$run to $addr</caption>\n";
                    ?>
                    <thead>
                    <tr>
                        <th>Hop</th>
                        <th>Time (ms)</th>
                        <th>IP Address</th>
                        <th>FQDN</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                }
                echo "<tr>\n";
                echo "<td>{$data['hop']}</td>\n";
                echo "<td>{$data['time']}</td>\n";
                echo "<td>{$data['addr']}</td>\n";
                echo "<td>{$data['name']}</td>\n";
                echo "</tr>\n";
            }
        }
        echo "</tbody>\n";
    }
?>
</table>
<?php
}

?>