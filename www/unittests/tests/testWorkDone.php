<?php

include_once '../work/workdone.php';

// Some date functions will complain loudly if a timezone is not set.
date_default_timezone_set('UTC');

// ISO8601 dates are documented in the following spec:
//   http://www.w3.org/TR/NOTE-datetime
//
//   The following formats are supported:
//
//   Year:
//       YYYY (eg 1997)
//
//   Year and month:
//       YYYY-MM (eg 1997-07)
//
//   Complete date:
//       YYYY-MM-DD (eg 1997-07-16)
//
//   Complete date plus hours and minutes:
//       YYYY-MM-DDThh:mmTZD (eg 1997-07-16T19:20+01:00)
//
//   Complete date plus hours, minutes and seconds:
//       YYYY-MM-DDThh:mm:ssTZD (eg 1997-07-16T19:20:30+01:00)
//
//   Complete date plus hours, minutes, seconds and a decimal fraction
//   of a second
//       YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45+01:00)

class WorkDoneDateTests extends \Enhance\TestFixture
{
  public function TestInvalidISO8601Dates() {
    // "not a date" should fail to parse as a date.
    \Enhance\Assert::isNull(
        GetDeltaMillisecondsFromISO6801Dates("not a date", "1997-01-02"));
    \Enhance\Assert::isNull(
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02", "not a date"));

    // Try a valid difference, to see that "not a date" is the reason we failed
    // above.
    \Enhance\Assert::isNotNull(
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02", "1997-01-02"));
  }

  public function TestValidISO8601DatesWithoutSetDay() {
    // Compare dates like YYYY and YYYY-MM, which do not have a set day.

    // Compare the new year with itself.
    \Enhance\Assert::areIdentical(
        0.0,
        GetDeltaMillisecondsFromISO6801Dates("1997", "1997-01"));
    \Enhance\Assert::areIdentical(
        0.0,
        GetDeltaMillisecondsFromISO6801Dates("1997", "1997-01-01"));

    // Compare the new year with the day that starts a month later.
    \Enhance\Assert::areIdentical(
        (double)(31 * 24 * 60 * 60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997", "1997-02-01"));

    // Compare the new year with a day later.
    \Enhance\Assert::areIdentical(
        (double)(24 * 60 * 60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997", "1997-01-02"));

    // Compare the new year with a year, a month, and a day later.
    \Enhance\Assert::areIdentical(
        (double)((365 * 24 * 60 * 60 * 1000)  // 1997 has 365 days
               + ( 31 * 24 * 60 * 60 * 1000)  // January has 31 days
               + (  1 * 24 * 60 * 60 * 1000)),
        GetDeltaMillisecondsFromISO6801Dates("1997", "1998-02-02"));
  }

  public function TestValidISO8601DatesToSecResolution() {
    // Compare valid dates with a set day.

    // Compare a day with itself.
    \Enhance\Assert::areIdentical(
        0.0,
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02", "1997-01-02"));

    // Compare a day with the same day next month.
    \Enhance\Assert::areIdentical(
        (double)(31 * 24 * 60 * 60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02", "1997-02-02"));

    // Compare a day with the next day.
    \Enhance\Assert::areIdentical(
        (double)(24 * 60 * 60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02", "1997-01-03"));
    \Enhance\Assert::areIdentical(
        -(double)(24 * 60 * 60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-01-03", "1997-01-02"));

    // Compare a day with a specific time on the same day.
    \Enhance\Assert::areIdentical(
        (double)(((1 * 60) + 2) *60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-07-16",
                                             "1997-07-16T01:02+00:00"));
    \Enhance\Assert::areIdentical(
        -(double)(((1 * 60) + 2) *60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-07-16T01:02+00:00",
                                             "1997-07-16"));

    // Change the timezone.
    \Enhance\Assert::areIdentical(
        (double)(((1 * 60) + 23) *60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-07-16T01:02+01:23",
                                             "1997-07-16T01:02+00:00"));
    \Enhance\Assert::areIdentical(
        -(double)(((1 * 60) + 23) *60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-07-16T01:02-01:23",
                                             "1997-07-16T01:02+00:00"));
    // Timezone 'Z' means UTC.
    \Enhance\Assert::areIdentical(
        -(double)(((1 * 60) + 23) *60 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-07-16T01:02-01:23",
                                             "1997-07-16T01:02Z"));

    // Timezone 'Z' means UTC.
    \Enhance\Assert::areIdentical(
        0.0,
        GetDeltaMillisecondsFromISO6801Dates("1997-07-16T01:02-0:00",
                                             "1997-07-16T01:02Z"));

    // Five seconds later
    \Enhance\Assert::areIdentical(
        (double)(5 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02T19:20+01:00",
                                             "1997-01-02T19:20:05+01:00"));
    \Enhance\Assert::areIdentical(
        (double)(5 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02T19:20:00+01:00",
                                             "1997-01-02T19:20:05+01:00"));
    \Enhance\Assert::areIdentical(
        (double)(5 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02T19:20:00.00+01:00",
                                             "1997-01-02T19:20:05+01:00"));
  }

  public function TestValidISO8601DatesToMsResolution() {
    // UTC, with and without fractional parts.
    \Enhance\Assert::areIdentical(
        7.0,
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02T19:20:03Z",
                                             "1997-01-02T19:20:03.007Z"));

    // UTC, both with fractional parts.
    \Enhance\Assert::areIdentical(
        9.0,
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02T19:20:03.000Z",
                                             "1997-01-02T19:20:03.009Z"));
    \Enhance\Assert::areIdentical(
        9.95,
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02T19:20:03.000Z",
                                             "1997-01-02T19:20:03.00995Z"));

    // Both minutes and milliseconds are different.
    \Enhance\Assert::areIdentical(
        (1 * 60 * 1000.0) + 7.0,
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02T19:19:03.006Z",
                                             "1997-01-02T19:20:03.013Z"));

    // Non-UTC timezone.
    \Enhance\Assert::areIdentical(
        -13.0,
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02T19:20:03.013+01:34",
                                             "1997-01-02T19:20:03.000+01:34"));

    // UTC and zero UTC offset.
    \Enhance\Assert::areIdentical(
        17.0,
        GetDeltaMillisecondsFromISO6801Dates("1997-01-02T19:20:03.002-00:00",
                                             "1997-01-02T19:20:03.019Z"));
  }

  public function TestDatesWithSecondOverflow() {
    // Test the real input that exposed the problem when comparing
    // the start time of HAR entries.
    \Enhance\Assert::areIdentical(
        (double)((4 * 60 *1000)  // The correct answer is four minutes
               - (1 * 1000)      // less one second
               - (749 - 194)),   // less the difference in milliseconds
        GetDeltaMillisecondsFromISO6801Dates("2012-01-19T13:33:07.749-05:00",
                                             "2012-01-19T13:37:06.194-05:00"));
  }

  public function TestDatesFromPcap2Har() {
    // Test dates generated by pcap2har.py .
    \Enhance\Assert::areIdentical(
        (double)(1 * 1000),
        GetDeltaMillisecondsFromISO6801Dates("2012-02-27T14:19:01.802190Z",
                                             "2012-02-27T14:19:02.802190Z"));
  }

  public function TestSplitISO6801DateIntoDateAndTimeMalformed() {
    // Invalid date can not be split.
    $outputDate = "UNSET!!!";
    $outputTime = "UNSET!!!";
    \Enhance\Assert::isFalse(SplitISO6801DateIntoDateAndTime(
        "Not a date", $outputDate, $outputTime));
    \Enhance\Assert::areIdentical("UNSET!!!", $outputDate);
    \Enhance\Assert::areIdentical("UNSET!!!", $outputTime);
  }

  public function TestSplitISO6801DateIntoDateAndTimeJustDate() {
    // Date with no time can be split.
    $outputDate = "UNSET!!!";
    $outputTime = "UNSET!!!";
    \Enhance\Assert::isTrue(SplitISO6801DateIntoDateAndTime(
        "2012-02-27", $outputDate, $outputTime));
    \Enhance\Assert::areIdentical("2012-02-27", $outputDate);
    \Enhance\Assert::areIdentical("", $outputTime);
  }

  public function TestSplitISO6801DateIntoDateAndTimeComplete() {
    // Date with time can be split.
    $outputDate = "UNSET!!!";
    $outputTime = "UNSET!!!";
    \Enhance\Assert::isTrue(SplitISO6801DateIntoDateAndTime(
         "2012-02-27T14:19:01.802190Z", $outputDate, $outputTime));
    \Enhance\Assert::areIdentical("2012-02-27", $outputDate);
    \Enhance\Assert::areIdentical("14:19:01.802190Z", $outputTime);
  }
}

?>
