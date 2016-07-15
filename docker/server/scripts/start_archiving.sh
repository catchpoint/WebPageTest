#!/bin/bash
if (grep -Fxq "^archive_days=" /var/www/html/settings/settings.ini && grep -Fxq "^archive_dir=" /var/www/html/settings/settings.ini)
  || grep -Fxq "^media_days=" /var/www/html/settings/settings.ini
  || grep -Fxq "^clear_archive_days=" /var/www/html/settings/settings.ini
  then
  cd $serverDocRoot/cli/ && /usr/bin/php archive.php
fi
