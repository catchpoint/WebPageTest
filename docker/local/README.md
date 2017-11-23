# Running local docker container for development

The [dockerfile](Dockerfile_dev) in this folder can be used to build a local image of webpagetest server based on [the official one](https://hub.docker.com/r/webpagetest/server/).

That image will [xdebug](https://xdebug.org) and can be used to debug the server from an IDE like described [here](https://gist.github.com/chadrien/c90927ec2d160ffea9c4) for intellij.

The [bash script](run_local_container.sh) in this folder will build the image locally (under current os user as owner) and run a container with it. The server code in folder `/www` will be mounted to `/var/www/html` inside the container. All results located under `results/` in this folder will be available in running container.
