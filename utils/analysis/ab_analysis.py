#!/usr/bin/env python
# Copyright 2016 Google Inc. All Rights Reserved.

"""
Does A/B analysis of two result sets (control and experiment).
For each URL the script outputs the change in metrics such as SpeedIndex,
first paint, or parser time, and whether the change is statistically
significant.

The inputs are the Page Data files (at the bottom of bulk test result)

Command line arguments:
-c <control page data file>
-e <experiment page data file>
-m <WPT Metrics interested in comparing>

If -m is not present, then SpeedIndex is the default metric.

"""
from collections import defaultdict
from collections import namedtuple
import csv
import getopt
import glob
import math
import numpy
import os
import sys
from scipy import stats

# Set of metrics we are interested in, along with a function to extract that
# metric from a WPT result row.
# TODO(csharrison): Add ParseTime when we have valid start/end parse times.
_METRICS = {
    'SpeedIndex': lambda x: sanitizeInt(x['SpeedIndex']),
    'TTFP': lambda x: sanitizeInt(x['render']),
    'ParseTime': lambda x:
        sanitizeIntDiff(x['domInteractive'], x['domLoading']),
    'SpeedIndexAfterFirstByte':
        lambda x: sanitizeIntDiff(x['SpeedIndex'], x['TTFB'])
}

# Default metric to perform analysis on, if no metric is specified on the
# command line.
_DEFAULT_METRIC = 'SpeedIndex'

# Minimum number of samples we require in order to perform analysis.
_MIN_SAMPLES = 4

# CoreStatData contains the core stat data for a given metric.
CoreStatData = namedtuple(
    'CoreStatData', [
        # Control and experiment WPT result ids.
        'control_wpt_result_ids', 'experiment_wpt_result_ids',

        # Control and experiment samples used to compute stats.
        'control_samples', 'experiment_samples',

        # Control and experiment samples excluded from stat computation due to
        # being outliers.
        'control_outliers', 'experiment_outliers'])

# DerivedStatData contains stat data that can be derived from a CoreStatData.
DerivedStatData = namedtuple(
    'DerivedStatData', [
        # Control and experiment mean and half confidence intervals.
        'control_mean', 'control_ci', 'experiment_mean', 'experiment_ci',

        # Delta between control and experiment means. Positive if
        # control_mean>experiment_mean. Negative if
        # control_mean<experiment_mean.
        'mean_delta',

        # Sum of half confidence intervals for control and experiment.
        'combined_ci',

        # Ratio between mean_delta and combined_ci values. >=1 indicates that
        # the result is statistically significant.
        'mean_delta_ci_ratio',

        # Whether the result is statistically significant. Technically redundant
        # since mean_delta_ci_ratio can be used to determine if the result is
        # significant, but provided for convenience.
        'is_significant',

        # mean_delta-combined_ci if mean_delta>0 else mean_delta+combined_ci, or
        # None if not is_significant. This tends to be a better statistic than
        # mean_delta to understand the real impact of a change, as it discounts
        # the effect of large confidence intervals on the delta between means.
        'mean_delta_less_ci',

        # Percentage change in means, excluding the half confidence interval, or
        # None if not is_significant.
        'percent_change_less_ci'])

# Returns a positive int for the given value, or None if the value cannot be
# converted to a positive int value.
def sanitizeInt(val):
  if not val:
    return None
  val = int(val)
  return val if val > 0 else None

# Returns a positive int difference for the given values, or None if the a
# positive diff can't be computed for the given values.
def sanitizeIntDiff(a, b):
  a = sanitizeInt(a)
  b = sanitizeInt(b)
  if not a or not b:
    return None
  return a - b if a >= b else None;

# Given a CoreStatData, returns a DerivedStatData.
def computeDerivedStatData(data):
  control_mean, control_ci = computeMeanAndConfidenceInterval(
      data.control_samples)
  experiment_mean, experiment_ci = computeMeanAndConfidenceInterval(
      data.experiment_samples)
  mean_delta = control_mean - experiment_mean
  combined_ci = control_ci + experiment_ci
  mean_delta_less_ci = mean_delta - combined_ci if mean_delta > 0 \
      else mean_delta + combined_ci
  percent_change_less_ci = 100.0 * mean_delta_less_ci / max(
      control_mean, experiment_mean)
  mean_delta_ci_ratio = float(abs(mean_delta)) / float(combined_ci)
  is_significant = mean_delta_ci_ratio >= 1.0
  return DerivedStatData(
      control_mean=control_mean,
      control_ci=control_ci,
      experiment_mean=experiment_mean,
      experiment_ci=experiment_ci,
      mean_delta=mean_delta,
      combined_ci=combined_ci,
      mean_delta_ci_ratio=mean_delta_ci_ratio,
      is_significant=is_significant,
      mean_delta_less_ci=mean_delta_less_ci if is_significant else None,
      percent_change_less_ci=percent_change_less_ci if is_significant else None)

