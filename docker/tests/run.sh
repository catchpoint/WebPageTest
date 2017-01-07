#!/bin/bash

apachectl -t
apachectl start
echo HOMEPAGE
echo $(wget http://localhost/)
echo GOOGLE
echo $(wget 'http://localhost/runtest.php?url=www.google.com')
apachectl stop
