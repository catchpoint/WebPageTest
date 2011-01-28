<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Bulk test result</title>
        <?php
            include ('head.inc');
            include ('testStatus.inc');
        ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            include 'header.inc';
            ?>
            <div class="translucent">
                <h2>Bulk Test</h2>
                <p>
                From: <?php echo $test['test']['location'];?><br>
                <?php if( $dom ) echo 'DOM Element: <b>' . $dom . '</b><br>'; ?>
                <?php if( $test['test']['fvonly'] ) echo '<b>First View only</b><br>'; ?>
                <?php if( (int)$test['test']['runs'] > 1 ) echo 'Test runs: <b>' . $test['test']['runs'] . '</b><br>'; ?>
                <?php if( (int)$test['test']['authenticated'] == 1) echo '<br><b>Authenticated: ' . $login . '</b>'; ?>
                <?php if( (int)$test['test']['connections'] !== 0) echo '<b>' . $test['test']['connections'] . ' Browser connections</b><br>';?>
                <?php if( $test['test']['script'] ) echo '<b>Scripted test</b><br>'; ?>
                </p>
                <p>
                <?php
                if( gz_is_file("$testPath/tests.json") )
                {
                    $tests = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
                    // Variable to track whether any test is still in-complete.
                    $all_tests_completed = true;
                ?>
                <table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                    <tr>
                        <th align="center" class="border" valign="middle">Url</th>
                        <th align="center" class="border" valign="middle">Median load time (First view)</th>
                        <th align="center" class="border" valign="middle">Median load time (Repeat view)</th>
                        <th align="center" class="border" valign="middle">Raw page data</th>
                        <th align="center" class="border" valign="middle">Raw object data</th>
                        <th align="center" class="border" valign="middle">Http archive (.har)</th>
                    </tr>
                <?php
                    foreach( $tests as &$test )
                    {
                        $current_id = $test['id'];
                        $current_url = $test['url'];
                        $current_testPath = './' . GetTestPath($current_id);
                        $current_test = parse_ini_file("$current_testPath/testinfo.ini",true);
                        echo "\n";
                        $fileUrl = GetFileUrl($current_url);

                        // Collect the column values.
                        $url_column = "<a href=\"/result/{$current_id}/\" target=\"_blank\">" . htmlspecialchars(ShortenUrl($current_url)) . "</a>";
                        // Path both id and parsed test values since it is not easy to get id from parsed $current_test.
                        $status_column = GetTestStatusText($current_id, $current_test);
                        $fvMedian_column = "";
                        $rvMedian_column = "";
                        $page_data_column = "";
                        $object_data_column = "";
                        $http_archive_column = "";
                        $csi_data_column = "";
                        if( (isset($current_test['test']) && isset($current_test['test']['completeTime'])) )
                        {
                          $status_column = "Test completed";
                          // Test-run is complete.
                          $current_pageData = loadAllPageData($current_testPath);
                          $fvMedian = GetMedianRun($current_pageData, 0);
                          $rvMedian = GetMedianRun($current_pageData, 1);
                          $page_data_column = "<a href=\"/result/$current_id/{$current_id}_{$fileUrl}_page_data.csv\">Download Page Data</a>";;
                          $object_data_column = "<a href=\"/result/$current_id/{$current_id}_{$fileUrl}_requests.csv\">Download Object Data</a>";
                          $http_archive_column = "<a href=\"/export.php?test=" . $current_id . "\">Download HAR</a>";
                          if ($fvMedian)
                          {
                            $fvMedian_column = number_format($current_pageData[$fvMedian][0]['loadTime'] / 1000.0, 3);
                            // We will display repeat-view number only if there
                            // is a value for the first-view to be consistent
                            // with the result.inc implementation.
                            if ($rvMedian)
                            {
                                $rvMedian_column = number_format($current_pageData[$rvMedian][1]['loadTime'] / 1000.0, 3);
                            }
                          }
                        }
                        else
                        {
                                $all_tests_completed = false;
                        }
                ?>
                    <tr>
                        <td align="center" class="border" valign="middle"><?php echo $url_column; ?></td>
                        <?php if ($status_column == "Test completed")
                        {?>
                                <td align="center" class="border" valign="middle"><?php echo $fvMedian_column; ?></td>
                                <td align="center" class="border" valign="middle"><?php echo $rvMedian_column; ?></td>
                                <td align="center" class="border" valign="middle"><?php echo $page_data_column; ?></td>
                                <td align="center" class="border" valign="middle"><?php echo $object_data_column; ?></td>
                                <td align="center" class="border" valign="middle"><?php echo $http_archive_column; ?></td>
                        <?php }
                        else
                        { ?>
                                <td align="center" class="border" valign="middle" colspan="5"><?php echo $status_column; ?></td>
                        <?php } ?>
                    </tr>
                <?php
                    }
                ?>
                </table>
                <?php
                    if (!$all_tests_completed)
                    {
                        echo "<br>Tests are not yet complete. Please <a href=\"javascript:location.reload(true)\">refresh</a> this page periodically.";
                    }
                }
                ?>
                </p>
            </div>
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
