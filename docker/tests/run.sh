#!/bin/bash -ex

echo PHP INFO
php -i

apachectl -t
apachectl start
echo HOMEPAGE
curl http://localhost/
echo GOOGLE
curl 'http://localhost/runtest.php?url=www.google.com'
apachectl stop
