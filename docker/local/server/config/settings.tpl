[settings]
product=WebPagetest

;contact=admin@my.email.com

; **************
; UI Integration
; **************

; Comment out the publishTo if you do not want to be able to upload your
; results to the public instance (this is useful for sharing internal tests
; with external users)
publishTo=www.webpagetest.org

;Uncomment map=1 if you want to enable the map-based picker
map=1

; Integrate with cloudshark
tcpdump_view="http://cloudshark.org/view?url="

; *********************
; Test options/defaults
; *********************

enableVideo=1

; Run tests concurrently across test machines
shard_tests=0

; Maximum number of runs allowed per test
maxruns=50

; Allow (1) or disable (0) testing of sites on private IP addresses (http://192.168.0.1/ for example).
allowPrivate=1
show_script_in_results=1

medianMetric="SpeedIndex"

; image quality (defaults to 30)
;iq=75

;save png full-resolution screen shots
;pngss=1

; *************
; Server Config
; *************

; disable gzip compressing the result text files
;nogzip=1

;Log tests that take longer than X seconds
;slow_test_time=100

; beanstalkd memory queue for tests (only the default 11300 port is supported right now)
beanstalkd=127.0.0.1
beanstalk_api_only=1

; Automatically update from git hourly.
; (assumes a git clone and just runs "git pull origin master" as the web user).
gitUpdate=0

; Automatically update test agents hourly (pulls the latest test agents from the provided server)
agentUpdate=http://cdn.webpagetest.org/

; ***********************
; Test result integration
; ***********************

;tsview time-series database
;tsviewdb=http://<server:port>/src/v1/

; Serialize the test results to a log file in JSON format for
; bulk logs processing (splunk, logster, flume, etc).
; The directories must already exist and have permissions set so the web server
; user can write to it.
;
; logTestResults - file for the page-level data to be logged
; logTestRequests - file for the per-request data (each request for every test will be logged as a separate record)
; logPrivateTests - Set to 0 to disable logging of tests marked private (defaults to logging all tests)
;
;logTestResults=/var/log/webpagetest/page_data.log
;logTestRequests=/var/log/webpagetest/requests.log
;logPrivateTests=0

;
; showslow (beacon rate is a percent of results to allow for sampling)
;
;showslow=http://www.showslow.com
;beaconRate=100
;showslow_key=<your showslow API key>


; **************
; Test Archiving
; **************

; archiving to local storage - directory to archive test files (must include trailing slash)
;archive_dir=/data/archive/

; archiving to s3 (using the s3 protocol, not necessarily just s3)
archive_s3_server=${ARCHIVE_S3_SERVER}
archive_s3_key=${ARCHIVE_S3_KEY}
archive_s3_secret=${ARCHIVE_S3_SECRET}
archive_s3_bucket=${ARCHIVE_S3_BUCKET}
;archive_s3_url=http://s3.amazonaws.com/

;Number of days to keep tests locally before archiving
archive_days=1

;Run archive script hourly automatically as agents poll for work
cron_archive=1

; *************
; EC2 Instances
; *************
; Should we automatically delete any EBS volumes marked as "available"?
; This can be used to prevent orphaned volumes but only if the account
; doesn't expect to keep offline EBS volumes.

ec2_locations=0
ec2=0


;
;Settings from user data
;

ec2_key=${ec2_key}
ec2_secret=${ec2_secret}
ec2_instance_size=c5.large
headless=0
iq=100
maxtime=120
EC2.default=eu-central-1
EC2.us-east-1.min=2
EC2.us-east-1.max=2
EC2.eu-central-1.min=5
EC2.eu-central-1.max=5

EC2.eu-central-1-linux.min=0
EC2.eu-central-1-linux.max=1

EC2.ScaleFactor=100
EC2.IdleTerminateMinutes=15


location_key=${LOCATION_KEY}
ec2_initialized=1
