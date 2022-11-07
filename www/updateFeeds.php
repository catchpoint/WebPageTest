<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

/**
* Update the feeds
*
*/
function UpdateFeeds()
{
    $feed_file = SETTINGS_PATH . '/feeds.inc';
    if (file_exists(SETTINGS_PATH . '/common/feeds.inc')) {
        $feed_file = SETTINGS_PATH . '/common/feeds.inc';
    }
    if (file_exists(SETTINGS_PATH . '/server/feeds.inc')) {
        $feed_file = SETTINGS_PATH . '/server/feeds.inc';
    }
    if (file_exists($feed_file)) {
        if (!is_dir('./tmp')) {
            mkdir('./tmp', 0777);
        }

        $feedData = array();
        $lock = Lock("Update Feeds", false);
        if (isset($lock)) {
          // load the list of feeds
            require_once($feed_file);
            require_once('./lib/simplepie.inc');

          // loop through and update each one
            foreach ($feeds as $category => &$feedList) {
                $feedData[$category] = array();

                foreach ($feedList as $feedSource => $feedUrl) {
                    $feedUrl = trim($feedUrl);
                    echo "Updating feed $feedSource: $feedUrl\n";
                    if (strlen($feedUrl)) {
                        $feed = new SimplePie();
                        if ($feed) {
                            $rawFeed = trim(http_fetch($feedUrl));
                            echo "  Fetched " . strlen($rawFeed) . " bytes\n";
                            $feed->set_raw_data($rawFeed);
                            $feed->enable_cache(false);
                            $ok = $feed->init();
                            if ($ok == false) {
                                echo "  Feed init failed\n";
                            } else {
                                echo "  Item count: " . $feed->get_item_quantity() . "\n";
                            }

                        // try sanitizing the data if we have a problem parsing the feed
                            if (strlen($feed->error())) {
                                echo "  Error: " . $feed->error() . "\n";
                                FixFeed($rawFeed);
                                $feed->set_raw_data($rawFeed);
                                $feed->enable_cache(false);
                                $feed->init();
                            }

                            $feed_image = $feed->get_image_url();

                            foreach ($feed->get_items() as $item) {
                                $dateStr = $item->get_date(DATE_RSS);
                                echo "  Checking [$dateStr]: " . $item->get_title() . "\n";
                                if ($dateStr && strlen($dateStr)) {
                                        $date = strtotime($dateStr);
                                    if ($date) {
                        // only include articles from the last 30 days
                                        $now = time();
                                        $elapsed = 0;
                                        if ($now > $date) {
                                            $elapsed = $now - $date;
                                        }
                                        $days = (int)($elapsed / 86400);
                                        if ($days <= 30) {
                                            // make sure we don't have another article from the exact same time
                                            while (isset($feedData[$category][$date])) {
                                                $date++;
                                            }

                                            echo "  Found: " . $item->get_title() . "\n";
                                            $url = urldecode($item->get_permalink());
                                            if (substr($url, 0, 4) != 'http') {
                                                $parts = parse_url($feedUrl);
                                                $url = "{$parts['scheme']}://{$parts['host']}$url";
                                            }
                                            $entry = array (
                                            'source' => $feedSource,
                                            'title' => $item->get_title(),
                                            'desc' => $item->get_description(true),
                                            'link' => $url,
                                            'date' => $dateStr
                                            );
                                            $thumbnail = null;
                                    // See if there is an explicit image
                                            if ($enclosure = $item->get_enclosure()) {
                                                $thumbnail = $enclosure->get_thumbnail();
                                            }
                                    // Try grabbing the first image from the content
                                            if (!$thumbnail) {
                                                $content = $item->get_content();
                                                if ($content) {
                                                    $doc = new DOMDocument();
                                                    if ($doc->loadHTML($content)) {
                                                            $doc->preserveWhiteSpace = false;
                                                            $images = $doc->getElementsByTagName('img');
                                                        foreach ($images as $image) {
                                                            $thumbnail = $image->getAttribute('src');
                                                            if ($thumbnail) {
                                                                break;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                    // Fall back to the icon for the feed if there is one
                                            if (!$thumbnail && $feed_image) {
                                                $thumbnail = $feed_image;
                                            }
                                            if ($thumbnail) {
                                                $entry['thumbnail'] = $thumbnail;
                                            }
                                            $feedData[$category][$date] = $entry;
                                        }
                                    }
                                }

                                $item->__destruct();
                            }

                            $feed->__destruct();
                            unset($feed);
                        }
                    }
                }

                if (count($feedData[$category])) {
                    krsort($feedData[$category]);
                }
            }

          // save out the feed data
            file_put_contents('./tmp/feeds.dat', json_encode($feedData));
            Unlock($lock);
        }
    }
}

/**
* MyBB has a busted feed creator so go through and remove any invalid characters
*
* @param mixed $rawFeed
*/
function FixFeed(&$rawFeed)
{
    $rawFeed = preg_replace('/[^(\x20-\x7F)]*/', '', $rawFeed);
}
