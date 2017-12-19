#!/bin/bash
if [[ -n "${EC2_INIT}" && "${EC2_INIT}" == "true" ]]; then
  /usr/local/bin/php -c /usr/local/etc/php/php.ini /var/www/html/cli/ec2init.php
fi
