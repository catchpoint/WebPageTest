#!/bin/bash
cd /var/www/html/cron/
if [ ! -f "${1}" ]; then
  echo "Script name '${1}' is not a valid WPT cron script." >> /var/log/supervisor/cron_stdout.log
  exit 1
fi
echo "Run ${1} at [$(date)]" >> /var/log/supervisor/cron_stdout.log
/usr/local/bin/php "${1}" >> /var/log/supervisor/cron_stdout.log 2>&1
