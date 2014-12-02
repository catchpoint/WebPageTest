There is now a server AMI for WebPagetest for quickly spinning up a private instance.

AMI: ami-fcfd6194

Region: us-east-1

When you launch the instance, make sure to allow HTTP traffic through your EC2 firewall configuration/security group.

Some of the features of the server AMI are:
* Pre-configured with locations for all of the EC2 regions
* Will automatically start and stop test agents in regions as necessary to run tests
    * Currently limited to 1 instance at a time in each region
    * Test agents will be terminated if they have been running for close to an hourly increment (since they are billed hourly) and haven't had work in the last 15 minutes.
* Defaults to a headless instance requiring API keys and use through the API only
    * Can be overridden by specifying headless=0 in the user data configuration
* Can archive tests to S3 if a bucket is configured and provided through user data
* Automatically updates the server and test agent code to the latest (hourly)
* Any settings can be specified or overridden through user data
* A default API key can be provided through user data which will be configured as a no-limit API key
    * Additional keys will need to be added manually to /var/www/webpagetest/www/settings/keys.ini

Known issues:
* Instances are not started to render video.  The plan is to move video rendering to the server but that is not in place yet.
* The lag time for starting new test agents can be as long as 10 minutes.
* S3 archiving does not currently re-use the EC2 key that is used for starting test agents.

To use the AMI you need to provide an EC2 key and secret (at a minimum) through user data when the instance is started.  Any other settings provided through user data will override existing settings in settings.ini.

Example user data:

```
ec2_key=AKIAJKP75OFSROV5GWEQ
ec2_secret=<secret for the key>
api_key=MyAPIKey
headless=0
```

The full list of settings that can be specified is in [settings.ini.sample](https://github.com/WPO-Foundation/webpagetest/blob/master/www/settings/settings.ini.sample)
