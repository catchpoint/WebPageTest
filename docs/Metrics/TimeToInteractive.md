# Time to Interactive (TTI)
TTI measures the time until the page being loaded is considered usable and will respond to user input.  There are two variations on the metric:

1. Time to Consistently Interactive: This was previously the only TTI measurement and measured the point where the page is likely complete and will consistently respond quickly. The canonical definition for it is [here](https://github.com/WICG/time-to-interactive).
1. Time to First CPU Idle (was First Interactive): This is a newer metric and reports when the page is first expected to be usable and will respond to input quickly (with the possibility of slow responses as more content loads).

## Underlying Measurements
TTI is built atop a collection of other measurements:

### Time to First Contentful Paint
The point in time when the first image or text is rendered to the screen (something other than background colors).

Chrome exposes this measurement as a "blink.user_timing" trace event with a name of "firstContentfulPaint".  

### DOM Content Loaded
Browser event that is fired when the HTML parser has reached the end of the document (executed all blocking scripts).  Fully described [here](https://developer.mozilla.org/en-US/docs/Web/Events/DOMContentLoaded).

### Interactive Window
The browser's main thread is considered "interactive" when it is not blocked for more than **50ms** by any single task so it will be able to respond to user input within 50ms.  An interactive window is a period of **at least 5 seconds** where there are no main-thread tasks that take more than 50ms.

### In-flight requests
At any point in time this is the number of outstanding successful GET requests (POSTs and failed requests are ignored).

## Time to Consistently Interactive Calculation
1. Start looking for TTI at *first contentful paint*
2. Look for the first *interactive window* where there is a contiguous period of 5 seconds fully contained within the interactive window with no more than 2 *in-flight requests*
3. TTI is the start of the *interactive window* from step 2, *first contentful paint* or *DOM Content Loaded*, whichever is later

## Time to First CPU Idle (was First Interactive) Calculation
1. Start looking for First Interactive at *first contentful paint*
2. Look for the first *interactive window* (with no regard to *in-flight requests*)
3. First Interactive is the start of the *interactive window* from step 2, *first contentful paint* or *DOM Content Loaded*, whichever is later

## Page is Interactive
Page is Interactive is a graphical display of interactivity throughput the page load cycle.
1. Displays White – up until first contentful paint (or start render, if first contentful paint doesn’t exist)
2. Displays Green – where all tasks on the main thread are <= 50ms
3. Otherwise displays red
