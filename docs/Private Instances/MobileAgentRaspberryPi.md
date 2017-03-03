The RaspberryPi works well as a tethered host for driving [WebPageTest mobile agents](https://sites.google.com/a/webpagetest.org/docs/private-instances/node-js-agent/setup).  Here is a walkthrough in configuring it as well as some discussion on deployment options.

It is worth noting that these instructions may not be the BEST way to configure a RaspberryPi, but this is how they have been configured on the [public instance](http://www.webpagetest.org) and is known to work.

# Requirements #
- RaspberryPi with 1GB of RAM
	- **3 Model B** recommended though **2 Model B** also works
	- [These](http://www.amazon.com/Raspberry-Model-Single-Computer-Heatsinks/dp/B01CMC50S0?ie=UTF8&psc=1&redirect=true&ref_=oh_aui_detailpage_o06_s01) are the specific ones that were deployed on the public instance (with heatsinks just to be safe)
- MicroSD card, 8GB Minimum
	- [32GB Samsung Evo+](http://www.amazon.com/Samsung-EVO-Class-Adapter-MB-MC32DA/dp/B012DT8OJ4?ie=UTF8&psc=1&redirect=true&ref_=oh_aui_detailpage_o06_s00) were used on the public instance because of good performance and endurance in reviews.
- USB Cable (2.0 A Male to Micro B)
	- One to connect the phone to the Pi
	- Another to connect the Pi to power (if not using a direct AC adapter)
	- [These](http://www.amazon.com/Rankie%C2%AE-Premium-Charging-Samsung-Motorola/dp/B00UFG5GVM?ie=UTF8&psc=1&redirect=true&ref_=oh_aui_detailpage_o06_s00) have worked well on the public instance
- Ethernet Cable (Recommended)
	- Assumes the Pi will be hard-wired which is what is detailed in this doc.  The Pi 3 supports WiFi as well but that configuration is not documented (and eliminates the option to reverse-tether the phone which provides consistency improvements)
	- [This](http://www.amazon.com/Hexagon-Network-Ethernet-Internet-Connectors/dp/B00VZXS008?ie=UTF8&psc=1&redirect=true&ref_=oh_aui_detailpage_o08_s01) is the cable used on the public instance devices, mostly because they take up less space but any working cable is fine.
- Power Supply (Optional)
	- To save space when deploying multiple devices the public instance uses [10-way USB power chargers](http://www.amazon.com/Anker-10-Port-Charger-Multi-Port-PowerPort/dp/B00YRYS4T4?ie=UTF8&psc=1&redirect=true&ref_=oh_aui_detailpage_o09_s00)
- Switch (Optional)
	- The public instance uses [Netgear ProSafe 8-port switches](http://www.amazon.com/NETGEAR-ProSAFE-Gigabit-Desktop-GS108-400NAS/dp/B00MPVR50A?ie=UTF8&psc=1&redirect=true&ref_=oh_aui_detailpage_o05_s00) paired with the above power supply to drive phones in groups of 7
	- Grouping the power and Ethernet in groups of 7 helps reduce the cable clutter.

For the initial setup you will also need a USB keyboard and monitor with HDMI input.

# Device Setup #
## OS Configuration ##

1. Download [Raspbian Jessie Lite](https://www.raspberrypi.org/downloads/raspbian/) and [write the image to the MicroSD card](https://www.raspberrypi.org/documentation/installation/installing-images/README.md).  This doc was written based on the "Jessie" distribution though may work with newer releases as they come out.
2. Insert the SD card into the Raspberry Pi, connect the Ethernet, keyboard, HDMI and phone cables and then connect the USB power cable (connect power last as it automatically boots when power is attached)
3. Log in as the user "pi" with password "raspberry"
4. Give the root user a password so that you can log in as the root user:
	- ```sudo passwd root```
5. Log out of the *pi* user account:
	- ```exit```
6. Log in as the user "root" with the password that you created in step 4
7. Remove the default "pi" user:
	- ```deluser -remove-home pi```
8. Create a new user account.  \<username> will be used as a placeholder through this doc for whatever user account name you create here and will be the user account that the agent software runs under:
	- ```adduser <username>```
	- Only the password questions need to be answered, feel free to hit enter right through the other user account information questions
9. Add sudo permissions to the user account (really only needed during setup and can be removed after setup is complete if needed):
	- ```visudo```
	- Remove the entry for the "pi" user account
	- Create an entry for your new user account:
		- ```<username> ALL=(ALL:ALL) ALL```
	- Save the changes ```Ctrl-O``` + Enter
	- Exit ```Ctrl-X```
10. Reboot
	- ```sudo reboot```
11. Log in as the new user you just created
12. At this point you may want to switch to doing the configuration over ssh where it is easier to copy/paste.
	- Get the IP address assigned to the Pi:
	- ```ifconfig```
	- SSH from a remote machine and continue configuration
13. Go into the Raspberry-Pi configuration App
	- ```sudo raspi-config```
14. Expand the filesystem to fill the full SD card
15. Set the time zone (optional) under International Options -> Change Timezone
16. Set the hostname (optional) under Advanced Options -> hostname
17. Tab to the "Finish" option and hit enter to exit the setup utility
18. Reboot and log back in as \<username>
19. Expand the size of the swap file (optional)
	- Default is 100MB, the public instance increased it to 1GB to reduce the liklihood of Out-Of-Memory errors
	- ```sudo nano /etc/dphys-swapfile```
	- Change the CONF_SWAPSIZE setting to ```CONF_SWAPSIZE=1024```
	- Save and exit (Ctrl-O, Ctrl-X)
	- ```sudo dphys-swapfile setup```
	- ```sudo dphys-swapfile swapon```
20. Configure watchdog to automatically reboot on hang (optional)
	- ```echo "bcm2835_wdt" | sudo tee -a /etc/modules```
	- ```sudo apt-get install watchdog```
	- ```sudo update-rc.d watchdog defaults```
	- ```sudo nano /etc/watchdog.conf```
		- uncomment "watchdog-device =" line
		- optionally, configure a load limit (max-load-15 = 80 should cover EXTREME cases)
	- ```sudo modprobe bcm2835_wdt```
	- ```sudo nano /etc/systemd/system.conf```
		- uncomment "RuntimeWatchdogSec=" line and set the time to 10
		- uncomment "ShutdownWatchdogSec=10min"
	- ```sudo nano /lib/systemd/system/watchdog.service```
		- add ```WantedBy=multi-user.target``` below [Install]
	- ```sudo systemctl start watchdog```
	- ```sudo systemctl status watchdog```
	- ```sudo systemctl enable watchdog```
20. Configure it to reboot on out-of-memory and optionally disable IPv6
	- ```sudo nano /etc/sysctl.conf```
	- Add the reboot on OOM settings to the end
		- ```vm.panic_on_oom=1```
		- ```kernel.panic=10```
	- Add the settings to disable IPv6 to the end (optional, if your network does not support IPv6)
		- ```net.ipv6.conf.all.disable_ipv6 = 1```
		- ```net.ipv6.conf.default.disable_ipv6 = 1```
		- ```net.ipv6.conf.lo.disable_ipv6 = 1```
	- Save and exit

## Install Software Dependencies ##
The WebPageTest node agent requires NodeJS, Python, imagemagick and ffmpeg as well as the pillow and psutil python modules.  Most of these can be installed directly but ffmpeg is not currently available through apt so it needs to be built directly on the Pi.

1. Install the packages available in apt as well as the dependencies for building ffmpeg
	- ```sudo apt-get update```
	- ```sudo apt-get upgrade```
	- ```sudo apt-get -y --force-yes install git screen libtiff5-dev libjpeg-dev zlib1g-dev libfreetype6-dev liblcms2-dev libwebp-dev tcl8.6-dev tk8.6-dev python-tk python-pip libtiff5-dev libjpeg-dev zlib1g-dev libfreetype6-dev liblcms2-dev libwebp-dev tcl8.6-dev tk8.6-dev python-tk python-dev libavutil-dev libmp3lame-dev libx264-dev yasm git autoconf automake build-essential libass-dev libfreetype6-dev libtheora-dev libtool libvorbis-dev pkg-config texi2html zlib1g-dev libtext-unidecode-perl android-tools-adb imagemagick python-numpy python-scipy```
2. Install the python modules:
	- ```sudo pip install psutil pillow pyssim ujson```
	- Be patient, if it needs to build pyssim and the dependencies this can take upwards of an hour
3. Download, build and install ffmpeg
	- ```cd ~```
	- ```git clone https://github.com/FFmpeg/FFmpeg.git ffmpeg```
	- ```cd ffmpeg```
	- ```./configure --arch=armel --target-os=linux --enable-gpl --enable-libx264 --enable-nonfree```
	- ```make -j4```
	- Be patient (again, this can take up to an hour though usually not more than 15 minutes or so)
	- ```sudo make install```
	- ```cd ~```
	- ```rm -rf ffmpeg```
4. Install NodeJS 7.x
	- ```curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -```
	- ```sudo apt-get install -y nodejs```
5. Install lighthouse
	- ```sudo npm install -g lighthouse```

## Configure adb access ##
By default, USB-connected devices are only available to the root user.  In order to access adb from the user you created you need to explicitly add the device ID's to a configuration file.

1. Add your user to the "plugdev" group
	- ```sudo gpasswd -a <username> plugdev```
2. Add the mobile device permissions
	- ```sudo nano /etc/udev/rules.d/51-android.rules```
	- Paste-in the following settings which should cover most android manufacturers, substituting your user account for \<username>:
```
SUBSYSTEM=="usb", ATTR{idVendor}=="0502", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0b05", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="413c", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0489", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="04c5", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="091e", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="201e", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="109b", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0bb4", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="12d1", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="8087", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="24e3", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="2116", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0482", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="17ef", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="1004", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="22b8", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0e8d", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0409", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="2080", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0955", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="2257", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="10a9", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="1d4d", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0471", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="04da", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="05c6", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="1f53", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="04dd", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="054c", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0fce", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="2340", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="0930", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="2970", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="1ebf", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="19d2", MODE="0666", GROUP="plugdev", OWNER="<username>"
SUBSYSTEM=="usb", ATTR{idVendor}=="2b4c", MODE="0666", GROUP="plugdev", OWNER="<username>"
```
3. Reboot and log back in as \<username>
4. Check to make sure adb has access to the phone (assuming the phone is already configured for developer mode):
	- ```adb devices```
	- The phone may display a prompt requesting access.  If so, check the "always allow" box and say ok.
	- ```adb devices```
	- You should see the device ID followed by "device".  If it says "offline" or the device is not listed then there is an issue in either the permissions or in the connection to the device.

## Configure the WebPageTest agent code ##
By far, the easiest way to get the code and keep it up to date is to clone the WebPageTest github repository.

1. ```cd ~```
2. ```git clone https://github.com/WPO-Foundation/webpagetest.git webpagetest```
3. Test to make sure the python dependencies are working
	- ```cd webpagetest/agent/js/lib/video```
	- ```python visualmetrics.py --check```
4. Configure a shell script to launch and keep the agent running
	- To keep node from leaking memory I usually configure the agent to exit after every 10 tests and just have an external process re-start it any time it exits.
	- Usually when running the nodejs agent you would use wptdriver.sh.  Unfortunatly that script tells node to use up to 4GB of RAM and node won't start on a 1GB 32-bit machine in those circumstances so there is a "pidriver.sh" script that is identical to wptdriver.sh but without the 4GB setting.
	- To keep the agent up to date, I usually configure it to pull from github right before launching so every 10 tests it will also auto-update.
	- ```cd ~```
	- ```nano agent.sh```
	- Paste-in the following script though change the pidriver.sh script to match your needs then save and exit:

```shell
#!/bin/sh
cd ~/webpagetest/agent/js
while :
do
    git pull origin master
    ./pidriver.sh -m debug --serverUrl <www.myserver.org> --location <testLocation> --apiKey <locationAPIKey> --name <MobileDeviceFriendlyName> --browser android:<DeviceID> --tcpdumpBinary ~/webpagetest/agent/js/tcpdump --maxtemp 36 --checknet yes --processvideo yes --exitTests 10
    echo "Exited, restarting"
    sleep 1
done
```
5. Configure a startup shell script to run adbwatch and the agent in screen sessions
	- adbwatch.py is a python script that helps keep adb running cleanly.  It may be less of an issue these days but historically adb used to hang.  It assigns a CPU affinity to adb to reduce deadlocks and periodically checks "adb devices" for hangs.  If a hang is detected it kills and re-starts adb.
	- Both adbwatch and the agent script are run in detached screen sessions to make it easy to connect to them and view the output
	- ```cd ~```
	- ```nano startup.sh```
	- Paste the following script, substituting \<username> with the correct account then save and exit:
```shell
#!/bin/sh
PATH=/home/<username>/perl5/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games
NODE_PATH=/usr/lib/nodejs:/usr/lib/node_modules:/usr/share/javascript
screen -dmS adbwatch python ~/webpagetest/agent/js/adbwatch.py
sleep 10
screen -dmS agent ~/agent.sh
```
6. Mark both scripts as executable
	- ```chmod +x agent.sh```
	- ```chmod +x startup.sh```
7. Configure cron to auto-start the startup script at boot time
	- ```crontab -e```
	- Select your favorite editor (hit enter to just use nano)
	- Add the following to the end of the file, substituting \<username> with the correct account:
	- ```@reboot /home/<username>/startup.sh```
	- Save and exit

## Profit! ##
After rebooting, the agent should automatically start and handle work.

# Additional Configurations #

## Reverse-tethered networking ##
The configuration up until this point assumes that the network connectivity for the phone itself is already configured (WiFi or Cellular) and is mostly about driving the actual testing. For better scaling and improved consistancy the RaspberryPi can also be used to provide wired network connectivity to the phone (referred to as rndis and/or reverse-tethering).  In the future it may also make it much easier to configure traffic-shaping if the device connectivity is routed through the Pi.

Requirements:
- Phone that supports USB Tethering
	- UI option should be available in the settings (may need to click to expand the network options)
	- Devices known to work: Moto G (Gen 1), Moto E, Nexus 5
	- Devices known NOT to work: Nexus 7, LG G2
- Phone running KitKat 4.4.4
	- The agent code currently only supports configuring 4.4.4 but 5.x and 6.x will work with code changes and presumably will be implemented at some point (pull requests always welcome)
- Static IP for the phone
	- Again, this is all the agent code has been configured for but dhcp works and just requires code.
- Static IP for the RaspberryPi
	- dhcp is also fine but what is documented here is for a static IP.  Just the br0 configuration in the interfaces file needs to change for dhcp

1. Install packages
	- ```sudo apt-get remove avahi-daemon dhcpcd5```
	- ```sudo apt-get install ifplugd bridge-utils```
2. Configure usb0 to be brought up automatically
	- ```sudo dpkg-reconfigure ifplugd```
	- Hit enter to skip configuring static interfaces
	- Add "usb0" to the dynamic interface list and hit enter
	- Add "-b" to the command-line options unless you want the Pi to beep every time the phone is connected
3. Configure the interfaces
	- ```sudo nano /etc/network/interfaces```
	- Delete the current content (ctrl-k deletes a line at a time)
	- Paste-in the following settings, setting the appropriate IP address, netmask, dns, etc then save and exit
```
auto lo usb0 eth0

allow-hotplug usb0
iface usb0 inet manual
  post-up brctl addif br0 usb0

auto br0
iface br0 inet static
  address 192.168.0.xx
  network 192.168.0.0
  netmask 255.255.255.0
  broadcast 192.168.0.255
  gateway 192.168.0.1
  dns-nameservers 192.168.0.1
  bridge_ports eth0 usb0
  bridge_fd 0
  bridge_stp off
  bridge_waitport 0 usb0
```
4. Reboot and log in
5. Stop the currently-running agent
	- ```screen -r agent```
	- ctrl-c
6. Make sure the Pi is still on the network and reachable
	- Log in and try ```ping 192.168.0.1``` or something similar
7. Configure agent.js to set up rndis on the phone
	- ```cd ~```
	- ```nano agent.sh```	
	- Add the rndis command-line flag to the pidriver.sh command:
	- ```--rndis444 "192.168.0.yy/24,192.168.0.1,192.168.0.1,192.168.0.1"```
	- Modify the various IP address to match the network.  They are in the order: "<IP>/<mask>,<gateway>,<dns1>,<dns2>".  Both DNS addresses are required though they can point to the same server if only one is available
	- Save and exit
8. Start the agent and make sure it is working
	- ```./agent.sh```
9. Reboot

## Traffic-shaping ##
The public WebPageTest agents are configured so that their network path goes through a FreeBSD bridge and the bridge is configured with several static pipes, one for each test device in each direction.  Setting up a FreeBSD bridge is beyond the scope of this document but the core configuration for setting up the pipes looks like this:

```
ipfw -q flush
ipfw -q pipe flush
for i in `seq 1 9`
do
  ipfw pipe $i config delay 0ms noerror
  ipfw pipe 30$i config delay 0ms noerror
  ipfw queue $i config pipe $i queue 100 noerror mask dst-port 0xffff
  ipfw queue 30$i config pipe 30$i queue 100 noerror mask src-port 0xffff
  ipfw add queue $i ip from any to 192.168.201.$i out xmit em1
  ipfw add queue 30$i ip from 192.168.201.$i to any out recv em1
done
for i in `seq 10 90`
do
  ipfw pipe $i config delay 0ms noerror
  ipfw pipe 3$i config delay 0ms noerror
  ipfw queue $i config pipe $i queue 100 noerror mask dst-port 0xffff
  ipfw queue 3$i config pipe 3$i queue 100 noerror mask src-port 0xffff
  ipfw add queue $i ip from any to 192.168.201.$i out xmit em1
  ipfw add queue 3$i ip from 192.168.201.$i to any out recv em1
done

ipfw add 60000 pass all from any to any
```

This configures pipes for 90 different devices with the down-stream pipes being numbered 1-90 and the matching up-stream pipes being numbered 301-390.  A given static IP address in the 192.168.201.X subnet is routed into each pipe based on the assigned IP address (192.168.201.5 gets download pipe 5 and upload pipe 305 for example).

The agent automatically configures traffic shaping using the ipfw_config.py shaper script which just connects to the bridge over ssh to configure the pipe rules.  The command-line to pidriver.sh for the device with IP 192.168.201.15 and the FreeBSD bridge running on 192.168.0.199 looks like this:

```
--trafficShaper "python,ipfw_config.py,--server,192.168.0.199,--down_pipe,15,--up_pipe,315,--action"
```

To get it to work seamlessly the Pi needs to be able to ssh as root to the FreeBSD bridge using certificate credentials.  To push the credentials to the server you can do this on the pi:

- ```ssh-keygen```
- ```ssh-copy-id root@192.168.0.199```

You will be asked to accept the server signature and the root login password to be able to push the certificate (this assumes that remote ssh login to the bridge as root is enabled).

# To-do #

This is largely documenting the current state of using a RaspberryPi to drive WebPageTest mobile agents but there are a lot more opportunities that it opens up.  I will be working on these as time permits but if anyone is feeling adventerous, pull requests are always welcome:

1. Traffic-shaping directly on the Pi
	- The pi can shape traffic using netem (tc) and when the phone is connected through rndis it would make for a VERY clean configuration to do all of the traffic-shaping locally.
	- One unknown is the accuracy in the traffic-shaping if run on the pi.  Apparently the kernel is configured for 100Hz ticks which would imply granularity on latency for traffic-shaping at 10ms.  Higher granularity/accuracy would be nice but it may work well given the latencies usually involved
	- Configuring tc directly would also require the agent to have sudo access to at least the tc command without password
	- In case we decide to pipeline the agent processing and it could be actively running a test while uploading results we would want to make sure that the traffic-shaping was only applied to traffic coming from the phone and not traffic from the Pi.
2. Support for automatic configuration
	- Have a startup script that is configured to make a well-known request from maybe a few well-known addresses configured through dhcp (like the gateway) that can provide the WPT server and location to use for a given device ID (it would use adb to see what devices were connected first). 
3. Support dhcp for Pi and Phone
	- Particularly when/if traffic-shaping can be done on the Pi, adding support for just using dhcp for address assignment would make it possible to have a pre-configured disk image that is just cloned to new devices as needed with no further configuration
