<?php 
include 'common.inc';
?>
<!DOCTYPE html>
<html>
    <head>
		<title>WebPagetest - Under Construction</title>
        <?php $gaTemplate = 'Construction'; include ('head.inc'); ?>
    </head>
	<body>
        <div class="page">
            <?php
            $tab = 'Home';
            include 'header.inc';
            ?>

            <div class="translucent">
                <p>
                WebPagetest is currently unavailable - A router software update went bad and we are in the process of getting things running again.  
                Shouldn't be down for more than a couple of hours, sorry for the inconvenience (and a perfect case of the risks involved in remotely updating code).
                </p>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
	</body>
</html>
