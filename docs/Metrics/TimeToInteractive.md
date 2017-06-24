# Time to Interactive (TTI)
TTI is (currently) a Chrome-specific measurement that measures the time until the page being loaded is considered usable and will respond to user input.  There are two variations on the metric:

1. Time to Consistently Interactive: This was previously the only TTI measurement and measured the point where the page is likely complete and will consistently respond quickly.
1. Time to First Interactive: This is a newer metric and reports when the page is first expected to be usable and will respond to input quickly (with the possibility of slow responses as more content loads).

## Underlying Measurements
TTI is built on top of a collection of other measurements, some of which are currently only available in Chrome:

### Time to First Contentfil Paint
The measurement is of the first paint of text or an image.

Chrome exposes this measurement as a "blink.user_timing" trace event with a name of "firstContentfulPaint".  

### Interactive Window
The browser's main thread is considered "interactive" when it is not blocked for more than **50ms** by any single task so it will be able to respond to user input within 50ms.  An interactive window is a period of **at least 5 seconds** where there are no main-thread tasks that take more than 50ms.

### In-flight requests
At any point in time this is the number of outstanding requests.

## Time to Consistently Interactive Calculation
1. Start looking for TTI at the *first contentful paint*
2. Look for the first *interactive window* where there is a contiguous period of 5 seconds fully contained within the interactive window with no more than 2 *in-flight requests*
3. TTI is the start of the *interactive window* from step 2 or the *first contentful paint*, whichever is later

## Time to First Interactive Calculation
1. Start looking for TTI at the *first contentful paint*
2. Look for the first *interactive window* where there is a contiguous period of 5 seconds fully contained within the interactive window regardless of the number of *in-flight requests*
3. TTI is the start of the *interactive window* from step 2 or the *first contentful paint*, whichever is later
