# Time to Interactive (TTI)
TTI is (currently) a Chrome-specific measurement that measures the time until the page being loaded is considered usable and will respond to user input.

## Underlying Measurements
TTI is built on top of a collection of other measurements, some of which are currently only available in Chrome:

### Time to First Meaningful Paint
The measurement is of the first paint after the layout where there was the most change in layout in the visible part of the page.  It is meant to measure the point at which the main content of the page is displayed and is a placeholder until a better method for sites to indicate their main content is available.

Chrome exposes this measurement as a "blink.user_timing" trace event with a name of "firstMeaningfulPaint".  

### Interactive Window
The browser's main thread is considered "interactive" when it is not blocked for more than **50ms** by any single task so it will be able to respond to user input within 50ms.  An interactive window is a period of **at least 5 seconds** where there are no main-thread tasks that take more than 50ms.

### In-flight document requests
At any point in time this is the number of outstanding requests for HTML, Script, Styles or Fonts.

## TTI Calculation
1. Start looking for TTI at the *first meaningful paint*
2. Look for the first point in time where there are less than 2 *in-flight document requests* that occurs inside of an *interactive window*
3. TTI is the start of the *interactive window* from step 2 or the *first meaningful paint*, whichever is later