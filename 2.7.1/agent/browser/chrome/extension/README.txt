Chrome WPT driver extension
---------------------------
This extension provides basic page-level benchmarking into the browser.

Here is the flow of how this extension is used:
1. WPtDriver starts chrome process
2. it has the extension ON by default
3. extension sends request to http://127.0.0.1/get_test?callback=MyCallback
4. If there is a test to run, wptdriver responds with the JSON test data
5. extension runs the test
6. extension posts the result to http://127.0.0.1/test_result
7. WPt-driver kills chrome

