#!/bin/bash

# for each pcap file in the directory, this script runs pcap2har, makes
# sure it didn't fail, then if there is an existing har file for that
# pcap, it diffs them to make sure the pcap didn't change.

for pcap in `ls *.pcap`
do
	echo $pcap
	if ../main.py $pcap $pcap.new.har
	then
		if [ -a $pcap.har ]
		then
			if  diff -a -b -q  $pcap.har $pcap.new.har > /dev/null
			then
				# if diff was clean, delete file and move on
				rm $pcap.new.har
				continue
			else
				echo "$pcap produced different har, log in $pcap.log"
			fi
		else
			echo "no har file to compare with for $pcap"
			continue
		fi
	else
		echo "$pcap failed."
	fi
	echo "see log in $pcap.log"
	cp pcap2har.log $pcap.log
done

