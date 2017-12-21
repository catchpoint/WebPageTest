#!/bin/bash
if [[ -n "${EC2_INIT}" && "${EC2_INIT}" == "true" ]]; then
  if [[ -d '/user-data' ]]; then
    rm /var/www/html/cli/user-data || true
    cd /user-data
    for k8s_secret in $(ls) ; do
      echo "${k8s_secret}=$(cat $k8s_secret)" >> /var/www/html/cli/user-data
    done
  fi
  /usr/local/bin/php -c /usr/local/etc/php/php.ini /var/www/html/cli/ec2init.php
fi
