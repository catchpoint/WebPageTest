There is now a server AMI for WebPagetest for quickly spinning up a private instance.

* us-east-1: [ami-fcfd6194](https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LaunchInstanceWizard:ami=ami-fcfd6194)
* us-west-1: [ami-e44853a1](https://console.aws.amazon.com/ec2/v2/home?region=us-west-1#LaunchInstanceWizard:ami=ami-e44853a1)
* us-west-2: [ami-d7bde6e7](https://console.aws.amazon.com/ec2/v2/home?region=us-west-2#LaunchInstanceWizard:ami=ami-d7bde6e7)
* sa-east-1: [ami-0fce7112](https://console.aws.amazon.com/ec2/v2/home?region=sa-east-1#LaunchInstanceWizard:ami=ami-0fce7112)
* eu-west-1: [ami-9978f6ee](https://console.aws.amazon.com/ec2/v2/home?region=eu-west-1#LaunchInstanceWizard:ami=ami-9978f6ee)
* eu-central-1: [ami-22cefd3f](https://console.aws.amazon.com/ec2/v2/home?region=eu-central-1#LaunchInstanceWizard:ami=ami-22cefd3f)
* ap-southeast-1: [ami-88bd97da](https://console.aws.amazon.com/ec2/v2/home?region=ap-southeast-1#LaunchInstanceWizard:ami=ami-88bd97da)
* ap-southeast-2: [ami-eb3542d1](https://console.aws.amazon.com/ec2/v2/home?region=ap-southeast-2#LaunchInstanceWizard:ami=ami-eb3542d1)
* ap-northeast-1: [ami-66233967](https://console.aws.amazon.com/ec2/v2/home?region=ap-northeast-1#LaunchInstanceWizard:ami=ami-66233967)

When you launch the instance, make sure to allow HTTP traffic through your EC2 firewall configuration/security group.  You should probably also check /home/ubuntu/.ssh/authorized_keys and make sure previous keys from when the instances were created are not carried forward.

Some of the features of the server AMI are:
* Pre-configured with locations for all of the EC2 regions
* Will automatically start and stop test agents in regions as necessary to run tests
    * Default config limits Agents to 1 instance at a time in each region
    * Test agents will be terminated if they have been running for close to an hourly increment (since they are billed hourly) and haven't had work in the last 15 minutes.
* Defaults to a headless instance requiring API keys and use through the API only
    * Can be overridden by specifying headless=0 in the user data configuration
* Can archive tests to S3 if a bucket is configured and provided through user data
* Automatically updates the server and test agent code to the latest (hourly)
* Any settings can be specified or overridden through user data when first launching your new instance
* A default API key can be provided through user data which will be configured as a no-limit API key
    * Additional keys will need to be added manually to /var/www/webpagetest/www/settings/keys.ini

Known issues:
* The lag time for starting new test agents can be as long as 10 minutes.
* S3 archiving does not currently re-use the EC2 key that is used for starting test agents.

To use the AMI you need to provide an EC2 key and secret (at a minimum) through user data when the instance is started.  Any other settings provided through user data will override existing settings in settings.ini when you start your instance the first time. After you have started your instance, user data will no longer change the settings (e.g. on stop and restart of your instance). Be sure to remove your key and secret from the user data of your instance for security.

To change settings after launching your instance, ssh to the instance and manually edit the file:

```
  sudo vim /var/www/webpagetest/www/settings/settings.ini
```

then bounce nginx:

```
  sudo service nginx restart
```

Example user data:

```
ec2_key=AKIAJKP75OFSROV5GWEQ
ec2_secret=<secret for the key>
api_key=MyAPIKey
headless=0
```

The full list of settings that can be specified is in [settings.ini.sample](https://github.com/WPO-Foundation/webpagetest/blob/master/www/settings/settings.ini.sample)

EC2 test agent AMIs:

* us-east-1 (Virginia)
    * [IE9/Chrome/Firefox/Safari - ami-83e4c5e9](https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LaunchInstanceWizard:ami=ami-83e4c5e9)
    * [IE10/Chrome/Firefox/Safari - ami-0ae1c060](https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LaunchInstanceWizard:ami=ami-0ae1c060)
    * [IE11/Chrome/Firefox/Safari - ami-4a84a220](https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LaunchInstanceWizard:ami=ami-4a84a220)
* us-east-2 (Ohio)
    * [IE9/Chrome/Firefox/Safari - ami-c86933ad](https://console.aws.amazon.com/ec2/v2/home?region=us-east-2#LaunchInstanceWizard:ami=ami-c86933ad)
    * [IE10/Chrome/Firefox/Safari - ami-55742e30](https://console.aws.amazon.com/ec2/v2/home?region=us-east-2#LaunchInstanceWizard:ami=ami-55742e30)
    * [IE11/Chrome/Firefox/Safari - ami-c96933ac](https://console.aws.amazon.com/ec2/v2/home?region=us-east-2#LaunchInstanceWizard:ami=ami-c96933ac)
* us-west-1 (California)
    * [IE9/Chrome/Firefox/Safari - ami-03d6a263](https://console.aws.amazon.com/ec2/v2/home?region=us-west-1#LaunchInstanceWizard:ami=ami-03d6a263)
    * [IE10/Chrome/Firefox/Safari - ami-05eb9f65](https://console.aws.amazon.com/ec2/v2/home?region=us-west-1#LaunchInstanceWizard:ami=ami-05eb9f65)
    * [IE11/Chrome/Firefox/Safari - ami-678afe07](https://console.aws.amazon.com/ec2/v2/home?region=us-west-1#LaunchInstanceWizard:ami=ami-678afe07)
* us-west-2 (Oregon)
    * [IE9/Chrome/Firefox/Safari - ami-03e80c63](https://console.aws.amazon.com/ec2/v2/home?region=us-west-2#LaunchInstanceWizard:ami=ami-03e80c63)
    * [IE10/Chrome/Firefox/Safari - ami-fdeb0f9d](https://console.aws.amazon.com/ec2/v2/home?region=us-west-2#LaunchInstanceWizard:ami=ami-fdeb0f9d)
    * [IE11/Chrome/Firefox/Safari - ami-b4ab4fd4](https://console.aws.amazon.com/ec2/v2/home?region=us-west-2#LaunchInstanceWizard:ami=ami-b4ab4fd4)
* ca-central-1 (Canada Central)
    * [IE9/Chrome/Firefox/Safari - ami-184efc7c](https://console.aws.amazon.com/ec2/v2/home?region=ca-central-1#LaunchInstanceWizard:ami=ami-184efc7c)
    * [IE10/Chrome/Firefox/Safari - ami-13328077](https://console.aws.amazon.com/ec2/v2/home?region=ca-central-1#LaunchInstanceWizard:ami=ami-13328077)
    * [IE11/Chrome/Firefox/Safari - ami-0345f767](https://console.aws.amazon.com/ec2/v2/home?region=ca-central-1#LaunchInstanceWizard:ami=ami-0345f767)
* eu-west-1 (Ireland)
    * [IE9/Chrome/Firefox/Safari - ami-2d5fea5e](https://console.aws.amazon.com/ec2/v2/home?region=eu-west-1#LaunchInstanceWizard:ami=ami-2d5fea5e)
    * [IE10/Chrome/Firefox/Safari - ami-3b45f048](https://console.aws.amazon.com/ec2/v2/home?region=eu-west-1#LaunchInstanceWizard:ami=ami-3b45f048)
    * [IE11/Chrome/Firefox/Safari - ami-a3a81dd0](https://console.aws.amazon.com/ec2/v2/home?region=eu-west-1#LaunchInstanceWizard:ami=ami-a3a81dd0)
* eu-west-2 (London)
    * [IE9/Chrome/Firefox/Safari - ami-4ad6dc2e](https://console.aws.amazon.com/ec2/v2/home?region=eu-west-2#LaunchInstanceWizard:ami=ami-4ad6dc2e)
    * [IE10/Chrome/Firefox/Safari - ami-2dd5df49](https://console.aws.amazon.com/ec2/v2/home?region=eu-west-2#LaunchInstanceWizard:ami=ami-2dd5df49)
    * [IE11/Chrome/Firefox/Safari - ami-4bd6dc2f](https://console.aws.amazon.com/ec2/v2/home?region=eu-west-2#LaunchInstanceWizard:ami=ami-4bd6dc2f)
* eu-central-1 (Frankfurt)
    * [IE9/Chrome/Firefox/Safari - ami-879c85eb](https://console.aws.amazon.com/ec2/v2/home?region=eu-central-1#LaunchInstanceWizard:ami=ami-879c85eb)
    * [IE10/Chrome/Firefox/Safari - ami-ec9b8280](https://console.aws.amazon.com/ec2/v2/home?region=eu-central-1#LaunchInstanceWizard:ami=ami-ec9b8280)
    * [IE11/Chrome/Firefox/Safari - ami-87f2ebeb](https://console.aws.amazon.com/ec2/v2/home?region=eu-central-1#LaunchInstanceWizard:ami=ami-87f2ebeb)
* ap-northeast-1 (Tokyo)
    * [IE9/Chrome/Firefox/Safari - ami-4ed6e820](https://console.aws.amazon.com/ec2/v2/home?region=ap-northeast-1#LaunchInstanceWizard:ami=ami-4ed6e820)
    * [IE10/Chrome/Firefox/Safari - ami-ebd3ed85](https://console.aws.amazon.com/ec2/v2/home?region=ap-northeast-1#LaunchInstanceWizard:ami=ami-ebd3ed85)
    * [IE11/Chrome/Firefox/Safari - ami-2f221c41](https://console.aws.amazon.com/ec2/v2/home?region=ap-northeast-1#LaunchInstanceWizard:ami=ami-2f221c41)
* ap-northeast-2 (Seoul)
    * [IE9/Chrome/Firefox/Safari - ami-b2e12fdc](https://console.aws.amazon.com/ec2/v2/home?region=ap-northeast-2#LaunchInstanceWizard:ami=ami-b2e12fdc)
    * [IE10/Chrome/Firefox/Safari - ami-76e12f18](https://console.aws.amazon.com/ec2/v2/home?region=ap-northeast-2#LaunchInstanceWizard:ami=ami-76e12f18)
    * [IE11/Chrome/Firefox/Safari - ami-15e52b7b](https://console.aws.amazon.com/ec2/v2/home?region=ap-northeast-2#LaunchInstanceWizard:ami=ami-15e52b7b)
* ap-southeast-1 (Singapore)
    * [IE9/Chrome/Firefox/Safari - ami-f87ab69b](https://console.aws.amazon.com/ec2/v2/home?region=ap-southeast-1#LaunchInstanceWizard:ami=ami-f87ab69b)
    * [IE10/Chrome/Firefox/Safari - ami-ce78b4ad](https://console.aws.amazon.com/ec2/v2/home?region=ap-southeast-1#LaunchInstanceWizard:ami=ami-ce78b4ad)
    * [IE11/Chrome/Firefox/Safari - ami-3e55995d](https://console.aws.amazon.com/ec2/v2/home?region=ap-southeast-1#LaunchInstanceWizard:ami=ami-3e55995d)
* ap-southeast-2 (Sydney)
    * [IE9/Chrome/Firefox/Safari - ami-306c4853](https://console.aws.amazon.com/ec2/v2/home?region=ap-southeast-2#LaunchInstanceWizard:ami=ami-306c4853)
    * [IE10/Chrome/Firefox/Safari - ami-25644046](https://console.aws.amazon.com/ec2/v2/home?region=ap-southeast-2#LaunchInstanceWizard:ami=ami-25644046)
    * [IE11/Chrome/Firefox/Safari - ami-e88eab8b](https://console.aws.amazon.com/ec2/v2/home?region=ap-southeast-2#LaunchInstanceWizard:ami=ami-e88eab8b)
* ap-south-1 (Mumbai)
    * [IE9/Chrome/Firefox/Safari - ami-7a86ec15](https://console.aws.amazon.com/ec2/v2/home?region=ap-south-1#LaunchInstanceWizard:ami=ami-7a86ec15)
    * [IE10/Chrome/Firefox/Safari - ami-bf80ead0](https://console.aws.amazon.com/ec2/v2/home?region=ap-south-1#LaunchInstanceWizard:ami=ami-bf80ead0)
    * [IE11/Chrome/Firefox/Safari - ami-d498f2bb](https://console.aws.amazon.com/ec2/v2/home?region=ap-south-1#LaunchInstanceWizard:ami=ami-d498f2bb)
* sa-east-1 (Sao Paulo)
    * [IE9/Chrome/Firefox/Safari - ami-79c54515](https://console.aws.amazon.com/ec2/v2/home?region=sa-east-1#LaunchInstanceWizard:ami=ami-79c54515)
    * [IE10/Chrome/Firefox/Safari - ami-7cc54510](https://console.aws.amazon.com/ec2/v2/home?region=sa-east-1#LaunchInstanceWizard:ami=ami-7cc54510)
    * [IE11/Chrome/Firefox/Safari - ami-203abb4c](https://console.aws.amazon.com/ec2/v2/home?region=sa-east-1#LaunchInstanceWizard:ami=ami-203abb4c)

Connect to a Windows Test Agent:

The password is: 2dialit
