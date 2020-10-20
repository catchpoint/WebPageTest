<?php
header("Content-Type: image/png");
usleep(1000000);
readfile(__DIR__ . '/image.png');