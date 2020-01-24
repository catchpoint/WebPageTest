#!/bin/bash -e

FOLDER_THIS_SCRIPT="$( cd "$( dirname "${BASH_SOURCE[0]}"  )" && pwd  )"
LOCAL_DOCKER_IMAGE=$(whoami)/webpagetest-server

read -p "Please enter your local IP adress (for XDEBUG session): " LOCAL_IP

echo "Build local docker image ${LOCAL_DOCKER_IMAGE}."
echo "####################################################################"
docker build -t $LOCAL_DOCKER_IMAGE -f "$FOLDER_THIS_SCRIPT/Dockerfile_dev" $FOLDER_THIS_SCRIPT
echo "Running local container."
echo "####################################################################"
docker run --name wpt -e XDEBUG_CONFIG="remote_host=$LOCAL_IP" -d -p 80:80 -v $FOLDER_THIS_SCRIPT/../../www:/var/www/html $LOCAL_DOCKER_IMAGE
