#!/bin/bash -ex

echo PHP INFO
php -i

#apachectl -t
service apache2 start
echo HOMEPAGE
curl http://localhost/
echo GOOGLE
curl 'http://localhost/runtest.php?url=www.google.com'
service apache2 stop