# Populate CSV data as a list of dictionaries. fileglobs is a comma-separated
# list of filenames or filename globs.
def populateCsvData(fileglobs):
  data = list()
  for fileglob in fileglobs.split(','):
    # If a path includes a ~, expand it to the user's home directory. Also
    # expand environment variables.
    fileglob = os.path.expandvars(os.path.expanduser(fileglob))
    for filename in glob.iglob(fileglob):
      with open(filename,'rb') as f:
        dict_reader = csv.DictReader(f)
        for row in dict_reader:
          data.append(row)
  return data

# Groups all runs for same URL together
def groupByUrl(data):
  grouped = defaultdict(lambda: defaultdict(list))
  for row in data:
    url = row['URL']
    if not url:
      continue
    result_code = row['result']
    if not result_code:
      continue
    result_code = int(result_code)
    # pmeenan says that only results with codes of 0 or 99999 are valid.
    if result_code not in (0, 99999):
      continue
    id = row['id']
    if not id:
      continue
    group = grouped[url]
    unique_ids = group['id']
    if id not in unique_ids:
      unique_ids.append(id)
    for metric, fn in _METRICS.iteritems():
      val = fn(row)
      if val:
        group[metric].append(val)
  return grouped

def discardOutliers(control_samples, experiment_samples):
  def computeScore(candidate_samples, full_samples):
    # Simple scoring function. Candidates with lower confidence intervals
    # get higher scores. We also discount the score based on the ratio of sizes
    # between the candidate and the full set of samples, to prefer larger sample
    # sets in cases where confidence intervals between two candidates are
    # similar.
    candidate_mean, candidate_ci = computeMeanAndConfidenceInterval(candidate_samples)
    partial_samples_ratio = float(len(candidate_samples)) / float(len(full_samples))
    if candidate_ci == 0:
      return sys.float_info.max
    return partial_samples_ratio / float(candidate_ci)
  control_samples.sort()
  experiment_samples.sort()
  best_control_score = 0
  best_exp_score = 0
  best_control = None
  best_exp = None
  for control_candidate, exp_candidate in (
      (control_samples, experiment_samples),
      (control_samples[1:], experiment_samples[1:]),
      (control_samples[:-1], experiment_samples[:-1]),
      (control_samples[1:-1], experiment_samples[1:-1])):
    control_candidate_score = computeScore(control_candidate, control_samples)
    exp_candidate_score = computeScore(exp_candidate, experiment_samples)
    if (control_candidate_score > best_control_score and
        exp_candidate_score > best_exp_score):
      best_control_score = control_candidate_score
      best_control = control_candidate
      best_exp_score = exp_candidate_score
      best_exp = exp_candidate
  return (best_control, best_exp)

def computeMeanAndConfidenceInterval(samples):
  """Returns a list containing the mean and the half confidence interval."""
  mean = numpy.mean(samples)
  ci = stats.norm.interval(0.95,
                           loc=mean,
                           scale=numpy.std(samples)/math.sqrt(len(samples)))
  # stats.norm.interval returns the upper and lower bounds of the confidence
  # interval. For our purposes, it's more useful to work with the half ci, so we
  # convert here.
  half_ci = mean - ci[0]
  return (mean, half_ci)

def generateResults(control, experiment):
  results = {}
  for url, control_data in control.iteritems():
    if url not in experiment:
      continue
    experiment_data = experiment[url]
    result = {}
    for metric in _METRICS.iterkeys():
      if metric not in control_data or metric not in experiment_data:
        continue
      orig_control_samples = control_data[metric]
      orig_experiment_samples = experiment_data[metric]
      if (len(orig_control_samples) < _MIN_SAMPLES or
          len(orig_experiment_samples) < _MIN_SAMPLES):
        continue
      control_samples, experiment_samples = discardOutliers(
          orig_control_samples, orig_experiment_samples)

      result[metric] = CoreStatData(
          control_wpt_result_ids=control_data['id'],
          experiment_wpt_result_ids=experiment_data['id'],
          control_samples=control_samples,
          experiment_samples=experiment_samples,
          control_outliers=sorted(
              list(set(orig_control_samples) - set(control_samples))),
          experiment_outliers=sorted(
              list(set(orig_experiment_samples) - set(experiment_samples))))
    if result:
      results[url] = result
  return results

