<?php 
include 'common.inc';
require_once('optimization_detail.inc.php');
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest Optimization Check Results<?php echo $testLabel; ?></title>
        <?php include ('head.inc'); ?>
        <style type="text/css">
            td.nowrap {white-space:nowrap;}
            th.nowrap {white-space:nowrap;}
            tr.blank {height:2ex;}
			.indented1 {padding-left: 40pt;}
			.indented2 {padding-left: 80pt;}
            h1
            {
                font-size: larger;
            }
            
            #opt
            {
                margin-bottom: 2em;
            }
            #opt_table
            {
                border: 1px solid black;
                border-collapse: collapse;
            }
            #opt_table th
            {
                padding: 5px;
                border: 1px solid black;
                font-weight: normal;
            }
            #opt_table td
            {
                padding: 5px;
                border: 1px solid black;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Performance Review';
            include 'header.inc';
            ?>
            <div style="text-align:center;">
                <h1>Full Optimization Checklist</h1>
                <img alt="If the optimization results don't display, please try refreshing the page" id="image" src="<?php 
                    echo substr($testPath, 1) . '/' . $run . $cachedText . '_optimization.png"';?>>
                <br>
            </div>

		    <br>
            <?php include('./ads/optimization_middle.inc'); ?>
		    <br>

            <h2>Details:</h2>
            <?php
                require 'optimization.inc';

                require_once('page_data.inc');
                $pageData = loadPageRunData($testPath, $run, $cached);

                require_once('object_detail.inc');
                $secure = false;
                $haveLocations = false;
                $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);

                dumpOptimizationReport($pageData, $requests);
                echo '<p></p><br>';
                include('./ads/optimization_bottom.inc');
                echo '<br>';
                dumpOptimizationGlossary($settings);
            ?>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
