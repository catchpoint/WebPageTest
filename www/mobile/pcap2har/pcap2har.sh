#!/bin/bash
#
# Copyright 2010 Google Inc. All Rights Reserved.
# Author: lsong@google.com (Libo Song)

FILES=""
ARGUMENTS=""
FORCE="false"
THIS=$0
#PROGRAM='python -B main.py'
PROGRAM='python2.5 main.py'

function usage {
  echo "Usage: $THIS [options] files ..."
  echo " -h print this usage"
  exit 1
}

for thing in "$@"; do
  case $thing in
    --force)
      FORCE="true"
      ;;
    -*)
      ARGUMENTS=$ARGUMENTS" "$thing
      ;;
    *)
      FILES=$FILES" "$thing
      ;;
  esac
done

if [ x"$FILES" == x ]; then
  usage
fi

diff_fail=0
pass_gold=0
pass_no_gold=0
for file in $FILES; do
  if [ $FORCE == "true" -o ! -e $file.har ] ; then
    echo "processing $file ..."
    PYTHONPATH=..:../dpkt:../simplejson $PROGRAM $ARGUMENTS $file $file.har
    ret=$?
    if [ $ret -ne 0 ]; then
      echo "Fatal error: $ret."
      break
    fi
    if [ -e pcap2har.log ]; then
      cat pcap2har.log
      rm pcap2har.log
    fi
    if [ -e $file.har.gold ] ; then
      diff $file.har $file.har.gold
      ret=$?
      if [ $ret -eq 0 ]; then
        echo "diff  $file.har $file.har.gold"
        echo "PASS"
        let pass_gold++
      else
        echo "diff  $file.har $file.har.gold failed."
        let diff_fail++
      fi
    else
      echo "pass (no gold)"
      let pass_no_gold++
    fi
  else
    echo "Exist $file.har"
  fi
done

echo "PASS GOLD: $pass_gold"
echo "PASS NO GOLD: $pass_no_gold"
echo "FAIL: $diff_fail"

