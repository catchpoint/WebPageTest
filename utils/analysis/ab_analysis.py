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
import csv
import getopt
import math
import numpy
import sys
from scipy import stats

# The standard WPT metrics we are interested in. Note that we provide some
# additional custom metrics, such as 'ParseTime'.
_METRICS = [
  'SpeedIndex',
  'render'       # time to first paint
]

# Default metric to perform analysis on, if no metric is specified on the
# command line.
_DEFAULT_METRIC = 'SpeedIndex'

# Minimum number of samples we require in order to perform analysis.
_MIN_SAMPLES = 4

# Populate CSV data as a list of dictionaries
def populateCsvData(filename):
  data = list()
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
    group = grouped[url]
    for metric in _METRICS:
      val = row[metric]
      if not val:
        continue
      val = int(val)
      if val <= 0:
        continue
      group[metric].append(val)

    # Generate a custom 'ParseTime' metric which looks at the delta between
    # domInteractive and domLoading.
    parse_start = row['chromeUserTiming.domLoading']
    parse_end = row['chromeUserTiming.domInteractive']
    if not parse_start or not parse_end:
      continue
    parse_start = int(parse_start)
    parse_end = int(parse_end)
    if parse_start <= 0 or parse_end <= 0:
      continue
    parse_time = parse_end - parse_start
    group['ParseTime'].append(parse_time)

    # Generate a custom 'SpeedIndexAfterFirstByte' metric which calculates
    # Speed Index with the TTFB removed, as many experiments can do nothing
    # about time, so it is effectively noise in trials.
    speed_index = row['SpeedIndex']
    ttfb = row['TTFB']
    if not speed_index or not ttfb:
      continue
    speed_index = int(speed_index)
    ttfb = int(ttfb)
    if speed_index <= 0 or ttfb <= 0:
      continue
    group['SpeedIndexAfterFirstByte'].append(speed_index - ttfb)
  return grouped

def mergeControlAndExperiment(control_data, experiment_data):
  merged = defaultdict(dict)
  for k, v in control_data.iteritems():
    merged[k]['control'] = v
  for k, v in experiment_data.iteritems():
    merged[k]['experiment'] = v
  return merged

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
  return (mean, mean - ci[0])

def writeOutput(csv_writer, merged_data, metric, only_significant=False):
  for url, url_data in merged_data.iteritems():
    if 'control' not in url_data or 'experiment' not in url_data:
      continue
    control_data = url_data['control']
    experiment_data = url_data['experiment']
    orig_control_samples = control_data[metric]
    orig_experiment_samples = experiment_data[metric]
    if (not orig_control_samples or not orig_experiment_samples or
        len(orig_control_samples) < _MIN_SAMPLES or
        len(orig_experiment_samples) < _MIN_SAMPLES):
      continue
    control_samples, experiment_samples = discardOutliers(
        orig_control_samples, orig_experiment_samples)
    control_mean, control_ci = computeMeanAndConfidenceInterval(control_samples)
    exp_mean, exp_ci = computeMeanAndConfidenceInterval(experiment_samples)

    # The delta in means, less the combined confidence intervals. This tends to
    # be a better metric to understand impact as it discounts the impact of
    # large confidence intervals on the mean.
    mean_delta = control_mean - exp_mean
    combined_ci = control_ci + exp_ci

    mean_delta_less_ci = \
        mean_delta - combined_ci if mean_delta > 0 else mean_delta + combined_ci
    percent_improvement = 100.0 * mean_delta_less_ci/max(control_mean, exp_mean)
    is_significant = abs(mean_delta) > combined_ci

    if not is_significant and only_significant:
      continue

    csv_writer.writerow([
        mean_delta,
        mean_delta_less_ci if is_significant else 0,
        percent_improvement if is_significant else 0,
        u'+' if is_significant else u' ',
        unicode((url[:57] + '...') if len(url) > 60 else url),
        control_mean,
        100.0 * control_ci / control_mean,
        exp_mean,
        100.0 * exp_ci / exp_mean,
        control_samples,
        experiment_samples,
        sorted(list(set(orig_control_samples) - set(control_samples))),
        sorted(list(set(orig_experiment_samples) - set(experiment_samples)))])


def main(argv):
  try:
    opts, args = getopt.getopt(argv[1:], "c:e:m:s")
  except getopt.GetoptError as err:
    print str(err)
    sys.exit(1)

  metric = _DEFAULT_METRIC
  control_filename = None
  experiment_filename = None
  only_significant = False
  for k, v in opts:
    if k == '-c':
      control_filename = v
    elif k == '-e':
      experiment_filename = v
    elif k == '-m':
      metric = v
    elif k == '-s':
      only_significant = True
    else:
      print 'Unexpected arg %s' % k
      sys.exit(1)

  if not control_filename or not experiment_filename:
    print 'Must specify -c and -e.'
    sys.exit(1)

  control_data = groupByUrl(populateCsvData(control_filename))
  experiment_data = groupByUrl(populateCsvData(experiment_filename))
  merged_data = mergeControlAndExperiment(control_data, experiment_data)

  csv_writer = csv.writer(sys.stdout, delimiter='\t')
  writeOutput(csv_writer, merged_data, metric, only_significant)


if __name__ == "__main__":
  main(sys.argv)
