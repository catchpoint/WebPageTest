# Remove jQuery and jQuery UI dependencies
📆 **Updated**: July 7, 2022

🙋🏽‍♀️ **Status** Proposed

## ℹ️ Context
- The current use of jQuery 1.7.1 is a low vulnerability (XSS)
- There is not much use of jQuery and jQuery UI, mainly dialogs and tabs
- It's currently responsible for the 80%+ (LOC) in `site.js`


## 🤔 Decision
Remove jQuery and jQuery UI dependencies. Dialogs and tabs can be implemented in CSS with a sprinkle JavaScript.

## 🎬 Consequences
- Remove XSS vulnerability
- Lighter page

## 📝 Changelog
- 07/7/2022 Proposed