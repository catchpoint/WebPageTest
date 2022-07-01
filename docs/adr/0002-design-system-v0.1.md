# Design System v.1.0
📆 **Updated**: June 23, 2022

🙋🏽‍♀️ **Status** Accepted

## ℹ️ Context
This is the first step in an iterative refactor approach to a Design System: CSS standardization and consistency.
Across the application we want:
- a consistent color story
- consistent typography
- consistent button and form styles
- consistent page container layouts

Currently there are many one off hex colors to represent brand colors and various gray shadows and line breaks. The typography varies by page both with which node type is used as the page header and sub heads and the font-size, font-weight, and font-family of each node. Buttons vary from pill shaped, rounded boxes and default browser style. Page layouts vary on how they line up with the header.


## 🤔 Decision
Create individual .css files for: typograpy, buttons, and layouts. Create a css variable file for brand colors. [see: CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
Classes in the typography, buttons and layouts files should be preferred over nodes, so that they can be applied to any node type.

Use the existing design to create the normalized files. This requires decisions to be made around which of our many grays to use, or which button design to use. For now, trust your heart and ask for a design review on PRs where needed.

Since this is an iterative approach, when we modify a page while bug fixing or creating new features, scan the html and css files to normalize using the classes and variables defined in those files.

When we are in a place where we can get implement a more robust design system, this breakdown should make it easier to create new design system rules.

## 🎬 Consequences
- More css files to cache bust
- Some upfront "extra" effort required to make css reusable across pages, which will decrease over time.
- Loading more css files, potentially increasing time before a paint can happen

## 📝 Changelog
- 06/23/2022 Proposed
- 06/23/2022 Accepted