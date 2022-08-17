# Remove jQuery and jQuery UI dependencies

📆 **Updated**: Aug 17, 2022

🙋🏽‍♀️ **Status** Proposed

## ℹ️ Context

- The current use of jQuery 1.7.1 is a low vulnerability (XSS)
- The version is old and new changes are a bit of a pain (e.g. need to read old API docs)
- The version can be upgraded but that takes effort (same as above, APIs have changed)
- It's currently responsible for 80%+ (LOC) in `site.js`
- We don't support legacy browsers, such as IE, anymore

## 🤔 Decision

Remove jQuery and jQuery UI dependencies. We will be using vanilla JavaScript, rather than immediately switching to another framework, to keep the performance overhead to a minimum.

## 🎬 Consequences

- Remove XSS vulnerability
- Lighter pages
- We can take advantage of everything the web platform had to offer without a layer of a polyfill-style library

## Process

We need to move each jQuery/jQueryUI piece one at a time and once we're done, delete the jQ\* code. A list of features we currently use (possibly incomplete):

- dialogs
- tabs
- dragging and resizing
- viewport offsets
- sizing elements
- getting OS scrollbar width
- displaying local time
- tooltips
- scroll handling and animation
- editting test labels via async requests (`$.ajax`)
- sortable tables (Request Details) which is implementation #3 in addition to a new DIY one and one from Google JS APIs

As prep work, move all jQ* dependencies out of `site.js` so it's easier to tell application callsites vs internal dependencies. Some of the jQ* code is not minified so it's not immediately obvious if this is application code.

## 📝 Changelog

- 07/07/2022 Proposed
- 08/17/2022 Comments addressed
