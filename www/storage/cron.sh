#!/bin/bash
#
# Copyright 2011 Google Inc. All Rights Reserved.
# Author: zhaoq@google.com (Qi Zhao)

cd /usr/local/google/googlecode/webpagetest/www/webpagetest/storage
php cron.php >> /usr/local/google/googlecode/webpagetest/www/webpagetest/storage/log.txt
