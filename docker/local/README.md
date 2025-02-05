
# Local Docker Compose For Webpagetest
![Alt text](assests/index.png?raw=true "Index.png")
A multi-container Docker image for Webpagetest development. 
- First docker container is Nginx:Apline container called "Dockerfile-Nginx"
- Second docker container is php:7.4-fpm-alpine container called "Dockerfile-PHP"
- Third Docker container is Ubuntu container called "Dockerfile-wptagent"

## Platforms
Recommended Platforms:
- Windows: Untested, but should work.
- Macintosh: Tested.
- Linux: Tested.
- WSL2: Failed.

The reason for failure on WSL2 is because WSL2 does not have the network interface to be able to Traffic Shape, Which is needed for WPT Agent.
## Running A Local Webpagetest Server with Wptagent(Recommended)

Clone the project

```bash
  git clone https://github.com/catchpoint/WebPageTest.git
```
Go to the project directory

```bash
  cd webpagetest
```
Building / Running Image

```bash
  sudo docker-compose up
```

Start Any Web Browser and navigate to "localhost" to see the Webpagetest homepage. To check if webpagetest is working correctly please go down to "Webpagetest Installation Check". Another resource down below is a setup guide to "Debugging PHP with XDebug on VScode" with this docker container. !IMPORTANT! Traffic-Shapping will work with the Docker image of WPTagent on certain platforms.

## Running a Standalone Agent with the Server
Since the Webpagetest container is packaged with an agent, we first need to stop that agent from running on "docker-compose up". The most elegant way is to just comment out the agent portion of the docker-compose.yml.

```docker-compose.yml
  #### DOCKER WPTAGENT - comment this out to run a standalone agent ####
  agent:
    cap_add: #### Allows traffic shapping
      - NET_ADMIN
    build:
      context: .
      dockerfile: docker/local/Dockerfile-wptagent
    environment:
      - SERVER_URL=http://web/work/
      - LOCATION=Test
      - KEY=123456789
    init: true
  #### ####
```