def writeCsvOutput(csv_writer, results, metric, only_significant=False):
  csv_writer.writerow([
      "url",
      "mean delta",
      "mean delta less CI",
      "percent change less CI",
      "significance",
      "control mean",
      "control CI",
      "experiment mean",
      "experiment CI",
      "control samples",
      "experiment samples",
      "control outliers",
      "experiment outliers",
      "control urls",
      "experiment urls"
  ])
  for url, result in results.iteritems():
    if metric not in result:
      continue
    stat = result[metric]
    derived_stat = computeDerivedStatData(stat)

    if not derived_stat.is_significant and only_significant:
      continue

    experiment_urls = ["http://www.webpagetest.org/result/%s/" % id for id in stat.experiment_wpt_result_ids]
    control_urls = ["http://www.webpagetest.org/result/%s/" % id for id in stat.control_wpt_result_ids]

    csv_writer.writerow([
        url,
        derived_stat.mean_delta,
        derived_stat.mean_delta_less_ci or '',
        derived_stat.percent_change_less_ci or '',
        '+' if derived_stat.is_significant else '',
        derived_stat.control_mean,
        derived_stat.control_ci,
        derived_stat.experiment_mean,
        derived_stat.experiment_ci,
        stat.control_samples,
        stat.experiment_samples,
        stat.control_outliers,
        stat.experiment_outliers,
        control_urls,
        experiment_urls])


def writeTextOutput(outstream, results, metric, only_significant):
  # Columns in the output format string:
  # mean_delta, mean_delta_less_ci, percent_change_less_ci, url
  # control_mean, control_ci_percent_mean,
  # experiment_mean, experiment_ci_percent_mean
  # control_samples, experiment_samples, control_outliers, experiment_outliers
  _FORMAT_STR = (
      '{: >6.0f}ms {} {}  {: <60} '
      u'{: >6.0f}ms \u00b1{:2.0f}% '
      u'{: >6.0f}ms \u00b1{:2.0f}%   '
      '{} {} {} {}')
  for url, result in results.iteritems():
    if metric not in result:
      continue
    stat = result[metric]
    derived_stat = computeDerivedStatData(stat)

    if not derived_stat.is_significant and only_significant:
      continue

    print >> outstream, _FORMAT_STR.format(
        derived_stat.mean_delta,
        ('{:.0f}ms'.format(derived_stat.mean_delta_less_ci)
         if derived_stat.mean_delta_less_ci else '').rjust(7),
        ('{:.1f}%'.format(derived_stat.percent_change_less_ci)
         if derived_stat.percent_change_less_ci else '').rjust(6),
        (url[:57] + '...') if len(url) > 60 else url,
        derived_stat.control_mean,
        100.0 * derived_stat.control_ci / derived_stat.control_mean,
        derived_stat.experiment_mean,
        100.0 * derived_stat.experiment_ci / derived_stat.experiment_mean,
        stat.control_samples,
        stat.experiment_samples,
        stat.control_outliers,
        stat.experiment_outliers).encode('utf-8')


def main(argv):
  try:
    opts, args = getopt.getopt(argv[1:], "c:e:m:f:s")
  except getopt.GetoptError as err:
    print str(err)
    sys.exit(1)

  metric = _DEFAULT_METRIC
  output_format = 'text'
  control_filenames = None
  experiment_filenames = None
  only_significant = False
  for k, v in opts:
    if k == '-c':
      control_filenames = v
    elif k == '-e':
      experiment_filenames = v
    elif k == '-m':
      metric = v
    elif k == '-f':
      output_format = v
    elif k == '-s':
      only_significant = True
    else:
      print 'Unexpected arg %s' % k
      sys.exit(1)

  if not control_filenames or not experiment_filenames:
    print 'Must specify -c and -e.'
    sys.exit(1)

  valid_metrics = _METRICS.keys()
  if metric not in valid_metrics:
    print 'Must specify valid metric: {}'.format(valid_metrics)
    sys.exit(1)

  control_data = groupByUrl(populateCsvData(control_filenames))
  experiment_data = groupByUrl(populateCsvData(experiment_filenames))
  results = generateResults(control_data, experiment_data)

  if output_format == 'csv':
    csv_writer = csv.writer(sys.stdout)
    writeCsvOutput(csv_writer, results, metric, only_significant)
  elif output_format == 'text':
    writeTextOutput(sys.stdout, results, metric, only_significant)
  else:
    print 'Unexpected output format: {}'.format(output_format)
    sys.exit(1)


if __name__ == "__main__":
  main(sys.argv)
