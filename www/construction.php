<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
		<title>WebPageTest - Under Construction</title>
        <?php $gaTemplate = 'Construction'; include ('head.inc'); ?>
    </head>
	<body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
        <div class="page">
            <?php
            $tab = 'Home';
            include 'header.inc';
            ?>

            <div class="translucent">
                <p>
                WebPageTest is currently unavailable - A router software update went bad and we are in the process of getting things running again.
                Shouldn't be down for more than a couple of hours, sorry for the inconvenience (and a perfect case of the risks involved in remotely updating code).
                </p>
            </div>

            <?php include('footer.inc'); ?>
        </div>
	</body>
</html>