Then follow the guide on how to install [Wpt Agent](https://github.com/catchpoint/WebPageTest.agent). Once the Agent is working, which can be confirmed by running a local test with...

```bash
    python3 wptagent.py -vvvv --xvfb --testurl www.google.com --shaper none #Shaper doesn't work with my instance
    # or
    python3 wptagent.py -vvvv --xvfb --testurl www.google.com
```
Then we can then tell the agent to look for work from the Webpagetest container with the command...
```bash
    python3 wptagent.py -vvvv --xvfb --server  http://127.0.0.1:80/work/ --location Test --key 123456789
```
Of course --location Test and --key 123456789 are preconfigured within docker/local/wptconfig/locations.ini and can be changed how you see fit

## Webpagetest Environment Configs

Adding Custom Agents? Add them here
`docker/local/wptconfig/locations.ini`

Changing Webpagetest Settings? Change them here
`docker/local/wptconfig/settings.ini`

Adjusting Webpagetest Keys? Adjust them here
`docker/local/wptconfig/keys.ini`

Looking for more information setting up? Check Out 
 - `https://github.com/catchpoint/WebPageTest.server-install`
 - `https://www.robinosborne.co.uk/2021/12/22/automate-your-webpagetest-private-instance-with-terraform-2021-edition/`


## Other Setting

### Crux
![Alt text](assests/crux.png?raw=true "Index.png")

Crux or Real User Measurements can be enable through 
`docker/local/wptconfig/settings.ini` adding
`crux_api_key=[API_KEY]` to the settings.


## Debugging


### Webpagetest Installation Check 
```Browser
    http://localhost/install/
```
![Alt text](assests/install.png?raw=true "Index.png")

All of the tests inside of /install need to pass for Webpagetest to work properly. (If the test are not passing please checkout "Unexpected problems installing" down below)
### Agent Connection Debugging
```Browser
    http://localhost/getTesters.php?f=html
```
Great location for seeing more details about agents

### Debugging PHP with XDebug on VScode
![Alt text](assests/xdebug.png?raw=true "Index.png")
First you need to install the following extensions for VScode.
![Alt text](assests/xdebugext.png?raw=true "Index.png")
![Alt text](assests/dockerext.png?raw=true "Index.png")

Next inside of .vscode/launch.json we can add these configurations 
to the launch.json to be able to add breakpoints and debug PHP with XDebug.
```.vscode/launch.json
    "configurations": [
        {
            "name": "Listen for XDebug on Docker",
            "type": "php",
            "request": "launch",
            "port": 9000,
            "hostname": "0.0.0.0",
            "stopOnEntry": true,
            "pathMappings": {
                "/var/www/webpagetest": "${workspaceFolder}" 
        },
        "log": true
        }
    ]
```
Please note pathMappings goes as follows (Docker location:/.../.../Webpagetest (Location of Webpagtest folder on your machine)
## Unexpected problems installing

### Running Web Tests Results in "Bad" Results
  One of the most common reasons for "Bad" results is Traffic-shapping. Traffic-Shappiing will not work with certain platforms. To disable the defaulted traffic-shapping you have to goto "Advanced Configuration" -> "Chromium" -> Enable "Use Chrome dev tools traffic-shaping (not recommended)"
  ![Alt text](assests/xdebug.png?raw=true "traffic-shape.png")

  If you are on a Tested platform and want traffic-shapping make sure you are running with sudo privileges on the docker compose.

  ```cmd
  sudo docker-compose up
  ```
  

### Another Process is using localhost port 80
  ```yml
  # Inside Webpagetest/docker-compose.yml
  web:
    ports:
      - target: 80
        published: 80 # Changing this value to a non-conflicting port will fix the problem

```
  
### "docker compose up" stalls on the building process
  Delete any docker file images associated with Webpagetest, then restart to fix this issue.
  Still hanging because of Xdebug installing? Another solution is to go inside Webpagetest/docker/local/Dockerfile-PHP comment out Xdebug, build, then uncomment Xdebug and rebuild the container `docker-compose up -d --build`.
  ```docker-php
  # Might hang at gcc just delete current docker files and restart
  # INSTALLS XDEBUG
  RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
      && pecl install xdebug-3.0.0 \
      && docker-php-ext-enable xdebug \
      && apk del -f .build-deps
  ```
### localhost won't load because it can't find vendor/autoload.php
  Inside of Webpagetest/docker/local/Dockerfile-PHP uncomment
  ```docker-php
    # Might need to uncomment this if vendor/autoload.php has a problem loading
    # RUN curl -s https://getcomposer.org/installer | PHP
    # RUN mv composer.phar /usr/local/bin/composer
    # RUN composer install --working-dir=/var/www/webpagetest/
  ``` 

### localhost/install/ Filesystem checks all failed
  Php doesn't have permission to read/write. The Fix is to change Php user:group permissions to be the same as the user:group external to the container: most prevalent on linux/mac os
  ```bash
  #Inside your Linux Terminal or WSL
  id -u #Grab the user Id
  id -g #Grab the Group Id
  ```
  and Inside of Webpagetest/docker-compose.yml
  ```yml
   php:
    build: 
      context: .
      dockerfile: docker/local/Dockerfile-php
      args:
        - UID=${UID:-1000} # change this with your user id
        - GID=${GID:-1000} # change this with your group id
    user: "1000:1000" # userId:groupID Change these values as well
  ```
  If the problem still persists, another method is to change the permissions of webpagetest folder to match "1000:1000". Inside of webpagetest directory you can change the permissions with a command like.
  ```cmd
  sudo chown -R 1000:1000 ./*
  ```
  
  
  More information about the problem
  https://aschmelyun.com/blog/fixing-permissions-issues-with-docker-compose-and-php/


