CFResponse Object
(
    [header] => Array
        (
            [server] => Apache-Coyote/1.1
            [content-type] => text/xml;charset=UTF-8
            [transfer-encoding] => chunked
            [content-encoding] => gzip
            [vary] => Accept-Encoding
            [date] => Thu, 14 Oct 2010 13:51:22 GMT
            [_info] => Array
                (
                    [url] => https://ec2.amazonaws.com/
                    [content_type] => text/xml;charset=UTF-8
                    [http_code] => 200
                    [header_size] => 221
                    [request_size] => 698
                    [filetime] => -1
                    [ssl_verify_result] => 0
                    [redirect_count] => 0
                    [total_time] => 0.076954
                    [namelookup_time] => 2.5E-5
                    [connect_time] => 0.02277
                    [pretransfer_time] => 0.024399
                    [size_upload] => 219
                    [size_download] => 1900
                    [speed_download] => 24690
                    [speed_upload] => 2845
                    [download_content_length] => 0
                    [upload_content_length] => 0
                    [starttransfer_time] => 0.076182
                    [redirect_time] => 0
                    [method] => POST
                )

            [x-aws-stringtosign] => POST
ec2.amazonaws.com
/
AWSAccessKeyId=AKIAJJUWMIZ7KP6KK26A&Action=DescribeInstances&SignatureMethod=HmacSHA256&SignatureVersion=2&Timestamp=2010-10-14T13%3A51%3A23Z&Version=2010-08-31
            [x-aws-body] => AWSAccessKeyId=AKIAJJUWMIZ7KP6KK26A&Action=DescribeInstances&SignatureMethod=HmacSHA256&SignatureVersion=2&Timestamp=2010-10-14T13%3A51%3A23Z&Version=2010-08-31&Signature=fmszRTQMXQ52oeHuoNGnP%2BAcoUiZ3Ax6YkdZJ6Q38V8%3D
        )

    [body] => CFSimpleXML Object
        (
            [requestId] => 14dccb37-6b27-4a38-9fa7-7cad76a988a2
            [reservationSet] => CFSimpleXML Object
                (
                    [item] => Array
                        (
                            [0] => CFSimpleXML Object
                                (
                                    [reservationId] => r-8ee56ce5
                                    [ownerId] => 432148673972
                                    [groupSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [groupId] => tvlygroup
                                                )

                                        )

                                    [instancesSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [instanceId] => i-71ac651b
                                                    [imageId] => ami-c5e40dac
                                                    [instanceState] => CFSimpleXML Object
                                                        (
                                                            [code] => 80
                                                            [name] => stopped
                                                        )

                                                    [privateDnsName] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [dnsName] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [reason] => User initiated (2010-07-30 18:27:10 GMT)
                                                    [keyName] => tvlycloudkey
                                                    [amiLaunchIndex] => 0
                                                    [productCodes] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [instanceType] => m1.small
                                                    [launchTime] => 2010-07-26T18:05:43.000Z
                                                    [placement] => CFSimpleXML Object
                                                        (
                                                            [availabilityZone] => us-east-1b
                                                            [groupName] => CFSimpleXML Object
                                                                (
                                                                )

                                                        )

                                                    [platform] => windows
                                                    [monitoring] => CFSimpleXML Object
                                                        (
                                                            [state] => disabled
                                                        )

                                                    [stateReason] => CFSimpleXML Object
                                                        (
                                                            [code] => Client.UserInitiatedShutdown
                                                            [message] => Client.UserInitiatedShutdown: User initiated shutdown
                                                        )

                                                    [architecture] => i386
                                                    [rootDeviceType] => ebs
                                                    [rootDeviceName] => /dev/sda1
                                                    [blockDeviceMapping] => CFSimpleXML Object
                                                        (
                                                            [item] => CFSimpleXML Object
                                                                (
                                                                    [deviceName] => /dev/sda1
                                                                    [ebs] => CFSimpleXML Object
                                                                        (
                                                                            [volumeId] => vol-584a2831
                                                                            [status] => attached
                                                                            [attachTime] => 2010-07-12T20:31:00.000Z
                                                                            [deleteOnTermination] => true
                                                                        )

                                                                )

                                                        )

                                                    [virtualizationType] => hvm
                                                    [clientToken] => CFSimpleXML Object
                                                        (
                                                        )

                                                )

                                        )

                                    [requesterId] => 058890971305
                                )

                            [1] => CFSimpleXML Object
                                (
                                    [reservationId] => r-af2241c4
                                    [ownerId] => 432148673972
                                    [groupSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [groupId] => tvmobile
                                                )

                                        )

                                    [instancesSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [instanceId] => i-d4349fbe
                                                    [imageId] => ami-2cb05345
                                                    [instanceState] => CFSimpleXML Object
                                                        (
                                                            [code] => 16
                                                            [name] => running
                                                        )

                                                    [privateDnsName] => domU-12-31-39-13-D6-03.compute-1.internal
                                                    [dnsName] => ec2-184-72-241-70.compute-1.amazonaws.com
                                                    [reason] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [keyName] => tvlymobile
                                                    [amiLaunchIndex] => 0
                                                    [productCodes] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [instanceType] => m1.small
                                                    [launchTime] => 2010-07-28T15:03:52.000Z
                                                    [placement] => CFSimpleXML Object
                                                        (
                                                            [availabilityZone] => us-east-1b
                                                            [groupName] => CFSimpleXML Object
                                                                (
                                                                )

                                                        )

                                                    [kernelId] => aki-f5c1219c
                                                    [ramdiskId] => ari-dbc121b2
                                                    [monitoring] => CFSimpleXML Object
                                                        (
                                                            [state] => disabled
                                                        )

                                                    [privateIpAddress] => 10.201.213.237
                                                    [ipAddress] => 184.72.241.70
                                                    [architecture] => i386
                                                    [rootDeviceType] => instance-store
                                                    [blockDeviceMapping] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [virtualizationType] => paravirtual
                                                    [clientToken] => CFSimpleXML Object
                                                        (
                                                        )

                                                )

                                        )

                                    [requesterId] => 058890971305
                                )

                            [2] => CFSimpleXML Object
                                (
                                    [reservationId] => r-48a4f323
                                    [ownerId] => 432148673972
                                    [groupSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [groupId] => SiteSpeed
                                                )

                                        )

                                    [instancesSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [instanceId] => i-939efcf9
                                                    [imageId] => ami-84db39ed
                                                    [instanceState] => CFSimpleXML Object
                                                        (
                                                            [code] => 16
                                                            [name] => running
                                                        )

                                                    [privateDnsName] => domU-12-31-39-06-B8-D5.compute-1.internal
                                                    [dnsName] => ec2-184-72-234-132.compute-1.amazonaws.com
                                                    [reason] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [keyName] => SiteSpeedKey
                                                    [amiLaunchIndex] => 0
                                                    [productCodes] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [instanceType] => m1.small
                                                    [launchTime] => 2010-09-28T17:33:42.000Z
                                                    [placement] => CFSimpleXML Object
                                                        (
                                                            [availabilityZone] => us-east-1b
                                                            [groupName] => CFSimpleXML Object
                                                                (
                                                                )

                                                        )

                                                    [kernelId] => aki-94c527fd
                                                    [ramdiskId] => ari-96c527ff
                                                    [monitoring] => CFSimpleXML Object
                                                        (
                                                            [state] => enabled
                                                        )

                                                    [privateIpAddress] => 10.208.191.35
                                                    [ipAddress] => 184.72.234.132
                                                    [architecture] => i386
                                                    [rootDeviceType] => ebs
                                                    [rootDeviceName] => /dev/sda1
                                                    [blockDeviceMapping] => CFSimpleXML Object
                                                        (
                                                            [item] => Array
                                                                (
                                                                    [0] => CFSimpleXML Object
                                                                        (
                                                                            [deviceName] => /dev/sda1
                                                                            [ebs] => CFSimpleXML Object
                                                                                (
                                                                                    [volumeId] => vol-8a327de3
                                                                                    [status] => attached
                                                                                    [attachTime] => 2010-08-20T14:11:38.000Z
                                                                                    [deleteOnTermination] => true
                                                                                )

                                                                        )

                                                                    [1] => CFSimpleXML Object
                                                                        (
                                                                            [deviceName] => /dev/sdw
                                                                            [ebs] => CFSimpleXML Object
                                                                                (
                                                                                    [volumeId] => vol-48623321
                                                                                    [status] => attached
                                                                                    [attachTime] => 2010-08-30T01:37:19.000Z
                                                                                    [deleteOnTermination] => false
                                                                                )

                                                                        )

                                                                    [2] => CFSimpleXML Object
                                                                        (
                                                                            [deviceName] => /dev/sdx
                                                                            [ebs] => CFSimpleXML Object
                                                                                (
                                                                                    [volumeId] => vol-70f8c419
                                                                                    [status] => attached
                                                                                    [attachTime] => 2010-10-04T20:06:15.000Z
                                                                                    [deleteOnTermination] => false
                                                                                )

                                                                        )

                                                                )

                                                        )

                                                    [virtualizationType] => paravirtual
                                                    [clientToken] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [tagSet] => CFSimpleXML Object
                                                        (
                                                            [item] => CFSimpleXML Object
                                                                (
                                                                    [key] => Name
                                                                    [value] => Main WPT Server
                                                                )

                                                        )

                                                )

                                        )

                                    [requesterId] => 058890971305
                                )

                            [3] => CFSimpleXML Object
                                (
                                    [reservationId] => r-7941af13
                                    [ownerId] => 432148673972
                                    [groupSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [groupId] => SiteSpeed
                                                )

                                        )

                                    [instancesSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [instanceId] => i-3829c855
                                                    [imageId] => ami-2342a94a
                                                    [instanceState] => CFSimpleXML Object
                                                        (
                                                            [code] => 80
                                                            [name] => stopped
                                                        )

                                                    [privateDnsName] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [dnsName] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [reason] => User initiated (2010-10-10 16:40:28 GMT)
                                                    [keyName] => SiteSpeedKey
                                                    [amiLaunchIndex] => 0
                                                    [productCodes] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [instanceType] => m1.small
                                                    [launchTime] => 2010-10-07T21:48:41.000Z
                                                    [placement] => CFSimpleXML Object
                                                        (
                                                            [availabilityZone] => us-east-1b
                                                            [groupName] => CFSimpleXML Object
                                                                (
                                                                )

                                                        )

                                                    [kernelId] => aki-a71cf9ce
                                                    [ramdiskId] => ari-a51cf9cc
                                                    [monitoring] => CFSimpleXML Object
                                                        (
                                                            [state] => disabled
                                                        )

                                                    [stateReason] => CFSimpleXML Object
                                                        (
                                                            [code] => Client.UserInitiatedShutdown
                                                            [message] => Client.UserInitiatedShutdown: User initiated shutdown
                                                        )

                                                    [architecture] => i386
                                                    [rootDeviceType] => ebs
                                                    [rootDeviceName] => /dev/sda1
                                                    [blockDeviceMapping] => CFSimpleXML Object
                                                        (
                                                            [item] => Array
                                                                (
                                                                    [0] => CFSimpleXML Object
                                                                        (
                                                                            [deviceName] => /dev/sda1
                                                                            [ebs] => CFSimpleXML Object
                                                                                (
                                                                                    [volumeId] => vol-aec2fbc7
                                                                                    [status] => attached
                                                                                    [attachTime] => 2010-10-07T21:48:47.000Z
                                                                                    [deleteOnTermination] => true
                                                                                )

                                                                        )

                                                                    [1] => CFSimpleXML Object
                                                                        (
                                                                            [deviceName] => /dev/sdw
                                                                            [ebs] => CFSimpleXML Object
                                                                                (
                                                                                    [volumeId] => vol-c0c4fda9
                                                                                    [status] => attached
                                                                                    [attachTime] => 2010-10-07T21:59:07.000Z
                                                                                    [deleteOnTermination] => false
                                                                                )

                                                                        )

                                                                )

                                                        )

                                                    [virtualizationType] => paravirtual
                                                    [clientToken] => CFSimpleXML Object
                                                        (
                                                        )

                                                )

                                        )

                                )

                            [4] => CFSimpleXML Object
                                (
                                    [reservationId] => r-4926ce23
                                    [ownerId] => 432148673972
                                    [groupSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [groupId] => SiteSpeed
                                                )

                                        )

                                    [instancesSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [instanceId] => i-0e50b363
                                                    [imageId] => ami-f11ff098
                                                    [instanceState] => CFSimpleXML Object
                                                        (
                                                            [code] => 16
                                                            [name] => running
                                                        )

                                                    [privateDnsName] => domU-12-31-39-02-6E-EA.compute-1.internal
                                                    [dnsName] => ec2-67-202-50-240.compute-1.amazonaws.com
                                                    [reason] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [keyName] => SiteSpeedKey
                                                    [amiLaunchIndex] => 0
                                                    [productCodes] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [instanceType] => t1.micro
                                                    [launchTime] => 2010-10-08T13:55:12.000Z
                                                    [placement] => CFSimpleXML Object
                                                        (
                                                            [availabilityZone] => us-east-1b
                                                            [groupName] => CFSimpleXML Object
                                                                (
                                                                )

                                                        )

                                                    [platform] => windows
                                                    [monitoring] => CFSimpleXML Object
                                                        (
                                                            [state] => disabled
                                                        )

                                                    [privateIpAddress] => 10.248.113.20
                                                    [ipAddress] => 67.202.50.240
                                                    [architecture] => i386
                                                    [rootDeviceType] => ebs
                                                    [rootDeviceName] => /dev/sda1
                                                    [blockDeviceMapping] => CFSimpleXML Object
                                                        (
                                                            [item] => CFSimpleXML Object
                                                                (
                                                                    [deviceName] => /dev/sda1
                                                                    [ebs] => CFSimpleXML Object
                                                                        (
                                                                            [volumeId] => vol-44f6ce2d
                                                                            [status] => attached
                                                                            [attachTime] => 2010-10-08T13:55:17.000Z
                                                                            [deleteOnTermination] => true
                                                                        )

                                                                )

                                                        )

                                                    [instanceLifecycle] => spot
                                                    [spotInstanceRequestId] => sir-590f0e04
                                                    [virtualizationType] => hvm
                                                    [clientToken] => CFSimpleXML Object
                                                        (
                                                        )

                                                )

                                        )

                                    [requesterId] => 854251627541
                                )

                            [5] => CFSimpleXML Object
                                (
                                    [reservationId] => r-a5d428cf
                                    [ownerId] => 432148673972
                                    [groupSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [groupId] => SiteSpeed
                                                )

                                        )

                                    [instancesSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [instanceId] => i-52bc433f
                                                    [imageId] => ami-7a9e6a13
                                                    [instanceState] => CFSimpleXML Object
                                                        (
                                                            [code] => 16
                                                            [name] => running
                                                        )

                                                    [privateDnsName] => domU-12-31-38-02-62-70.compute-1.internal
                                                    [dnsName] => ec2-184-73-4-25.compute-1.amazonaws.com
                                                    [reason] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [keyName] => SiteSpeedKey
                                                    [amiLaunchIndex] => 0
                                                    [productCodes] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [instanceType] => t1.micro
                                                    [launchTime] => 2010-10-13T15:03:42.000Z
                                                    [placement] => CFSimpleXML Object
                                                        (
                                                            [availabilityZone] => us-east-1d
                                                            [groupName] => CFSimpleXML Object
                                                                (
                                                                )

                                                        )

                                                    [platform] => windows
                                                    [monitoring] => CFSimpleXML Object
                                                        (
                                                            [state] => disabled
                                                        )

                                                    [privateIpAddress] => 10.246.101.154
                                                    [ipAddress] => 184.73.4.25
                                                    [architecture] => i386
                                                    [rootDeviceType] => ebs
                                                    [rootDeviceName] => /dev/sda1
                                                    [blockDeviceMapping] => CFSimpleXML Object
                                                        (
                                                            [item] => CFSimpleXML Object
                                                                (
                                                                    [deviceName] => /dev/sda1
                                                                    [ebs] => CFSimpleXML Object
                                                                        (
                                                                            [volumeId] => vol-fc929495
                                                                            [status] => attached
                                                                            [attachTime] => 2010-10-13T15:03:53.000Z
                                                                            [deleteOnTermination] => true
                                                                        )

                                                                )

                                                        )

                                                    [instanceLifecycle] => spot
                                                    [spotInstanceRequestId] => sir-21d72203
                                                    [virtualizationType] => hvm
                                                    [clientToken] => CFSimpleXML Object
                                                        (
                                                        )

                                                )

                                        )

                                    [requesterId] => 854251627541
                                )

                            [6] => CFSimpleXML Object
                                (
                                    [reservationId] => r-63d72b09
                                    [ownerId] => 432148673972
                                    [groupSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [groupId] => SiteSpeed
                                                )

                                        )

                                    [instancesSet] => CFSimpleXML Object
                                        (
                                            [item] => CFSimpleXML Object
                                                (
                                                    [instanceId] => i-bab946d7
                                                    [imageId] => ami-7a9e6a13
                                                    [instanceState] => CFSimpleXML Object
                                                        (
                                                            [code] => 16
                                                            [name] => running
                                                        )

                                                    [privateDnsName] => domU-12-31-38-02-60-9B.compute-1.internal
                                                    [dnsName] => ec2-72-44-57-253.compute-1.amazonaws.com
                                                    [reason] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [keyName] => SiteSpeedKey
                                                    [amiLaunchIndex] => 0
                                                    [productCodes] => CFSimpleXML Object
                                                        (
                                                        )

                                                    [instanceType] => t1.micro
                                                    [launchTime] => 2010-10-13T15:07:21.000Z
                                                    [placement] => CFSimpleXML Object
                                                        (
                                                            [availabilityZone] => us-east-1d
                                                            [groupName] => CFSimpleXML Object
                                                                (
                                                                )

                                                        )

                                                    [platform] => windows
                                                    [monitoring] => CFSimpleXML Object
                                                        (
                                                            [state] => disabled
                                                        )

                                                    [privateIpAddress] => 10.246.103.105
                                                    [ipAddress] => 72.44.57.253
                                                    [architecture] => i386
                                                    [rootDeviceType] => ebs
                                                    [rootDeviceName] => /dev/sda1
                                                    [blockDeviceMapping] => CFSimpleXML Object
                                                        (
                                                            [item] => CFSimpleXML Object
                                                                (
                                                                    [deviceName] => /dev/sda1
                                                                    [ebs] => CFSimpleXML Object
                                                                        (
                                                                            [volumeId] => vol-3493955d
                                                                            [status] => attached
                                                                            [attachTime] => 2010-10-13T15:07:27.000Z
                                                                            [deleteOnTermination] => true
                                                                        )

                                                                )

                                                        )

                                                    [instanceLifecycle] => spot
                                                    [spotInstanceRequestId] => sir-323d3a04
                                                    [virtualizationType] => hvm
                                                    [clientToken] => CFSimpleXML Object
                                                        (
                                                        )

                                                )

                                        )

                                    [requesterId] => 854251627541
                                )

                        )

                )

        )

    [status] => 200
)